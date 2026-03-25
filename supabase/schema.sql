-- ============================================================
-- CargoFi Dispatch — Database Schema
-- Supabase / PostgreSQL
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- TENANTS
-- ============================================================
create table if not exists tenants (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- Seed pilot tenant
insert into tenants (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'CargoFi', 'cargofi')
on conflict do nothing;

-- ============================================================
-- OWNER OPERATORS
-- ============================================================
create table if not exists owner_operators (
  id                  uuid primary key default uuid_generate_v4(),
  tenant_id           uuid references tenants(id) on delete cascade,
  name                text not null,
  company_name        text,
  phone_whatsapp      text not null,
  email               text,
  dispatch_fee_pct    numeric(5,2) default 13.00,  -- % of gross
  mc_number           text,
  dot_number          text,
  insurance_expiry    date,
  insurance_carrier   text,
  drug_test_date      date,
  cdl_verified        boolean default false,
  psp_cleared         boolean default false,
  mvr_cleared         boolean default false,
  clearinghouse_ok    boolean default false,
  active              boolean default true,
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ============================================================
-- DRIVERS
-- (the person who actually drives — often different from OO)
-- ============================================================
create table if not exists drivers (
  id                    uuid primary key default uuid_generate_v4(),
  tenant_id             uuid references tenants(id) on delete cascade,
  owner_operator_id     uuid references owner_operators(id) on delete set null,
  name                  text not null,
  phone_whatsapp        text not null,  -- for check-ins
  cdl_number            text,
  cdl_state             text,
  cdl_expiry            date,
  medical_card_expiry   date,
  active                boolean default true,
  notes                 text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ============================================================
-- UNITS (trucks)
-- ============================================================
create table if not exists units (
  id                  uuid primary key default uuid_generate_v4(),
  tenant_id           uuid references tenants(id) on delete cascade,
  owner_operator_id   uuid references owner_operators(id) on delete set null,
  unit_number         text not null,
  make                text,
  model               text,
  year                int,
  vin                 text,
  license_plate       text,
  license_state       text,
  eld_device_id       text,   -- Monarch ELD ID
  active              boolean default true,
  created_at          timestamptz default now()
);

-- ============================================================
-- LOADS
-- ============================================================
create type kanban_status as enum (
  'available',
  'rate_con',
  'confirmed',
  'in_transit',
  'delivered',
  'pod_received',
  'invoiced',
  'paid',
  'settled'
);

create table if not exists loads (
  id                    uuid primary key default uuid_generate_v4(),
  tenant_id             uuid references tenants(id) on delete cascade,
  load_number           text not null,
  kanban_status         kanban_status default 'rate_con',

  -- Parties
  owner_operator_id     uuid references owner_operators(id) on delete restrict,
  driver_id             uuid references drivers(id) on delete restrict,
  unit_id               uuid references units(id) on delete set null,

  -- Broker / Customer
  broker_name           text not null,
  broker_mc             text,
  broker_contact        text,
  broker_phone          text,
  broker_email          text,
  customer_name         text,

  -- Financials
  rate                  numeric(10,2) not null,
  currency              text default 'USD',
  dispatch_fee_pct      numeric(5,2) not null,
  dispatch_fee_amount   numeric(10,2) generated always as (rate * dispatch_fee_pct / 100) stored,
  factoring_fee_pct     numeric(5,2) default 0,
  factoring_fee_amount  numeric(10,2) generated always as (rate * factoring_fee_pct / 100) stored,
  oo_gross              numeric(10,2) generated always as (rate - (rate * factoring_fee_pct / 100)) stored,
  -- oo_settlement is computed after deductions (done in app layer)

  -- Documents
  bol_number            text,
  po_number             text,
  rate_con_url          text,
  pod_url               text,

  -- Cargo
  commodity             text,
  weight_lbs            numeric(10,2),
  pieces                int,
  temp_f                text,   -- for reefer loads

  -- Cross-border
  mx_carrier            text,   -- permiso SCT / CAAT
  crossing_point        text,   -- e.g. "Laredo/Nuevo Laredo"

  -- Dates
  pickup_date           date,
  delivery_date         date,

  -- AI parsed from rate con
  raw_rate_con_text     text,

  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ============================================================
-- STOPS
-- ============================================================
create type stop_type as enum ('pickup', 'delivery', 'hook', 'drop', 'fuel', 'customs');

create table if not exists stops (
  id                  uuid primary key default uuid_generate_v4(),
  load_id             uuid references loads(id) on delete cascade,
  stop_type           stop_type not null,
  sequence            int not null default 1,
  facility_name       text,
  address             text,
  city                text not null,
  state               text not null,
  zip                 text,
  country             text default 'US',
  appointment_at      timestamptz,
  actual_arrival_at   timestamptz,
  actual_departure_at timestamptz,
  notes               text,
  created_at          timestamptz default now()
);

-- ============================================================
-- DEDUCTIONS
-- (fuel advance, lumper, tolls, escrow, etc.)
-- ============================================================
create type deduction_type as enum ('fuel_advance', 'lumper', 'tolls', 'escrow', 'repair', 'other');

create table if not exists deductions (
  id          uuid primary key default uuid_generate_v4(),
  load_id     uuid references loads(id) on delete cascade,
  description text not null,
  amount      numeric(10,2) not null,  -- positive = deduction FROM OO
  type        deduction_type default 'other',
  created_at  timestamptz default now()
);

-- ============================================================
-- MESSAGES (WhatsApp log)
-- ============================================================
create table if not exists messages (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid references tenants(id) on delete cascade,
  load_id         uuid references loads(id) on delete set null,
  direction       text check (direction in ('inbound', 'outbound')),
  from_number     text,
  to_number       text,
  body            text,
  media_url       text,
  wa_message_id   text unique,
  status          text default 'sent',
  created_at      timestamptz default now()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table if not exists documents (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid references tenants(id) on delete cascade,
  load_id       uuid references loads(id) on delete set null,
  doc_type      text,  -- 'rate_con', 'bol', 'pod', 'invoice', 'other'
  file_url      text,
  extracted_data jsonb,   -- Claude Vision parsed data
  created_at    timestamptz default now()
);

-- ============================================================
-- CHECK-INS (automated 7am check-ins to drivers)
-- ============================================================
create table if not exists checkins (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade,
  load_id     uuid references loads(id) on delete set null,
  driver_id   uuid references drivers(id) on delete set null,
  sent_at     timestamptz default now(),
  response    text,
  responded_at timestamptz
);

-- ============================================================
-- SCHEDULED MESSAGES
-- ============================================================
create table if not exists scheduled_messages (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid references tenants(id) on delete cascade,
  to_number     text not null,
  body          text not null,
  send_at       timestamptz not null,
  sent          boolean default false,
  sent_at       timestamptz,
  created_at    timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_loads_tenant        on loads(tenant_id);
create index if not exists idx_loads_status        on loads(kanban_status);
create index if not exists idx_loads_oo            on loads(owner_operator_id);
create index if not exists idx_loads_driver        on loads(driver_id);
create index if not exists idx_loads_created       on loads(created_at desc);
create index if not exists idx_stops_load          on stops(load_id, sequence);
create index if not exists idx_deductions_load     on deductions(load_id);
create index if not exists idx_messages_tenant     on messages(tenant_id, created_at desc);
create index if not exists idx_oo_tenant           on owner_operators(tenant_id);
create index if not exists idx_drivers_tenant      on drivers(tenant_id);
create index if not exists idx_drivers_oo          on drivers(owner_operator_id);

-- ============================================================
-- UPDATED_AT triggers
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_loads_updated_at
  before update on loads
  for each row execute function update_updated_at();

create trigger trg_oo_updated_at
  before update on owner_operators
  for each row execute function update_updated_at();

create trigger trg_drivers_updated_at
  before update on drivers
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (basic — single tenant for now)
-- ============================================================
alter table tenants           enable row level security;
alter table owner_operators   enable row level security;
alter table drivers           enable row level security;
alter table units             enable row level security;
alter table loads             enable row level security;
alter table stops             enable row level security;
alter table deductions        enable row level security;
alter table messages          enable row level security;
alter table documents         enable row level security;
alter table checkins          enable row level security;
alter table scheduled_messages enable row level security;

-- Service role bypasses RLS (used by backend API)
-- Anon key: no access by default (all operations go through backend)
