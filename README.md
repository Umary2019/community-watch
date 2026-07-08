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

**Citizens** — dashboard, submit report (GPS/manual location), upload evidence
(images/videos), view & track reports, edit/delete pending reports, live
notifications, profile management.

**Police officers** — assigned/nearby cases, crime map, case detail with
investigation timeline, status updates, internal notes.

**Administrators** — full report visibility, user & role management, crime
categories CRUD, audit logs, heatmap/hotspot map, analytics dashboard, CSV
export.

**System-wide** — 15 pre-seeded crime categories, 6 status states, severity
levels, auto-generated report numbers (`CR-YYYYMMDD-XXXXXX`), notification
triggers, Row-Level Security on every table.

## 4. Technology Stack

| Layer          | Tech                                                                 |
| -------------- | -------------------------------------------------------------------- |
| Framework      | TanStack Start v1, React 19, TypeScript, Vite 7                      |
| Styling        | Tailwind CSS v4, shadcn/ui, Lucide icons                             |
| Data / Server  | TanStack Query, TanStack Router, `createServerFn`                    |
| Backend        | Lovable Cloud (managed PostgreSQL + Auth + Storage + Edge functions) |
| Auth           | JWT sessions via Supabase Auth, bcrypt-hashed passwords              |
| Maps           | Leaflet, react-leaflet, OpenStreetMap, HTML5 Geolocation             |
| Charts         | Recharts                                                             |
| Forms          | react-hook-form + Zod validation                                     |
| Notifications  | Sonner toasts + database-driven in-app notifications                 |

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
  lib/           format helpers, leaflet-icons, utils
  routes/
    __root.tsx   root shell
    index.tsx    landing page
    auth.tsx     sign in / sign up
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
- Storage-level policies scoped to `{user_id}/` folders.
- Zod validation client-side; DB constraints + RLS server-side.
- No service-role key exposed to the browser.
- Audit log table + admin viewer.
- Passwords hashed by Supabase Auth (bcrypt).

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

## 15. Future Improvements

- Push notifications (web-push)
- SMS/WhatsApp gateway for offline citizens
- ML auto-categorisation of descriptions
- Real-time collaborative case boards
- React Native mobile app

## 16. License

MIT — academic use.
