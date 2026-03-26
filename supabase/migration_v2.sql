-- ============================================================
-- CargoFi Dispatch — Migration v2
-- Kanban redesign: 3 trip columns + accounting checklist
-- ============================================================

-- 1. Add trip_status column (the new 3-column board driver)
ALTER TABLE loads
  ADD COLUMN IF NOT EXISTS trip_status text NOT NULL DEFAULT 'open'
    CHECK (trip_status IN ('open', 'in_transit', 'delivered'));

-- 2. Add work_order_number (client/broker's own reference #)
ALTER TABLE loads
  ADD COLUMN IF NOT EXISTS work_order_number text;

-- 3. Accounting checklist (all booleans, clickeable from card)
ALTER TABLE loads
  ADD COLUMN IF NOT EXISTS rate_con_ok  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pod_ok       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoiced_ok  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_ok      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS settled_ok   boolean NOT NULL DEFAULT false;

-- 4. Soft-archive: set when settlement WhatsApp is sent (or settled_ok toggled)
ALTER TABLE loads
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 5. Migrate existing loads: map old kanban_status → new trip_status
UPDATE loads SET trip_status = CASE
  WHEN kanban_status::text IN ('available', 'rate_con', 'confirmed') THEN 'open'
  WHEN kanban_status::text IN ('in_transit')                         THEN 'in_transit'
  WHEN kanban_status::text IN ('delivered','pod_received','invoiced','paid','settled') THEN 'delivered'
  ELSE 'open'
END;

-- 6. Migrate accounting checklist from old status
UPDATE loads SET
  rate_con_ok  = kanban_status::text NOT IN ('available'),
  pod_ok       = kanban_status::text IN ('pod_received','invoiced','paid','settled'),
  invoiced_ok  = kanban_status::text IN ('invoiced','paid','settled'),
  paid_ok      = kanban_status::text IN ('paid','settled'),
  settled_ok   = kanban_status::text = 'settled';

-- 7. Auto-archive anything that was already 'settled'
UPDATE loads SET archived_at = now()
  WHERE kanban_status::text = 'settled';

-- 8. Sequence for auto Load# generation: CF-0001, CF-0002 ...
CREATE SEQUENCE IF NOT EXISTS cargofi_load_seq START 1;

-- Set existing loads into the sequence so next auto-number doesn't collide
-- (only if load_number looks like CF-NNNN)
SELECT setval('cargofi_load_seq',
  COALESCE(MAX(NULLIF(regexp_replace(load_number, '[^0-9]', '', 'g'), '')::int), 0)
) FROM loads;

-- 9. Default: auto-generate CF-XXXX for new loads (if not explicitly provided)
ALTER TABLE loads
  ALTER COLUMN load_number SET DEFAULT 'CF-' || LPAD(nextval('cargofi_load_seq')::text, 4, '0');

-- 10. Indexes for board query (unarchived) + history search
CREATE INDEX IF NOT EXISTS idx_loads_trip_status ON loads(trip_status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_loads_archived    ON loads(archived_at);
CREATE INDEX IF NOT EXISTS idx_loads_wo          ON loads(work_order_number);
