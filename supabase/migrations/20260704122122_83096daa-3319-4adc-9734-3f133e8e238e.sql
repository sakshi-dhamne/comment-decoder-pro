CREATE TABLE public.report_download_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  video_id text,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_download_log_session_time
  ON public.report_download_log (session_id, downloaded_at DESC);

GRANT ALL ON public.report_download_log TO service_role;

ALTER TABLE public.report_download_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access"
  ON public.report_download_log
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);