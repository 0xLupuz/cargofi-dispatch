-- ============================================================
-- CargoFi Dispatch — Full Setup Migration
-- Crea SOLO las tablas faltantes (safe to run on existing DB)
-- 2026-04-14
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Seed pilot tenant (safe if already exists)
INSERT INTO tenants (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'CargoFi', 'cargofi')
ON CONFLICT DO NOTHING;

-- ── UPDATED_AT function ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── ENUMS (safe) ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE kanban_status AS ENUM (
    'available','rate_con','confirmed','in_transit',
    'delivered','pod_received','invoiced','paid','settled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stop_type AS ENUM (
    'pickup','delivery','hook','drop','fuel','customs'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE deduction_type AS ENUM (
    'fuel_advance','lumper','tolls','escrow','repair','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── DRIVERS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID REFERENCES tenants(id) ON DELETE CASCADE,
  owner_operator_id     UUID REFERENCES owner_operators(id) ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  phone_whatsapp        TEXT NOT NULL,
  cdl_number            TEXT,
  cdl_state             TEXT,
  cdl_expiry            DATE,
  medical_card_expiry   DATE,
  active                BOOLEAN DEFAULT TRUE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drivers_tenant ON drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_oo     ON drivers(owner_operator_id);

-- ── LOADS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loads (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID REFERENCES tenants(id) ON DELETE CASCADE,
  load_number           TEXT NOT NULL,
  kanban_status         kanban_status DEFAULT 'rate_con',

  owner_operator_id     UUID REFERENCES owner_operators(id) ON DELETE RESTRICT,
  driver_id             UUID REFERENCES drivers(id) ON DELETE RESTRICT,
  unit_id               UUID REFERENCES units(id) ON DELETE SET NULL,

  broker_name           TEXT NOT NULL,
  broker_mc             TEXT,
  broker_contact        TEXT,
  broker_phone          TEXT,
  broker_email          TEXT,
  customer_name         TEXT,

  rate                  NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency              TEXT DEFAULT 'USD',
  dispatch_fee_pct      NUMERIC(5,2) NOT NULL DEFAULT 0,
  dispatch_fee_amount   NUMERIC(10,2) GENERATED ALWAYS AS (rate * dispatch_fee_pct / 100) STORED,
  factoring_fee_pct     NUMERIC(5,2) DEFAULT 0,
  factoring_fee_amount  NUMERIC(10,2) GENERATED ALWAYS AS (rate * factoring_fee_pct / 100) STORED,
  oo_gross              NUMERIC(10,2) GENERATED ALWAYS AS (rate - (rate * factoring_fee_pct / 100)) STORED,

  bol_number            TEXT,
  po_number             TEXT,
  rate_con_url          TEXT,
  pod_url               TEXT,

  commodity             TEXT,
  weight_lbs            NUMERIC(10,2),
  pieces                INT,
  temp_f                TEXT,

  mx_carrier            TEXT,
  crossing_point        TEXT,

  pickup_date           DATE,
  delivery_date         DATE,

  raw_rate_con_text     TEXT,

  -- v5 additions
  fuel_cost             NUMERIC(10,2) DEFAULT 0,
  total_miles           NUMERIC(8,1) DEFAULT 0,

  -- Checklist flags
  rate_con_ok           BOOLEAN DEFAULT FALSE,
  pod_ok                BOOLEAN DEFAULT FALSE,
  invoiced_ok           BOOLEAN DEFAULT FALSE,
  paid_ok               BOOLEAN DEFAULT FALSE,
  settled_ok            BOOLEAN DEFAULT FALSE,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loads_tenant  ON loads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loads_status  ON loads(kanban_status);
CREATE INDEX IF NOT EXISTS idx_loads_oo      ON loads(owner_operator_id);
CREATE INDEX IF NOT EXISTS idx_loads_driver  ON loads(driver_id);
CREATE INDEX IF NOT EXISTS idx_loads_created ON loads(created_at DESC);

DROP TRIGGER IF EXISTS trg_loads_updated_at ON loads;
CREATE TRIGGER trg_loads_updated_at
  BEFORE UPDATE ON loads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── STOPS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stops (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id               UUID REFERENCES loads(id) ON DELETE CASCADE,
  stop_type             stop_type NOT NULL,
  sequence              INT NOT NULL DEFAULT 1,
  facility_name         TEXT,
  address               TEXT,
  city                  TEXT NOT NULL,
  state                 TEXT NOT NULL,
  zip                   TEXT,
  country               TEXT DEFAULT 'US',
  appointment_at        TIMESTAMPTZ,
  actual_arrival_at     TIMESTAMPTZ,
  actual_departure_at   TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stops_load ON stops(load_id, sequence);

-- ── DEDUCTIONS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deductions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id     UUID REFERENCES loads(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  type        deduction_type DEFAULT 'other',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deductions_load ON deductions(load_id);

-- ── TRAILERS (v3) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trailers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  trailer_number      TEXT NOT NULL,
  make                TEXT,
  model               TEXT,
  year                INT,
  vin                 TEXT,
  gps_serial          TEXT,
  trailer_type        TEXT DEFAULT '53_van',
  suspension          TEXT,
  license_plate       TEXT,
  plate_country       TEXT DEFAULT 'United States',
  plate_state         TEXT,
  plate_expiry        DATE,
  plate_never_expire  BOOLEAN DEFAULT FALSE,
  inspection_expiry   DATE,
  lease_expiry        DATE,
  bond_expiry         DATE,
  company_owned       BOOLEAN DEFAULT TRUE,
  carrier             TEXT,
  notes               TEXT,
  active              BOOLEAN DEFAULT TRUE,
  inactive_since      DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trailers_tenant ON trailers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trailers_active ON trailers(tenant_id, active);

-- ── CUSTOMERS (v3) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  customer_type       TEXT DEFAULT 'broker',
  rfc_tax_id          TEXT,
  mc_number           TEXT,
  address1            TEXT,
  address2            TEXT,
  country             TEXT DEFAULT 'United States',
  state               TEXT,
  city                TEXT,
  zip                 TEXT,
  same_as_mailing     BOOLEAN DEFAULT TRUE,
  billing_address1    TEXT,
  billing_country     TEXT,
  billing_state       TEXT,
  billing_city        TEXT,
  billing_zip         TEXT,
  primary_contact     TEXT,
  telephone           TEXT,
  telephone_ext       TEXT,
  toll_free           TEXT,
  fax                 TEXT,
  secondary_contact   TEXT,
  secondary_telephone TEXT,
  secondary_ext       TEXT,
  billing_email       TEXT,
  billing_email2      TEXT,
  billing_email3      TEXT,
  billing_email4      TEXT,
  website             TEXT,
  active              BOOLEAN DEFAULT TRUE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(tenant_id, active);

-- ── FACTORING COMPANIES (v3) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS factoring_companies (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  address             TEXT,
  country             TEXT DEFAULT 'United States',
  state               TEXT,
  city                TEXT,
  zip                 TEXT,
  primary_contact     TEXT,
  telephone           TEXT,
  telephone_ext       TEXT,
  toll_free           TEXT,
  fax                 TEXT,
  email               TEXT,
  secondary_contact   TEXT,
  secondary_telephone TEXT,
  secondary_ext       TEXT,
  flat_discount       NUMERIC(10,2) DEFAULT 0,
  pay_discount_pct    NUMERIC(5,2)  DEFAULT 0,
  days_to_pay         INT           DEFAULT 0,
  federal_id          TEXT,
  internal_notes      TEXT,
  notes_on_invoice    TEXT,
  active              BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_factoring_tenant ON factoring_companies(tenant_id);

-- ── VENDORS (v4) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  address         TEXT,
  address2        TEXT,
  city            TEXT,
  state           TEXT,
  zip             TEXT,
  country         TEXT DEFAULT 'United States',
  contact_name    TEXT,
  telephone       TEXT,
  telephone_ext   TEXT,
  toll_free       TEXT,
  fax             TEXT,
  email           TEXT,
  is_repair_shop  BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);

-- ── ITEMS (v4) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  item_type   TEXT DEFAULT 'P',
  item        TEXT NOT NULL,
  sub_item    TEXT,
  description TEXT,
  charge_rate NUMERIC(10,2) DEFAULT 0,
  taxable     BOOLEAN DEFAULT FALSE,
  whole_qty   BOOLEAN DEFAULT TRUE,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_items_tenant ON items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_code   ON items(tenant_id, code);

-- ── REPAIR ORDERS (v4) ───────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS ro_number_seq START 1;

CREATE TABLE IF NOT EXISTS repair_orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  ro_number           TEXT NOT NULL DEFAULT 'RO-' || LPAD(NEXTVAL('ro_number_seq')::TEXT, 4, '0'),
  external_shop       BOOLEAN DEFAULT FALSE,
  vendor_id           UUID REFERENCES vendors(id) ON DELETE SET NULL,
  arrived_at          TIMESTAMPTZ DEFAULT NOW(),
  delivered_at        TIMESTAMPTZ,
  status              TEXT DEFAULT 'estimate',
  equipment_type      TEXT DEFAULT 'truck',
  unit_id             UUID REFERENCES units(id) ON DELETE SET NULL,
  trailer_id          UUID REFERENCES trailers(id) ON DELETE SET NULL,
  carrier             TEXT,
  odometer            INT,
  internal_notes      TEXT,
  printed_notes       TEXT,
  subtotal_taxable    NUMERIC(10,2) DEFAULT 0,
  subtotal_no_taxable NUMERIC(10,2) DEFAULT 0,
  tax_rate            NUMERIC(5,2)  DEFAULT 8.25,
  tax_amount          NUMERIC(10,2) DEFAULT 0,
  total               NUMERIC(10,2) DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ro_tenant ON repair_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ro_status ON repair_orders(status);

-- ── RO PARTS (v4) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ro_parts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ro_id       UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  item_id     UUID REFERENCES items(id) ON DELETE SET NULL,
  code        TEXT,
  item        TEXT,
  sub_item    TEXT,
  description TEXT,
  taxable     BOOLEAN DEFAULT FALSE,
  quantity    NUMERIC(10,3) DEFAULT 1,
  unit_price  NUMERIC(10,2) DEFAULT 0,
  amount      NUMERIC(10,2) DEFAULT 0,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ro_parts_ro ON ro_parts(ro_id);

-- ── RO LABOR (v4) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ro_labor (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ro_id       UUID REFERENCES repair_orders(id) ON DELETE CASCADE,
  item_id     UUID REFERENCES items(id) ON DELETE SET NULL,
  code        TEXT,
  item        TEXT,
  sub_item    TEXT,
  description TEXT,
  hours       NUMERIC(8,2) DEFAULT 0,
  unit_price  NUMERIC(10,2) DEFAULT 0,
  amount      NUMERIC(10,2) DEFAULT 0,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ro_labor_ro ON ro_labor(ro_id);

-- ── LOAD DRIVERS (v5) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS load_drivers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id       UUID REFERENCES loads(id) ON DELETE CASCADE,
  driver_id     UUID REFERENCES drivers(id) ON DELETE SET NULL,
  driver_name   TEXT NOT NULL,
  miles         NUMERIC(8,1) DEFAULT 0,
  rate_per_mile NUMERIC(6,4) DEFAULT 0,
  total_pay     NUMERIC(10,2) DEFAULT 0,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_load_drivers_load ON load_drivers(load_id);

-- ── INVOICES (v5) ────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

CREATE TABLE IF NOT EXISTS invoices (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number        TEXT NOT NULL DEFAULT 'INV-' || LPAD(NEXTVAL('invoice_seq')::TEXT, 4, '0'),
  load_id               UUID REFERENCES loads(id) ON DELETE RESTRICT,
  broker_name           TEXT NOT NULL,
  broker_mc             TEXT,
  broker_email          TEXT,
  broker_address        TEXT,
  rate                  NUMERIC(10,2) NOT NULL DEFAULT 0,
  fuel_surcharge        NUMERIC(10,2) NOT NULL DEFAULT 0,
  accessorials          NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_terms         INT NOT NULL DEFAULT 30,
  quick_pay_pct         NUMERIC(5,2) DEFAULT 0,
  factoring_company_id  UUID REFERENCES factoring_companies(id) ON DELETE SET NULL,
  use_factoring         BOOLEAN DEFAULT FALSE,
  status                TEXT NOT NULL DEFAULT 'draft',
  issued_at             DATE,
  due_at                DATE,
  paid_at               TIMESTAMPTZ,
  notes                 TEXT,
  invoice_url           TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_load   ON invoices(load_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due    ON invoices(due_at) WHERE status NOT IN ('paid','void');

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── FUEL PURCHASES (v5) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fuel_purchases (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id          UUID REFERENCES loads(id) ON DELETE CASCADE,
  purchase_date    DATE NOT NULL,
  vendor_name      TEXT,
  city             TEXT,
  state            TEXT NOT NULL,
  country          TEXT DEFAULT 'US',
  gallons          NUMERIC(8,3) NOT NULL,
  price_per_gallon NUMERIC(6,3) NOT NULL,
  amount           NUMERIC(10,2) NOT NULL,
  receipt_number   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fuel_load  ON fuel_purchases(load_id);
CREATE INDEX IF NOT EXISTS idx_fuel_state ON fuel_purchases(state);
CREATE INDEX IF NOT EXISTS idx_fuel_date  ON fuel_purchases(purchase_date);

-- ── IFTA STATE MILES (v5) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ifta_state_miles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id         UUID REFERENCES loads(id) ON DELETE CASCADE,
  state           TEXT NOT NULL,
  miles           NUMERIC(8,1) NOT NULL DEFAULT 0,
  quarter         INT NOT NULL,
  year            INT NOT NULL,
  auto_calculated BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(load_id, state)
);
CREATE INDEX IF NOT EXISTS idx_ifta_load    ON ifta_state_miles(load_id);
CREATE INDEX IF NOT EXISTS idx_ifta_quarter ON ifta_state_miles(year, quarter, state);

-- ── OO LEDGER VIEW ───────────────────────────────────────────────
CREATE OR REPLACE VIEW oo_ledger AS
SELECT
  oo.id                AS owner_operator_id,
  oo.name              AS oo_name,
  oo.company_name,
  oo.phone_whatsapp,
  oo.tenant_id,
  COUNT(l.id)          AS total_loads,
  COALESCE(SUM(l.rate), 0)                  AS total_gross,
  COALESCE(SUM(l.dispatch_fee_amount), 0)   AS total_dispatch_fees,
  COALESCE(SUM(l.fuel_cost), 0)             AS total_fuel,
  COALESCE(SUM(
    (SELECT COALESCE(SUM(ld.total_pay),0) FROM load_drivers ld WHERE ld.load_id = l.id)
  ), 0)                                     AS total_driver_pay,
  COALESCE(SUM(
    (SELECT COALESCE(SUM(d.amount),0) FROM deductions d WHERE d.load_id = l.id)
  ), 0)                                     AS total_deductions,
  COALESCE(SUM(l.oo_gross), 0)              AS total_oo_gross,
  COALESCE(SUM(
    l.rate
    - l.dispatch_fee_amount
    - COALESCE(l.factoring_fee_amount, 0)
    - COALESCE(l.fuel_cost, 0)
    - (SELECT COALESCE(SUM(ld.total_pay),0) FROM load_drivers ld WHERE ld.load_id = l.id)
    - (SELECT COALESCE(SUM(d.amount),0)    FROM deductions d         WHERE d.load_id = l.id)
  ), 0)                                     AS total_oo_net,
  MAX(l.created_at)    AS last_load_at
FROM owner_operators oo
LEFT JOIN loads l ON l.owner_operator_id = oo.id
GROUP BY oo.id, oo.name, oo.company_name, oo.phone_whatsapp, oo.tenant_id;

-- ── RLS POLICIES (allow anon access — API handles auth) ──────────
ALTER TABLE drivers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE loads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE stops               ENABLE ROW LEVEL SECURITY;
ALTER TABLE deductions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE trailers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE factoring_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ro_parts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ro_labor            ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_drivers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_purchases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifta_state_miles    ENABLE ROW LEVEL SECURITY;

-- Anon can do everything (service role used by API)
CREATE POLICY anon_all_drivers             ON drivers             FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY anon_all_loads               ON loads               FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY anon_all_stops               ON stops               FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY anon_all_deductions          ON deductions          FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY anon_all_trailers            ON trailers            FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY anon_all_customers           ON customers           FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY anon_all_factoring           ON factoring_companies FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY anon_all_vendors             ON vendors             FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY anon_all_items               ON items               FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY anon_all_ro                  ON repair_orders       FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY anon_all_ro_parts            ON ro_parts            FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY anon_all_ro_labor            ON ro_labor            FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY anon_all_load_drivers        ON load_drivers        FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY anon_all_invoices            ON invoices            FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY anon_all_fuel_purchases      ON fuel_purchases      FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY anon_all_ifta_state_miles    ON ifta_state_miles    FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);

-- ============================================================
-- Done ✅
-- ============================================================
