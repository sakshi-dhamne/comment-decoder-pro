import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-passcode",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expected = Deno.env.get("ADMIN_PASSCODE");
  if (!expected) return json({ error: "Admin not configured" }, 500);

  const passcode =
    req.headers.get("x-admin-passcode") ??
    new URL(req.url).searchParams.get("passcode") ??
    "";
  if (passcode !== expected) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const [replies, downloads] = await Promise.all([
      supabase
        .from("ai_reply_log")
        .select("id, session_id, video_id, tone, status, fallback, comment_preview, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("report_download_log")
        .select("id, session_id, video_id, status, blocked_reason, downloaded_at")
        .order("downloaded_at", { ascending: false })
        .limit(500),
    ]);

    if (replies.error) throw replies.error;
    if (downloads.error) throw downloads.error;

    // Aggregate per-session summary
    const sessions = new Map<string, {
      session_id: string;
      replies_total: number;
      replies_fallback: number;
      replies_error: number;
      downloads_total: number;
      downloads_blocked: number;
      last_activity: string;
    }>();
    const bump = (id: string, at: string) => {
      const s = sessions.get(id) ?? {
        session_id: id,
        replies_total: 0,
        replies_fallback: 0,
        replies_error: 0,
        downloads_total: 0,
        downloads_blocked: 0,
        last_activity: at,
      };
      if (at > s.last_activity) s.last_activity = at;
      sessions.set(id, s);
      return s;
    };
    for (const r of replies.data ?? []) {
      const s = bump(r.session_id, r.created_at);
      s.replies_total++;
      if (r.fallback) s.replies_fallback++;
      if (r.status !== "success") s.replies_error++;
    }
    for (const d of downloads.data ?? []) {
      const s = bump(d.session_id, d.downloaded_at);
      s.downloads_total++;
      if (d.status !== "success") s.downloads_blocked++;
    }

    return json({
      replies: replies.data ?? [],
      downloads: downloads.data ?? [],
      sessions: Array.from(sessions.values()).sort((a, b) =>
        a.last_activity < b.last_activity ? 1 : -1,
      ),
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
