CREATE TABLE IF NOT EXISTS public.analysis_usage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  video_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.analysis_usage_log TO service_role;

ALTER TABLE public.analysis_usage_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS analysis_usage_log_session_created_idx
  ON public.analysis_usage_log (session_id, created_at DESC);