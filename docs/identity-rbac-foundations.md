# Identity and RBAC Foundations Proposal

This is a planning-only proposal for adding production-ready identity and authorization foundations to CargoFi Dispatch. It intentionally avoids UI redesign, full auth implementation, blockchain/DeFi concepts, and microservice proposals.

## Goals

- Support real user accounts for admins, owner-operators, and drivers.
- Keep the current dispatch app working during migration.
- Give admins access to all operational resources.
- Scope owner-operators to their own company, drivers, units, loads, documents, incidents, and settlements.
- Scope drivers to assigned trips and driver workflows only.
- Preserve mobile-first sessions for driver workflows on Android Chrome and iOS Safari.
- Centralize API authorization so individual routes cannot accidentally bypass access checks.

## Proposed Schema

Use Supabase Auth as the source of login identity and add app-owned profile/role tables in `public`.

```sql
create type app_role as enum ('admin', 'owner_operator', 'driver');

create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role app_role not null,
  display_name text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table owner_operator_users (
  user_id uuid primary key references user_profiles(id) on delete cascade,
  owner_operator_id uuid not null references owner_operators(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_operator_id, user_id)
);

create table driver_users (
  user_id uuid primary key references user_profiles(id) on delete cascade,
  driver_id uuid not null references drivers(id) on delete cascade,
  owner_operator_id uuid references owner_operators(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (driver_id, user_id)
);

create table incidents (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  load_id uuid references loads(id) on delete set null,
  driver_id uuid references drivers(id) on delete set null,
  owner_operator_id uuid references owner_operators(id) on delete set null,
  reported_by_user_id uuid references user_profiles(id) on delete set null,
  incident_type text not null,
  severity text not null default 'normal',
  status text not null default 'open',
  occurred_at timestamptz,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Add indexes early:

```sql
create index idx_user_profiles_tenant_role on user_profiles(tenant_id, role) where active = true;
create index idx_oo_users_oo on owner_operator_users(owner_operator_id);
create index idx_driver_users_driver on driver_users(driver_id);
create index idx_driver_users_oo on driver_users(owner_operator_id);
create index idx_incidents_tenant_status on incidents(tenant_id, status, created_at desc);
create index idx_incidents_driver on incidents(driver_id, created_at desc);
create index idx_incidents_oo on incidents(owner_operator_id, created_at desc);
```

Optional later tables, not first phase:

- `audit_events` for financial, settlement, document, status, and auth-sensitive changes.
- `user_invitations` if Supabase invite flows are not enough.
- `driver_session_devices` only if device-level mobile controls become necessary.

## Relationships

- `auth.users.id` maps one-to-one to `user_profiles.id`.
- Every profile belongs to one tenant through `tenant_id`.
- Admin profiles need no party mapping and may access all tenant resources.
- Owner-operator profiles map to exactly one `owner_operators.id` through `owner_operator_users`.
- Driver profiles map to exactly one `drivers.id` through `driver_users`.
- Drivers may also carry `owner_operator_id` for efficient authorization and mobile queries.
- Loads already connect to `owner_operator_id`, `driver_id`, `load_drivers`, stops, deductions, fuel, invoices, and documents.
- Future driver trip queries should use direct assignment through `loads.driver_id` and team/secondary assignment through `load_drivers.driver_id`.

## Migration Order

1. Add enum and identity mapping tables without changing existing login behavior.
2. Backfill an initial admin profile for the existing CargoFi operator account.
3. Add owner-operator and driver user mapping rows only when real accounts are created.
4. Add server helpers that read the Supabase session and resolve the current profile.
5. Keep the existing `dispatch_auth` cookie accepted for admin-only legacy access during migration.
6. Move API routes from cookie-only checks to centralized authorization helpers route by route.
7. Add RLS policies only after API authorization is in place and verified.
8. Remove the legacy shared password cookie once all admin access uses Supabase Auth.

## Supabase Auth Integration

Use Supabase Auth for real accounts and sessions. The frontend can use `@supabase/ssr` for server-aware session handling.

Minimum account setup:

- Admins: Supabase user plus `user_profiles.role = 'admin'`.
- Owner-operators: Supabase user plus `user_profiles.role = 'owner_operator'` and `owner_operator_users` mapping.
- Drivers: Supabase user plus `user_profiles.role = 'driver'` and `driver_users` mapping.

Do not encode authorization only in JWT custom claims. Claims can help performance later, but database-backed profile lookups should be authoritative during rollout.

## API Authorization Approach

Create a small server authorization module rather than scattering checks in routes.

Suggested files:

- `src/lib/auth/session.ts`: read Supabase session and legacy cookie fallback.
- `src/lib/auth/profile.ts`: resolve active `user_profiles` row and party mapping.
- `src/lib/auth/authorize.ts`: expose helpers like `requireAdmin`, `requireTenantUser`, `requireOwnerOperatorAccess`, and `requireDriverTripAccess`.
- `src/lib/auth/resources.ts`: shared resource ownership lookups for loads, documents, incidents, settlements, and drivers.

Authorization rules:

- Admin: can access all resources for the active tenant.
- Owner-operator: can access resources where `owner_operator_id` matches their mapping.
- Driver: can access assigned trips through `loads.driver_id` or `load_drivers.driver_id`; can upload/view documents and incidents only for assigned trips or their own driver profile.
- Legacy cookie: temporary admin-only fallback during migration, never owner-operator or driver access.

## Route Protection

Keep global API protection from `proxy.ts`, then add route-level authorization in API handlers.

Route groups to phase:

- Admin-only: settings, reports, customers, vendors, factoring companies, item list, repair orders, IFTA admin reports.
- Admin plus owner-operator scoped: owner-operator ledger, settlement previews, owner-operator documents, loads assigned to owner-operator.
- Admin plus driver scoped: assigned load detail, stops, POD/document upload, incident creation.
- System-only: cron routes, future webhooks, and background jobs using explicit secrets or signatures.

Do not rely on hiding navigation links for security. Every sensitive API route needs a server-side authorization decision.

## Mobile Session Considerations

- Use long enough sessions for drivers who operate across shifts, but keep refresh behavior reliable on iOS Safari and Android Chrome.
- Avoid flows that require repeated re-login during a trip.
- Keep driver workflows tolerant of poor network: simple retry, clear save states, and minimal required data per action.
- Avoid storing sensitive freight documents in local storage.
- Use server-created signed document URLs with short expirations for mobile document viewing/upload confirmation.
- Keep touch workflows small: assigned trips, next stop, status update, document upload, incident report, contact dispatch.

## Implementation Phases

### Phase 1: Foundation Only

- Add identity tables and indexes.
- Add server auth helper interfaces.
- Preserve current shared-password admin access.
- Add tests for helper decisions using mocked profiles/resources.
- No UI changes beyond possibly internal-only account bootstrap notes.

### Phase 2: Admin Supabase Auth

- Add admin login through Supabase Auth.
- Keep legacy cookie as temporary fallback.
- Convert admin API routes to `requireAdmin` or `requireTenantUser` as appropriate.
- Add audit logging for admin login and sensitive mutations.

### Phase 3: Owner-Operator Portal Scope

- Add owner-operator account mapping.
- Add scoped API reads for owner-operator loads, documents, ledger, and settlements.
- Keep UI minimal and operational; do not redesign admin screens.

### Phase 4: Driver Mobile Workflows

- Add driver account mapping.
- Add assigned-trip API routes.
- Add mobile-first driver screens for status updates, document/POD upload, and incident reporting.
- Add server checks for assigned trip access.

### Phase 5: RLS Tightening and Legacy Removal

- Add RLS policies aligned with the server authorization model.
- Remove broad anon policies if present in production.
- Remove legacy shared-password cookie after all active admins use Supabase Auth.
- Add monitoring and audit review for denied access attempts.

## Smallest Safe First PR

Create a schema-only and helper-interface PR:

- Add a migration for `app_role`, `user_profiles`, `owner_operator_users`, `driver_users`, and indexes.
- Add placeholder auth helper files with typed interfaces and no behavior change to existing routes.
- Add a short `docs/identity-rbac-foundations.md` reference.
- Do not switch login, do not change UI, and do not enforce RBAC yet.

This keeps production dispatch behavior stable while giving future PRs a safe foundation.

## Risks and Tradeoffs

- Keeping the legacy cookie temporarily is safer operationally but prolongs weak admin auth. Treat it as a short migration bridge.
- Database-backed role checks are slightly more work than JWT-only claims, but they are easier to audit and update during rollout.
- Adding RLS before route-level authorization may break production workflows. Add RLS after behavior is covered and tested.
- Driver mobile access increases exposure to real-world device loss and weak networks. Keep sessions reliable, document URLs short-lived, and workflows scoped.
- Owner-operator settlement access must be carefully reviewed to avoid cross-party financial leakage.

## Exact Files and Folders Affected Later

Expected future work areas:

- `supabase/`: identity tables, indexes, RLS policies, audit tables, incident tables.
- `src/lib/supabase.ts`: Supabase server/client setup changes for real sessions.
- `src/lib/auth/`: new centralized auth and authorization helpers.
- `src/app/api/**`: route-level authorization checks.
- `src/app/(auth)/login/page.tsx`: eventual Supabase Auth login flow.
- `src/app/(dashboard)/**`: admin routes remain admin-only.
- `src/app/(owner-operator)/**`: future owner-operator scoped portal.
- `src/app/(driver)/**`: future mobile-first driver workflows.
- `src/components/ui/DocUploader.tsx` and `src/app/api/documents/route.ts`: short-lived signed URLs and scoped document access.
- `src/app/api/loads/**`, `src/app/api/owner-operators/**`, `src/app/api/drivers/**`: ownership and assignment checks.
- `src/app/api/cron/**`: remain system-only with explicit secret protection.
