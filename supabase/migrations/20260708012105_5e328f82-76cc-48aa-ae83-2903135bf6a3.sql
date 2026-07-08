
-- Ensure search_path is set on all functions (already set, but re-affirm)
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.notify_on_report_change() SET search_path = public;
ALTER FUNCTION public.generate_report_number() SET search_path = public;

-- Revoke public/anon execute on privileged SECURITY DEFINER functions.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_report_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_report_number() FROM PUBLIC, anon;

-- has_role is used in RLS by authenticated users – keep that grant, revoke anon
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- generate_report_number is called via DEFAULT during insert; grant to authenticated so inserts work
GRANT EXECUTE ON FUNCTION public.generate_report_number() TO authenticated;
