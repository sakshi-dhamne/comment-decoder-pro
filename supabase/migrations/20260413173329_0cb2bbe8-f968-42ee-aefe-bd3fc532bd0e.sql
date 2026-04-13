ALTER TABLE public.analysis_reports ADD COLUMN session_id text NOT NULL DEFAULT 'legacy';
CREATE INDEX idx_analysis_reports_session_id ON public.analysis_reports (session_id);