
-- 1) Audit log forgery
DROP POLICY IF EXISTS "Audit: insert own action" ON public.audit_logs;
CREATE POLICY "Audit: insert own action" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- 2) Police scope tightening on crime_reports
DROP POLICY IF EXISTS "Reports: officer read assigned" ON public.crime_reports;
CREATE POLICY "Reports: officer read assigned" ON public.crime_reports
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'police'::app_role)
    AND (officer_id = auth.uid() OR officer_id IS NULL OR status = 'pending'::report_status)
  );

DROP POLICY IF EXISTS "Reports: police update assigned" ON public.crime_reports;
CREATE POLICY "Reports: police update assigned" ON public.crime_reports
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'police'::app_role)
    AND (officer_id = auth.uid() OR officer_id IS NULL)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'police'::app_role)
    AND officer_id = auth.uid()
  );

-- 3) has_role SECURITY DEFINER: revoke direct EXECUTE from clients.
-- RLS policies invoke it via the postgres/table owner path, which still works.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;

-- 4) Evidence storage: add explicit UPDATE policy scoped to owner folder
DROP POLICY IF EXISTS "Evidence storage: owner update" ON storage.objects;
CREATE POLICY "Evidence storage: owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
