# Development Seed Data

This seed is for local and staging testing only. It creates one CargoFi admin user, one direct CargoFi driver user, one active driver assignment, and one sample in-transit trip.

Do not run this against production.

## Required Environment Variables

Set these in your local shell or staging seed runner. Do not commit real values.

```bash
CARGOFI_SEED_ENV=local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

DEV_ADMIN_EMAIL=admin.dev@example.com
DEV_ADMIN_PASSWORD=choose-a-local-password

DEV_DRIVER_EMAIL=driver.dev@example.com
DEV_DRIVER_PASSWORD=choose-a-local-password
```

For staging, use `CARGOFI_SEED_ENV=staging`.

## Create Or Refresh Seed Data

```bash
npm run seed:dev
```

The script uses the Supabase Auth admin API to create or update the test users, then seeds the Dispatch tables with deterministic non-production records.

Created records:

- active admin `user_profiles` row for `DEV_ADMIN_EMAIL`
- active driver `user_profiles` row for `DEV_DRIVER_EMAIL`
- `driver_users` mapping for the seeded driver
- company/direct `driver_assignments` row with `ends_at = null`
- active truck unit `DEV-101`
- sample in-transit load `DEV-TRIP-001`
- pickup and delivery stops for the sample trip
- `load_drivers` row linking the driver to the sample trip

## Remove Seed Data

```bash
npm run seed:dev:reset
```

This removes the deterministic operational seed records and deletes the two Auth users identified by `DEV_ADMIN_EMAIL` and `DEV_DRIVER_EMAIL`.

## Test Flow

1. Run `npm run seed:dev`.
2. Start the app with `npm run dev`.
3. Sign in with `DEV_ADMIN_EMAIL` and `DEV_ADMIN_PASSWORD`.
4. Confirm the admin user lands in the existing admin dashboard flow.
5. Log out.
6. Sign in with `DEV_DRIVER_EMAIL` and `DEV_DRIVER_PASSWORD`.
7. Confirm the driver user lands on `/driver/current-trip`.
8. Confirm the driver shell shows an active assignment state.
9. Confirm `/dashboard` redirects the driver away from the admin dashboard.

## Notes

- Passwords are never stored in source files.
- The service role key is required because this script creates Supabase Auth users and writes through RLS-protected tables.
- The seeded driver is assigned directly to CargoFi/company operations, not to an owner operator.
- The sample trip is intentionally simple and should not be used for settlement, document, map, chat, or notification testing yet.
