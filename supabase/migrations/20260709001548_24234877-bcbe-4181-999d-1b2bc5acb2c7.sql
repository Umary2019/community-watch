
CREATE OR REPLACE FUNCTION public.enforce_report_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  SELECT count(*) INTO recent_count
  FROM public.crime_reports
  WHERE reporter_id = NEW.reporter_id
    AND created_at > now() - interval '1 hour';
  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit: you can only submit 5 reports per hour. Please contact emergency services if this is urgent.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crime_reports_rate_limit ON public.crime_reports;
CREATE TRIGGER crime_reports_rate_limit
  BEFORE INSERT ON public.crime_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_report_rate_limit();
