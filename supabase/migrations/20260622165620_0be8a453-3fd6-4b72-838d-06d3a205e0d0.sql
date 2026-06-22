DROP POLICY IF EXISTS "Insert reports with session id" ON public.analysis_reports;
REVOKE INSERT ON public.analysis_reports FROM anon, authenticated;