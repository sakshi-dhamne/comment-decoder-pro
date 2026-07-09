import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_LIMIT = 3;
const WINDOW_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { sessionId, videoId, consume } = await req.json();
    if (!sessionId || typeof sessionId !== "string") {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const { data: rows, error: qErr } = await supabase
      .from("report_download_log")
      .select("downloaded_at")
      .eq("session_id", sessionId)
      .gte("downloaded_at", since)
      .order("downloaded_at", { ascending: true });

    if (qErr) throw qErr;

    const used = rows?.length ?? 0;
    const remaining = Math.max(0, DAILY_LIMIT - used);
    const oldest = rows?.[0]?.downloaded_at;
    const resetsAt = oldest
      ? new Date(new Date(oldest).getTime() + WINDOW_MS).toISOString()
      : null;

    if (!consume) {
      return new Response(
        JSON.stringify({ allowed: remaining > 0, used, remaining, limit: DAILY_LIMIT, resetsAt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (remaining <= 0) {
      // Record the blocked attempt so the admin dashboard can see quota breaches.
      await supabase
        .from("report_download_log")
        .insert({
          session_id: sessionId,
          video_id: videoId ?? null,
          status: "blocked",
          blocked_reason: "daily_quota_exceeded",
        });
      return new Response(
        JSON.stringify({ allowed: false, used, remaining: 0, limit: DAILY_LIMIT, resetsAt }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: iErr } = await supabase
      .from("report_download_log")
      .insert({ session_id: sessionId, video_id: videoId ?? null });
    if (iErr) throw iErr;

    const newUsed = used + 1;
    return new Response(
      JSON.stringify({
        allowed: true,
        used: newUsed,
        remaining: DAILY_LIMIT - newUsed,
        limit: DAILY_LIMIT,
        resetsAt: resetsAt ?? new Date(Date.now() + WINDOW_MS).toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
