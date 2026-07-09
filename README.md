# SafeCity — Crime Reporting System with GPS Integration

> Final-year Computer Science project. A production-grade, GPS-enabled crime
> reporting platform for citizens, police officers and administrators, built on
> **TanStack Start**, **React 19**, **Tailwind CSS v4**, **shadcn/ui**,
> **Leaflet + OpenStreetMap** and **Lovable Cloud (PostgreSQL + Auth + Storage)**.

---

## 1. Overview

SafeCity lets citizens report crimes online with automatic GPS capture, upload
images and video as evidence, and track investigations end-to-end. Police
officers work assigned cases with an investigation timeline. Administrators
manage users, roles, categories, audit logs and a district-wide crime map.

## 2. Objectives

- Provide a fast, mobile-friendly way for citizens to report incidents.
- Capture accurate location data via HTML5 Geolocation + interactive map.
- Give police officers a structured workflow for investigation.
- Give administrators oversight, analytics and configuration.
- Enforce security through role-based access control, RLS and audit logging.

## 3. Features

### Citizens
- Dashboard with personal case summary and quick actions.
- Submit a report with automatic GPS capture or manual pin placement on a map.
- Upload up to 8 evidence files (images/videos) per report — private storage.
- Submit **anonymously** — identity hidden from officers, kept for admin oversight.
- View, track, edit, and delete own **pending** reports.
- In-app notifications on status change and officer assignment.
- Profile management (name, phone).
- **Forgot password / password reset** via email link.

### Police officers
- Case list filtered to assigned + pending (RLS-enforced).
- Self-assign unassigned cases in one click.
- Case detail with map, evidence gallery, investigation timeline.
- Post investigation updates, including **internal notes** hidden from reporters.
- Change status; citizen is auto-notified.
- Crime map with heat circles and per-case pins.

### Administrators
- Full report visibility, delete, and status override.
- Assign any officer to any case from a dropdown.
- User & role management (grant/revoke `police` / `admin`).
- Crime category CRUD (activate/deactivate, edit).
- Audit log viewer.
- Analytics dashboard with trends, status distribution, and category breakdown.
- District-wide crime heatmap with severity weighting.

### Reports list — search, filter, export
- Full-text search on report number, title, address.
- Filter by status, category, severity, and date range.
- Export current view to **CSV, Excel (.xlsx), or PDF** (all formula-injection safe).

### System-wide
- 15 pre-seeded crime categories, 6 status states, 4 severity levels.
- Auto-generated report numbers (`CR-YYYYMMDD-XXXXXX`).
- Notification triggers on status change / assignment.
- **Rate limiting**: max 5 report submissions per hour per user (DB-level).
- Row-Level Security on every table + storage bucket.
- Audit-log integrity — no user can forge `system` entries.
- CSV/Excel/PDF exports sanitize formula-injection triggers (`=`, `+`, `-`, `@`).

## 4. Technology Stack

| Layer          | Tech                                                                  |
| -------------- | --------------------------------------------------------------------- |
| Framework      | TanStack Start v1, React 19, TypeScript, Vite 7                       |
| Styling        | Tailwind CSS v4, shadcn/ui, Lucide icons                              |
| Data / Server  | TanStack Query, TanStack Router                                       |
| Backend        | Lovable Cloud (managed PostgreSQL + Auth + Storage)                   |
| Auth           | JWT sessions via Supabase Auth, bcrypt-hashed passwords, HIBP-capable |
| Maps           | Leaflet, react-leaflet, OpenStreetMap, HTML5 Geolocation              |
| Charts         | Recharts                                                              |
| Exports        | jsPDF + jspdf-autotable (PDF), SheetJS `xlsx` (Excel), native CSV     |
| Forms          | Native forms + Zod validation                                         |
| Notifications  | Sonner toasts + database-driven in-app notifications                  |

## 5. System Architecture

```
Browser  ->  TanStack Start (React 19)  ->  Lovable Cloud (Supabase)
             routes / loaders / hooks       PostgreSQL + Auth + Storage
             Leaflet, Recharts, shadcn/ui   Row-Level Security
```

## 6. Folder Structure

```
src/
  components/
    app/         AppShell, LocationPicker, EvidenceUpload
    ui/          shadcn/ui primitives
  hooks/         useAuth, useRoles, useTopRole
  integrations/supabase/  (auto-generated client & types)
  lib/           format helpers (CSV/XLSX/PDF), leaflet-icons, utils
  routes/
    __root.tsx   root shell
    index.tsx    landing page
    auth.tsx     sign in / sign up / forgot password
    auth.reset.tsx  password reset landing page
    _authenticated/
      route.tsx  auth gate (ssr: false)
      dashboard.tsx
      reports.index.tsx / reports.new.tsx / reports.$id.tsx
      map.tsx / notifications.tsx / profile.tsx
      admin.categories.tsx / admin.users.tsx / admin.audit.tsx
  styles.css     Tailwind v4 design system
```

## 7. Installation

```bash
bun install
bun dev
bun run build
```

### Prerequisites

Node 20+ or Bun 1.1+ and a modern browser with geolocation.

