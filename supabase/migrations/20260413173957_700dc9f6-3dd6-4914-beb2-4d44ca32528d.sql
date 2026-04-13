CREATE POLICY "Anyone can delete reports by session_id"
ON public.analysis_reports
FOR DELETE
TO anon, authenticated
USING (true);