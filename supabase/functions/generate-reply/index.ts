const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const BodySchema = z.object({
  commentText: z.string().min(1).max(2000),
  tone: z.enum(["friendly", "professional", "witty"]),
  videoTitle: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { commentText, tone, videoTitle } = parsed.data;

    const toneInstructions: Record<string, string> = {
      friendly: "Be warm, appreciative, and use a casual conversational tone. Include an emoji or two.",
      professional: "Be polite, informative, and maintain a professional tone. No slang.",
      witty: "Be clever and humorous while staying respectful. Light wordplay is welcome.",
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        tools: [{
          type: "function",
          function: {
            name: "generate_replies",
            description: "Generate reply options for a YouTube comment",
            parameters: {
              type: "object",
              properties: {
                replies: {
                  type: "array",
                  items: { type: "string" },
                  description: "3 different reply options",
                },
              },
              required: ["replies"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_replies" } },
        messages: [
          { role: "system", content: `You are a YouTube content creator replying to comments. ${toneInstructions[tone]} Generate 3 different reply options. Each reply should be 1-3 sentences, natural-sounding, and appropriate for YouTube.${videoTitle ? ` The video is titled: "${videoTitle}"` : ""}` },
          { role: "user", content: `Generate 3 ${tone} replies to this comment:\n\n"${commentText}"` },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) throw new Error("AI error");

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const { replies } = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ replies }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No tool call response");
  } catch (error) {
    console.error("Reply generation error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate reply" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