### Environment variables (auto-managed)

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
```

## 8. Database Schema

| Table                    | Purpose                                          |
| ------------------------ | ------------------------------------------------ |
| profiles                 | Public profile data linked 1-1 to auth.users     |
| user_roles               | citizen / police / admin role assignments        |
| crime_categories         | 15 seeded categories, admin-managed              |
| crime_reports            | Main incident records with GPS lat/lng           |
| evidence                 | Uploaded images/videos linked to a report        |
| investigation_updates    | Case timeline notes (internal / public)          |
| notifications            | Per-user in-app notifications                    |
| audit_logs               | System-level activity trail                      |

All tables are protected by Row-Level Security. Access is granted through
`has_role(user_id, role)` — a SECURITY DEFINER function — so citizens see
only their own reports, police see reports they are assigned to, and admins
see everything.

**Statuses:** pending -> assigned -> under_investigation -> resolved / rejected / closed.
**Severities:** low, medium, high, critical.

## 9. GPS & Map Integration

- Automatic capture via `navigator.geolocation.getCurrentPosition` with
  `enableHighAccuracy: true`.
- Interactive selection on Leaflet + OpenStreetMap tiles (click to place,
  drag to fine-tune).
- Latitude/longitude persisted on `crime_reports`.
- Report detail page renders the pin, with a link to open in OpenStreetMap for
  navigation.
- Admin/police "Crime Map" page shows all reports with severity-weighted
  heat circles and individual pins.

## 10. Evidence Storage

A private storage bucket (`evidence`) holds uploaded files. Signed URLs
(7-day expiry) are stored on the `evidence` row. Storage RLS:

- Upload path must be `{user_id}/...` — users can only write to their own folder.
- Owners, assigned police and admins can read; nobody else.

## 11. Authentication Flow

1. Sign up with email + password. A trigger creates the `profiles` row and
   grants the `citizen` role.
2. Sessions are JWTs, refreshed automatically.
3. Protected routes live under `_authenticated/` with a client-side auth gate
   (`ssr: false`).
4. `supabase.auth.onAuthStateChange` in `__root.tsx` invalidates router and
   query cache on `SIGNED_IN` / `SIGNED_OUT` / `USER_UPDATED`.
5. Admins promote users to police or admin from Users & Roles.

### Bootstrapping the first admin

There are no default credentials — sign up, then grant admin from the DB:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'you@example.com';
```

## 12. Security Highlights

- RLS on every table + `has_role()` helper with locked `search_path`.
- `has_role()` `EXECUTE` revoked from `anon` and `authenticated` — RLS-only.
- Storage-level policies scoped to `{user_id}/` folders for INSERT, SELECT,
  UPDATE and DELETE.
- Officer scope tightened: police can only read/update reports assigned to
  them, unassigned, or pending; cannot reassign to another officer.
- Audit log integrity: rows must carry `actor_id = auth.uid()`; no NULL-actor
  forgery bypass for signed-in users.
- CSV/Excel/PDF exports sanitize formula-injection triggers (`=`, `+`, `-`,
  `@`, tab, CR) before serialization.
- DB-level rate limiting: 5 reports/hour per user via `BEFORE INSERT` trigger.
- Zod validation client-side; DB constraints + RLS server-side.
- No service-role key exposed to the browser.
- Audit log table + admin viewer.
- Passwords hashed by Supabase Auth (bcrypt); optional HIBP leak-check
  available in Cloud → Users → Auth Settings.

### Password reset flow
1. Click **Forgot your password?** on the sign-in page.
2. Supabase sends a recovery email with a link to `/auth/reset`.
3. `/auth/reset` picks up the recovery session and lets the user set a new
   password (min 8 chars).
4. On success, the user is signed in and routed to the dashboard.

## 13. Testing

`bun run build` type-checks the whole app and regenerates the route tree.

Manual QA:
1. Sign up as citizen -> submit a report with GPS + evidence.
2. Promote your account to admin via SQL, promote another user to police,
   assign yourself to a case.
3. Post an investigation update and change status — the citizen gets a
   notification (bell badge in the top bar).

## 14. Deployment

Deploys via Lovable — click Publish in the editor. Frontend updates need an
explicit "Update" click; backend deploys automatically.

## 15. Feature Matrix

| Area                              | Status |
| --------------------------------- | ------ |
| Auth + roles (citizen/police/admin) | ✅   |
| GPS/map report submission         | ✅     |
| Evidence upload (images/video)    | ✅     |
| Anonymous reporting               | ✅     |
| Police / admin dashboards         | ✅     |
| Categories CRUD                   | ✅     |
| Status workflow + auto-notify     | ✅     |
| Investigation updates + internal notes | ✅ |
| Officer self-assign + admin assign | ✅    |
| Crime map + heatmap               | ✅     |
| Analytics + charts                | ✅     |
| Search + filters (status/category/severity/date) | ✅ |
| Export: CSV                       | ✅     |
| Export: Excel (.xlsx)             | ✅     |
| Export: PDF                       | ✅     |
| In-app notifications              | ✅     |
| Audit logs                        | ✅     |
| Password reset (email link)       | ✅     |
| Rate limiting                     | ✅     |

## 16. Future Improvements

- Email/SMS notification gateway (SendGrid / Twilio) for offline citizens.
- Push notifications (web-push).
- ML auto-categorisation of descriptions.
- Real-time collaborative case boards (Supabase Realtime).
- React Native mobile app.
- Automated E2E test suite (Playwright).

## 17. License

MIT — academic use.
