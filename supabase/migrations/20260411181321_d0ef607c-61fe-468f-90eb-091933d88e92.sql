CREATE TABLE public.analysis_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,
  video_url text NOT NULL,
  video_title text,
  channel_title text,
  thumbnail text,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analysis_reports_video_id ON public.analysis_reports(video_id);
CREATE INDEX idx_analysis_reports_created_at ON public.analysis_reports(created_at DESC);

ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reports"
  ON public.analysis_reports FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert reports"
  ON public.analysis_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);