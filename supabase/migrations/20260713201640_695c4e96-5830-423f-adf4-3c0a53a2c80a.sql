CREATE INDEX IF NOT EXISTS idx_evidence_report_id ON public.evidence(report_id);
CREATE INDEX IF NOT EXISTS idx_investigation_updates_report_id ON public.investigation_updates(report_id);

DROP POLICY IF EXISTS "Updates: police/admin insert" ON public.investigation_updates;
CREATE POLICY "Updates: assigned officer or admin insert"
ON public.investigation_updates
FOR INSERT TO authenticated
WITH CHECK (
  officer_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.crime_reports r
      WHERE r.id = investigation_updates.report_id
        AND r.officer_id = auth.uid()
    )
  )
);