
DROP POLICY IF EXISTS "Allow insert reports" ON public.analysis_reports;

CREATE POLICY "Insert reports with session id"
  ON public.analysis_reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    session_id IS NOT NULL
    AND length(session_id) BETWEEN 8 AND 100
    AND video_id IS NOT NULL
    AND length(video_id) BETWEEN 1 AND 64
  );
