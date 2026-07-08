
CREATE POLICY "Evidence storage: authenticated upload own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Evidence storage: owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Evidence storage: police/admin read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidence' AND (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "Evidence storage: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
