
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can read reports" ON public.analysis_reports;
DROP POLICY IF EXISTS "Anyone can delete reports by session_id" ON public.analysis_reports;

-- Block direct SELECT and DELETE from anon/authenticated; these now go through edge function with service role
-- Allow INSERT (clients save their own reports). session_id is stored and used by the edge function.
CREATE POLICY "Allow insert reports"
  ON public.analysis_reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No SELECT/DELETE/UPDATE policies = denied by default for anon/authenticated.
-- service_role bypasses RLS, used by the manage-reports edge function.

GRANT INSERT ON public.analysis_reports TO anon, authenticated;
REVOKE SELECT, DELETE, UPDATE ON public.analysis_reports FROM anon, authenticated;
GRANT ALL ON public.analysis_reports TO service_role;
