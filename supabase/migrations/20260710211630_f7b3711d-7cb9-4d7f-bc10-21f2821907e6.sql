
-- 1. In-app messaging between reporter and assigned officer
CREATE TABLE public.report_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.crime_reports(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX report_messages_report_idx ON public.report_messages(report_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.report_messages TO authenticated;
GRANT ALL ON public.report_messages TO service_role;

ALTER TABLE public.report_messages ENABLE ROW LEVEL SECURITY;

-- Only participants (reporter, assigned officer) or admins can see messages
CREATE POLICY "Messages: participants read"
ON public.report_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.crime_reports r
    WHERE r.id = report_messages.report_id
      AND (r.reporter_id = auth.uid() OR r.officer_id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Sender must be reporter or assigned officer or admin; sender_id must be self
CREATE POLICY "Messages: participants insert"
ON public.report_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND (
    EXISTS (
      SELECT 1 FROM public.crime_reports r
      WHERE r.id = report_messages.report_id
        AND (r.reporter_id = auth.uid() OR r.officer_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Recipients can mark messages read (update read_at). Cannot change body.
CREATE POLICY "Messages: recipient mark read"
ON public.report_messages FOR UPDATE TO authenticated
USING (
  sender_id <> auth.uid() AND (
    EXISTS (
      SELECT 1 FROM public.crime_reports r
      WHERE r.id = report_messages.report_id
        AND (r.reporter_id = auth.uid() OR r.officer_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (sender_id <> auth.uid());

-- Realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.report_messages;
ALTER TABLE public.report_messages REPLICA IDENTITY FULL;

-- Notify recipient on new message
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  recipient UUID;
BEGIN
  SELECT reporter_id, officer_id, report_number INTO r
  FROM public.crime_reports WHERE id = NEW.report_id;
  IF NEW.sender_id = r.reporter_id THEN
    recipient := r.officer_id;
  ELSE
    recipient := r.reporter_id;
  END IF;
  IF recipient IS NOT NULL AND recipient <> NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (recipient, 'New message',
      'New message on report ' || r.report_number,
      '/reports/' || NEW.report_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER report_messages_notify
AFTER INSERT ON public.report_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();


-- 2. Satisfaction ratings after case closure
CREATE TABLE public.report_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL UNIQUE REFERENCES public.crime_reports(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  feedback TEXT CHECK (feedback IS NULL OR char_length(feedback) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.report_ratings TO authenticated;
GRANT ALL ON public.report_ratings TO service_role;

ALTER TABLE public.report_ratings ENABLE ROW LEVEL SECURITY;

-- Reporter, assigned officer, or admin can read the rating
CREATE POLICY "Ratings: participants read"
ON public.report_ratings FOR SELECT TO authenticated
USING (
  reporter_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.crime_reports r
    WHERE r.id = report_ratings.report_id AND r.officer_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Only the actual reporter can submit, only for resolved/closed reports
CREATE POLICY "Ratings: reporter insert after closure"
ON public.report_ratings FOR INSERT TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.crime_reports r
    WHERE r.id = report_ratings.report_id
      AND r.reporter_id = auth.uid()
      AND r.status IN ('resolved'::report_status, 'closed'::report_status)
  )
);
