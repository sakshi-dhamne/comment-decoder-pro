import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult } from "@/types/analysis";

export async function saveReport(result: AnalysisResult, videoUrl: string) {
  // Extract video ID from URL
  const match = videoUrl.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  const videoId = match?.[1] || "unknown";

  await supabase.from("analysis_reports").insert({
    video_id: videoId,
    video_url: videoUrl,
    video_title: result.video?.title || null,
    channel_title: result.video?.channelTitle || null,
    thumbnail: result.video?.thumbnail || null,
    result: result as any,
  });
}
