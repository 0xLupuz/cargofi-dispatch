-- ============================================================
-- CargoFi Dispatch — Migration v5
-- Invoices + Fuel Purchases + IFTA State Miles + OO Ledger view
-- 2026-04-14
-- ============================================================

-- ── INVOICES ─────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

CREATE TABLE IF NOT EXISTS invoices (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             uuid REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number        text NOT NULL DEFAULT 'INV-' || LPAD(nextval('invoice_seq')::text, 4, '0'),
  load_id               uuid REFERENCES loads(id) ON DELETE RESTRICT,

  -- Billed to
  broker_name           text NOT NULL,
  broker_mc             text,
  broker_email          text,
  broker_address        text,

  -- Amounts
  rate                  numeric(10,2) NOT NULL DEFAULT 0,
  fuel_surcharge        numeric(10,2) NOT NULL DEFAULT 0,
  accessorials          numeric(10,2) NOT NULL DEFAULT 0,

  -- Payment terms
  payment_terms         int NOT NULL DEFAULT 30,  -- Net days (30 / 45 / 60)
  quick_pay_pct         numeric(5,2) DEFAULT 0,   -- Quick pay discount %
  factoring_company_id  uuid REFERENCES factoring_companies(id) ON DELETE SET NULL,
  use_factoring         boolean DEFAULT false,

  -- Status
  status                text NOT NULL DEFAULT 'draft',  -- draft | sent | paid | overdue | void
  issued_at             date,
  due_at                date,
  paid_at               timestamptz,

  -- Notes / docs
  notes                 text,
  invoice_url           text,

  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant   ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_load     ON invoices(load_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due      ON invoices(due_at) WHERE status NOT IN ('paid','void');

-- ── FUEL PURCHASES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fuel_purchases (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id         uuid REFERENCES loads(id) ON DELETE CASCADE,
  purchase_date   date NOT NULL,
  vendor_name     text,
  city            text,
  state           text NOT NULL,       -- 2-letter US state code
  country         text DEFAULT 'US',
  gallons         numeric(8,3) NOT NULL,
  price_per_gallon numeric(6,3) NOT NULL,
  amount          numeric(10,2) NOT NULL, -- gallons × ppg (app-computed)
  receipt_number  text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_load    ON fuel_purchases(load_id);
CREATE INDEX IF NOT EXISTS idx_fuel_state   ON fuel_purchases(state);
CREATE INDEX IF NOT EXISTS idx_fuel_date    ON fuel_purchases(purchase_date);

-- ── IFTA STATE MILES (per load) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS ifta_state_miles (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id         uuid REFERENCES loads(id) ON DELETE CASCADE,
  state           text NOT NULL,       -- 2-letter US/CA state/province
  miles           numeric(8,1) NOT NULL DEFAULT 0,
  quarter         int NOT NULL,        -- 1-4
  year            int NOT NULL,
  auto_calculated boolean DEFAULT false,  -- true = from OpenRoute Service API
  created_at      timestamptz DEFAULT now(),
  UNIQUE(load_id, state)
);

CREATE INDEX IF NOT EXISTS idx_ifta_load    ON ifta_state_miles(load_id);
CREATE INDEX IF NOT EXISTS idx_ifta_quarter ON ifta_state_miles(year, quarter, state);

-- ── LOAD DRIVERS (if not already exists) ────────────────────────
-- Some older schema versions may not have this table
CREATE TABLE IF NOT EXISTS load_drivers (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  load_id         uuid REFERENCES loads(id) ON DELETE CASCADE,
  driver_id       uuid REFERENCES drivers(id) ON DELETE SET NULL,
  driver_name     text NOT NULL,
  miles           numeric(8,1) DEFAULT 0,
  rate_per_mile   numeric(6,4) DEFAULT 0,
  total_pay       numeric(10,2) DEFAULT 0,
  sort_order      int DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_load_drivers_load ON load_drivers(load_id);

-- ── LOADS: add fuel_cost + total_miles if missing ───────────────
ALTER TABLE loads
  ADD COLUMN IF NOT EXISTS fuel_cost   numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_miles numeric(8,1)  DEFAULT 0;

-- ── UPDATED_AT trigger for invoices ─────────────────────────────
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── OO LEDGER VIEW ──────────────────────────────────────────────
-- Aggregates financial data per OO across all settled loads
CREATE OR REPLACE VIEW oo_ledger AS
SELECT
  oo.id                                        AS owner_operator_id,
  oo.name                                      AS oo_name,
  oo.company_name,
  oo.phone_whatsapp,
  oo.tenant_id,
  COUNT(l.id)                                  AS total_loads,
  COALESCE(SUM(l.rate), 0)                     AS total_gross,
  COALESCE(SUM(l.dispatch_fee_amount), 0)      AS total_dispatch_fees,
  COALESCE(SUM(l.fuel_cost), 0)               AS total_fuel,
  COALESCE(SUM(
    (SELECT COALESCE(SUM(ld.total_pay),0) FROM load_drivers ld WHERE ld.load_id = l.id)
  ), 0)                                        AS total_driver_pay,
  COALESCE(SUM(
    (SELECT COALESCE(SUM(d.amount),0) FROM deductions d WHERE d.load_id = l.id)
  ), 0)                                        AS total_deductions,
  COALESCE(SUM(l.oo_gross), 0)                AS total_oo_gross,
  -- Net = OO gross - fuel - driver pay - other deductions
  COALESCE(SUM(
    l.rate
    - l.dispatch_fee_amount
    - COALESCE(l.factoring_fee_amount, 0)
    - COALESCE(l.fuel_cost, 0)
    - (SELECT COALESCE(SUM(ld.total_pay),0) FROM load_drivers ld WHERE ld.load_id = l.id)
    - (SELECT COALESCE(SUM(d.amount),0)    FROM deductions d         WHERE d.load_id = l.id)
  ), 0)                                        AS total_oo_net,
  MAX(l.created_at)                            AS last_load_at
FROM owner_operators oo
LEFT JOIN loads l ON l.owner_operator_id = oo.id
GROUP BY oo.id, oo.name, oo.company_name, oo.phone_whatsapp, oo.tenant_id;
