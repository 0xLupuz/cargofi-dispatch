-- ============================================================
-- CargoFi Dispatch — Migration v4
-- Maintenance: Vendors, Items List, Repair Orders
-- ============================================================

-- VENDORS
create table if not exists vendors (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    uuid references tenants(id) on delete cascade,
  name         text not null,
  address      text,
  city         text,
  state        text,
  zip          text,
  country      text default 'United States',
  contact_name text,
  telephone    text,
  email        text,
  notes        text,
  active       boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists idx_vendors_tenant on vendors(tenant_id);

-- ITEMS (parts & labor catalog)
create table if not exists items (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade,
  code        text not null,
  item_type   text default 'P',   -- P=Part  L=Labor
  item        text not null,
  sub_item    text,
  description text,
  charge_rate numeric(10,2) default 0,
  taxable     boolean default false,
  active      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_items_tenant on items(tenant_id);
create index if not exists idx_items_code   on items(tenant_id, code);

-- REPAIR ORDERS
create sequence if not exists ro_number_seq start 1;
create table if not exists repair_orders (
  id                  uuid primary key default uuid_generate_v4(),
  tenant_id           uuid references tenants(id) on delete cascade,
  ro_number           text not null default 'RO-' || lpad(nextval('ro_number_seq')::text, 4, '0'),
  external_shop       boolean default false,
  vendor_id           uuid references vendors(id) on delete set null,
  arrived_at          timestamptz default now(),
  delivered_at        timestamptz,
  status              text default 'estimate',
  equipment_type      text default 'truck',
  unit_id             uuid references units(id) on delete set null,
  trailer_id          uuid references trailers(id) on delete set null,
  odometer            int,
  internal_notes      text,
  printed_notes       text,
  subtotal_taxable    numeric(10,2) default 0,
  subtotal_no_taxable numeric(10,2) default 0,
  tax_rate            numeric(5,2)  default 8.25,
  tax_amount          numeric(10,2) default 0,
  total               numeric(10,2) default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index if not exists idx_ro_tenant on repair_orders(tenant_id);
create index if not exists idx_ro_status on repair_orders(status);

-- RO PARTS
create table if not exists ro_parts (
  id          uuid primary key default uuid_generate_v4(),
  ro_id       uuid references repair_orders(id) on delete cascade,
  item_id     uuid references items(id) on delete set null,
  code        text,
  item        text,
  sub_item    text,
  description text,
  taxable     boolean default false,
  quantity    numeric(10,3) default 1,
  unit_price  numeric(10,2) default 0,
  amount      numeric(10,2) default 0,
  sort_order  int default 0,
  created_at  timestamptz default now()
);
create index if not exists idx_ro_parts_ro on ro_parts(ro_id);

-- RO LABOR
create table if not exists ro_labor (
  id          uuid primary key default uuid_generate_v4(),
  ro_id       uuid references repair_orders(id) on delete cascade,
  item_id     uuid references items(id) on delete set null,
  code        text,
  item        text,
  sub_item    text,
  description text,
  hours       numeric(8,2) default 0,
  unit_price  numeric(10,2) default 0,
  amount      numeric(10,2) default 0,
  sort_order  int default 0,
  created_at  timestamptz default now()
);
create index if not exists idx_ro_labor_ro on ro_labor(ro_id);
