-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can insert reports" ON public.analysis_reports;

-- Only the service role (edge functions) can insert reports now
-- No new INSERT policy needed for anon/authenticated since inserts go through the edge function