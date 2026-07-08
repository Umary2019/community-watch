
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('citizen','police','admin');
CREATE TYPE public.report_status AS ENUM ('pending','assigned','under_investigation','resolved','rejected','closed');
CREATE TYPE public.report_severity AS ENUM ('low','medium','high','critical');
CREATE TYPE public.evidence_type AS ENUM ('image','video','document');

-- ============ UTIL: updated_at ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  badge_number TEXT,
  station TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ PROFILE POLICIES ============
CREATE POLICY "Profiles: read own" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles: admin/police read all" ON public.profiles FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'police'));
CREATE POLICY "Profiles: insert own" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles: admin update all" ON public.profiles FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ USER ROLE POLICIES ============
CREATE POLICY "Roles: read own" ON public.user_roles FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Roles: admin read all" ON public.user_roles FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Roles: admin manage" ON public.user_roles FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ NEW USER TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'citizen')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CRIME CATEGORIES ============
CREATE TABLE public.crime_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.crime_categories TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.crime_categories TO authenticated;
GRANT ALL ON public.crime_categories TO service_role;
ALTER TABLE public.crime_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories: read all" ON public.crime_categories FOR SELECT
  TO authenticated, anon USING (true);
CREATE POLICY "Categories: admin manage" ON public.crime_categories FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.crime_categories (name, description, icon) VALUES
  ('Theft','Unlawful taking of property','package'),
  ('Robbery','Theft involving force or threat','shield-alert'),
  ('Kidnapping','Unlawful abduction','user-x'),
  ('Assault','Physical attack','swords'),
  ('Domestic Violence','Violence in domestic setting','home'),
  ('Cybercrime','Crimes committed via internet','laptop'),
  ('Fraud','Deception for financial gain','credit-card'),
  ('Murder','Unlawful killing','skull'),
  ('Fire Outbreak','Fire incidents','flame'),
  ('Road Accident','Traffic incidents','car'),
  ('Missing Person','Missing persons report','user-search'),
  ('Drug Related Crime','Drug offenses','pill'),
  ('Cultism','Cult-related activity','users'),
  ('Vandalism','Destruction of property','hammer'),
  ('Others','Other criminal activity','more-horizontal');

-- ============ REPORT NUMBER GENERATOR ============
CREATE SEQUENCE public.report_seq START 1;
CREATE OR REPLACE FUNCTION public.generate_report_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE n BIGINT;
BEGIN
  n := nextval('public.report_seq');
  RETURN 'CR-' || to_char(now(),'YYYYMMDD') || '-' || lpad(n::text, 6, '0');
END; $$;

-- ============ CRIME REPORTS ============
CREATE TABLE public.crime_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number TEXT NOT NULL UNIQUE DEFAULT public.generate_report_number(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.crime_categories(id),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  officer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.report_status NOT NULL DEFAULT 'pending',
  severity public.report_severity NOT NULL DEFAULT 'medium',
  incident_date DATE NOT NULL,
  incident_time TIME,
  address TEXT NOT NULL,
  state TEXT,
  lga TEXT,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_reporter ON public.crime_reports(reporter_id);
CREATE INDEX idx_reports_officer ON public.crime_reports(officer_id);
CREATE INDEX idx_reports_status ON public.crime_reports(status);
CREATE INDEX idx_reports_category ON public.crime_reports(category_id);
CREATE INDEX idx_reports_created ON public.crime_reports(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crime_reports TO authenticated;
GRANT ALL ON public.crime_reports TO service_role;
ALTER TABLE public.crime_reports ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.crime_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Reports: reporter read own" ON public.crime_reports FOR SELECT
  TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Reports: officer read assigned" ON public.crime_reports FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'police'));
CREATE POLICY "Reports: admin read all" ON public.crime_reports FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Reports: reporter insert" ON public.crime_reports FOR INSERT
  TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Reports: reporter update pending" ON public.crime_reports FOR UPDATE
  TO authenticated USING (reporter_id = auth.uid() AND status = 'pending')
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Reports: reporter delete pending" ON public.crime_reports FOR DELETE
  TO authenticated USING (reporter_id = auth.uid() AND status = 'pending');
CREATE POLICY "Reports: police update assigned" ON public.crime_reports FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(),'police'))
  WITH CHECK (public.has_role(auth.uid(),'police'));
CREATE POLICY "Reports: admin manage" ON public.crime_reports FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ EVIDENCE ============
CREATE TABLE public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.crime_reports(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  type public.evidence_type NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.evidence TO authenticated;
GRANT ALL ON public.evidence TO service_role;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Evidence: read for accessible reports" ON public.evidence FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.crime_reports r WHERE r.id = report_id
      AND (r.reporter_id = auth.uid()
        OR public.has_role(auth.uid(),'police')
        OR public.has_role(auth.uid(),'admin')))
  );
CREATE POLICY "Evidence: insert on own report or police/admin" ON public.evidence FOR INSERT
  TO authenticated WITH CHECK (
    uploaded_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.crime_reports r WHERE r.id = report_id
        AND (r.reporter_id = auth.uid()
          OR public.has_role(auth.uid(),'police')
          OR public.has_role(auth.uid(),'admin'))
    )
  );
CREATE POLICY "Evidence: delete own or admin" ON public.evidence FOR DELETE
  TO authenticated USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ INVESTIGATION UPDATES ============
CREATE TABLE public.investigation_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.crime_reports(id) ON DELETE CASCADE,
  officer_id UUID NOT NULL REFERENCES auth.users(id),
  note TEXT NOT NULL,
  status_change public.report_status,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.investigation_updates TO authenticated;
GRANT ALL ON public.investigation_updates TO service_role;
ALTER TABLE public.investigation_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Updates: read for accessible reports" ON public.investigation_updates FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.crime_reports r WHERE r.id = report_id
      AND ((r.reporter_id = auth.uid() AND NOT is_internal)
        OR public.has_role(auth.uid(),'police')
        OR public.has_role(auth.uid(),'admin')))
  );
CREATE POLICY "Updates: police/admin insert" ON public.investigation_updates FOR INSERT
  TO authenticated WITH CHECK (
    officer_id = auth.uid() AND
    (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'))
  );

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifs_user ON public.notifications(user_id, is_read);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notifs: own read" ON public.notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Notifs: own update" ON public.notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Notifs: own delete" ON public.notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Notifs: system/admin insert" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'police') OR user_id = auth.uid()
  );

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit: admin read" ON public.audit_logs FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Audit: insert own action" ON public.audit_logs FOR INSERT
  TO authenticated WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- ============ NOTIFY REPORTER ON STATUS/ASSIGNMENT ============
CREATE OR REPLACE FUNCTION public.notify_on_report_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.notifications (user_id, title, body, link)
      VALUES (NEW.reporter_id,
              'Report status updated',
              'Report ' || NEW.report_number || ' is now ' || NEW.status,
              '/reports/' || NEW.id);
    END IF;
    IF NEW.officer_id IS DISTINCT FROM OLD.officer_id AND NEW.officer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, link)
      VALUES (NEW.officer_id,
              'New case assigned',
              'You have been assigned to report ' || NEW.report_number,
              '/reports/' || NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_report_change AFTER UPDATE ON public.crime_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_report_change();
