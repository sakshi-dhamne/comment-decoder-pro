DELETE FROM public.analysis_reports a
USING public.analysis_reports b
WHERE a.video_id = b.video_id
  AND a.created_at < b.created_at;

ALTER TABLE public.analysis_reports ADD CONSTRAINT analysis_reports_video_id_unique UNIQUE (video_id);