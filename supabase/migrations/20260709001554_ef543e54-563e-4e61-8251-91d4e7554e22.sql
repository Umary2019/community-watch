
REVOKE EXECUTE ON FUNCTION public.enforce_report_rate_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_report_rate_limit() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_report_rate_limit() FROM authenticated;
