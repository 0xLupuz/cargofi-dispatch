-- ============================================================
-- CargoFi Dispatch - Migration v6
-- Identity foundation: user profiles, roles, and driver assignments
-- ============================================================
-- This migration is additive only. It does not replace the current
-- dispatch_auth login, change API routes, or enforce full RBAC yet.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'owner_operator', 'driver');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_assignment_type') THEN
    CREATE TYPE driver_assignment_type AS ENUM ('owner_operator', 'company');
  END IF;
END $$;

-- ------------------------------------------------------------
-- UPDATED_AT helper
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- USER PROFILES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role         app_role NOT NULL,
  display_name text,
  phone        text,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_profiles IS
  'Application profile for a Supabase Auth user. Source of role and tenant for Dispatch authorization.';

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_role
  ON user_profiles(tenant_id, role)
  WHERE active = true;

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- OWNER-OPERATOR USER MAPPING
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS owner_operator_users (
  user_id           uuid PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  owner_operator_id uuid NOT NULL REFERENCES owner_operators(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_operator_id, user_id)
);

COMMENT ON TABLE owner_operator_users IS
  'Maps owner_operator role users to the owner_operators record they are allowed to access.';

CREATE INDEX IF NOT EXISTS idx_oo_users_oo
  ON owner_operator_users(owner_operator_id);

-- ------------------------------------------------------------
-- DRIVER USER MAPPING
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS driver_users (
  user_id    uuid PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  driver_id  uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (driver_id)
);

COMMENT ON TABLE driver_users IS
  'Maps driver role users to a driver record. Operational access also requires a current driver_assignments row.';

CREATE INDEX IF NOT EXISTS idx_driver_users_driver
  ON driver_users(driver_id);

-- ------------------------------------------------------------
-- DRIVER ASSIGNMENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS driver_assignments (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id           uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  assignment_type     driver_assignment_type NOT NULL,
  owner_operator_id   uuid REFERENCES owner_operators(id) ON DELETE RESTRICT,
  unit_id             uuid REFERENCES units(id) ON DELETE SET NULL,
  starts_at           timestamptz NOT NULL DEFAULT now(),
  ends_at             timestamptz,
  assigned_by_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT driver_assignments_valid_dates
    CHECK (ends_at IS NULL OR ends_at > starts_at),
  CONSTRAINT driver_assignments_valid_owner
    CHECK (
      (assignment_type = 'owner_operator' AND owner_operator_id IS NOT NULL)
      OR
      (assignment_type = 'company' AND owner_operator_id IS NULL)
    )
);

COMMENT ON TABLE driver_assignments IS
  'Historical and current driver ownership/operational assignment. A current row is required for driver operational access.';
COMMENT ON COLUMN driver_assignments.assignment_type IS
  'owner_operator means the driver belongs to an owner-operator. company means directly assigned to CargoFi/company fleet.';
COMMENT ON COLUMN driver_assignments.ends_at IS
  'NULL means current assignment. Non-NULL rows preserve historical assignment records.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_assignments_one_current
  ON driver_assignments(driver_id)
  WHERE ends_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver_history
  ON driver_assignments(driver_id, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_driver_assignments_oo_current
  ON driver_assignments(owner_operator_id, driver_id)
  WHERE ends_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_driver_assignments_company_current
  ON driver_assignments(tenant_id, driver_id)
  WHERE assignment_type = 'company' AND ends_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_driver_assignments_unit_current
  ON driver_assignments(unit_id)
  WHERE ends_at IS NULL;

DROP TRIGGER IF EXISTS trg_driver_assignments_updated_at ON driver_assignments;
CREATE TRIGGER trg_driver_assignments_updated_at
  BEFORE UPDATE ON driver_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- BACKFILL CURRENT OWNER-OPERATOR DRIVER ASSIGNMENTS
-- ------------------------------------------------------------
-- Existing drivers with owner_operator_id get a current owner_operator
-- assignment. Drivers without owner_operator_id are intentionally left
-- without a current assignment until an admin classifies them as either
-- owner_operator or company drivers in a later operational flow.
INSERT INTO driver_assignments (
  tenant_id,
  driver_id,
  assignment_type,
  owner_operator_id,
  starts_at,
  notes
)
SELECT
  d.tenant_id,
  d.id,
  'owner_operator'::driver_assignment_type,
  d.owner_operator_id,
  COALESCE(d.created_at, now()),
  'Backfilled from drivers.owner_operator_id during identity foundation migration'
FROM drivers d
WHERE d.owner_operator_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM driver_assignments da
    WHERE da.driver_id = d.id
      AND da.ends_at IS NULL
  );

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY BASELINE
-- ------------------------------------------------------------
-- RLS is enabled with no owner/operator/driver policies yet. Future PRs
-- will add policies after API authorization helpers are implemented.
-- Current server-side service-role access remains backward compatible.
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_operator_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Rollback considerations:
-- 1. Drop tables in reverse dependency order:
--    driver_assignments, driver_users, owner_operator_users, user_profiles.
-- 2. Drop app_role and driver_assignment_type only after dependent tables
--    are removed.
-- 3. Dropping this migration removes future identity mappings only; it does
--    not modify existing dispatch_auth behavior or current dispatch tables.
-- ============================================================
