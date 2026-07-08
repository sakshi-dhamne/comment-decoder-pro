CREATE TABLE public.ai_reply_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  video_id TEXT,
  tone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  fallback BOOLEAN NOT NULL DEFAULT false,
  comment_preview TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_reply_log TO service_role;
ALTER TABLE public.ai_reply_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access" ON public.ai_reply_log FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX ai_reply_log_session_created_idx ON public.ai_reply_log (session_id, created_at DESC);
CREATE INDEX ai_reply_log_created_idx ON public.ai_reply_log (created_at DESC);

ALTER TABLE public.report_download_log
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
CREATE INDEX IF NOT EXISTS report_download_log_session_time_idx ON public.report_download_log (session_id, downloaded_at DESC);