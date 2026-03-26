-- ============================================================
-- CargoFi Dispatch — Migration v3
-- Fleet Manager modules: Trailers, Customers, Factoring Companies
-- ============================================================

-- ── TRAILERS ─────────────────────────────────────────────────────────────────
create table if not exists trailers (
  id                  uuid primary key default uuid_generate_v4(),
  tenant_id           uuid references tenants(id) on delete cascade,
  trailer_number      text not null,
  make                text,
  model               text,
  year                int,
  vin                 text,
  gps_serial          text,
  trailer_type        text default '53_van',  -- 53_van | flatbed | reefer | bobtail | other
  suspension          text,                   -- air_ride | spring
  license_plate       text,
  plate_country       text default 'United States',
  plate_state         text,
  plate_expiry        date,
  plate_never_expire  boolean default false,
  inspection_expiry   date,
  lease_expiry        date,
  bond_expiry         date,
  company_owned       boolean default true,
  carrier             text,
  notes               text,
  active              boolean default true,
  inactive_since      date,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists idx_trailers_tenant on trailers(tenant_id);
create index if not exists idx_trailers_active on trailers(tenant_id, active);

-- ── CUSTOMERS (brokers / shippers / receivers) ────────────────────────────────
create table if not exists customers (
  id                  uuid primary key default uuid_generate_v4(),
  tenant_id           uuid references tenants(id) on delete cascade,
  name                text not null,
  customer_type       text default 'broker',   -- broker | shipper | receiver | customer
  rfc_tax_id          text,
  mc_number           text,
  -- Mailing address
  address1            text,
  address2            text,
  country             text default 'United States',
  state               text,
  city                text,
  zip                 text,
  -- Billing address (nullable if same as mailing)
  same_as_mailing     boolean default true,
  billing_address1    text,
  billing_country     text,
  billing_state       text,
  billing_city        text,
  billing_zip         text,
  -- Contacts
  primary_contact     text,
  telephone           text,
  telephone_ext       text,
  toll_free           text,
  fax                 text,
  secondary_contact   text,
  secondary_telephone text,
  secondary_ext       text,
  -- Billing
  billing_email       text,
  billing_email2      text,
  billing_email3      text,
  billing_email4      text,
  website             text,
  -- Meta
  active              boolean default true,
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists idx_customers_tenant on customers(tenant_id);
create index if not exists idx_customers_active on customers(tenant_id, active);

-- ── FACTORING COMPANIES ───────────────────────────────────────────────────────
create table if not exists factoring_companies (
  id                  uuid primary key default uuid_generate_v4(),
  tenant_id           uuid references tenants(id) on delete cascade,
  name                text not null,
  address             text,
  country             text default 'United States',
  state               text,
  city                text,
  zip                 text,
  -- Primary contact
  primary_contact     text,
  telephone           text,
  telephone_ext       text,
  toll_free           text,
  fax                 text,
  email               text,
  -- Secondary contact
  secondary_contact   text,
  secondary_telephone text,
  secondary_ext       text,
  -- Financial terms
  flat_discount       numeric(10,2) default 0,
  pay_discount_pct    numeric(5,2)  default 0,
  days_to_pay         int           default 0,
  federal_id          text,
  -- Notes
  internal_notes      text,
  notes_on_invoice    text,
  -- Meta
  active              boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists idx_factoring_tenant on factoring_companies(tenant_id);
