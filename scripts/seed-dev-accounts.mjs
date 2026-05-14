import { createClient } from '@supabase/supabase-js'

const ALLOWED_SEED_ENVS = new Set(['local', 'staging'])
const TENANT_ID = '00000000-0000-0000-0000-000000000001'

const SEED = {
  unitId: '00000000-0000-4000-8000-000000000301',
  driverId: '00000000-0000-4000-8000-000000000302',
  loadId: '00000000-0000-4000-8000-000000000303',
  pickupStopId: '00000000-0000-4000-8000-000000000304',
  deliveryStopId: '00000000-0000-4000-8000-000000000305',
  assignmentId: '00000000-0000-4000-8000-000000000306',
  loadDriverId: '00000000-0000-4000-8000-000000000307',
}

const args = new Set(process.argv.slice(2))
const resetOnly = args.has('--reset')

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function getConfig() {
  const seedEnv = requiredEnv('CARGOFI_SEED_ENV')
  if (!ALLOWED_SEED_ENVS.has(seedEnv)) {
    throw new Error('CARGOFI_SEED_ENV must be "local" or "staging". Refusing to seed production.')
  }

  if (process.env.VERCEL_ENV === 'production') {
    throw new Error('Refusing to run dev seed script with VERCEL_ENV=production.')
  }

  return {
    supabaseUrl: process.env.SUPABASE_URL || requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    serviceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    adminEmail: requiredEnv('DEV_ADMIN_EMAIL'),
    adminPassword: requiredEnv('DEV_ADMIN_PASSWORD'),
    driverEmail: requiredEnv('DEV_DRIVER_EMAIL'),
    driverPassword: requiredEnv('DEV_DRIVER_PASSWORD'),
  }
}

function createServiceClient(config) {
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function findAuthUserByEmail(supabase, email) {
  let page = 1

  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    })

    if (error) throw error

    const user = data.users.find(candidate => candidate.email?.toLowerCase() === email.toLowerCase())
    if (user) return user
    if (data.users.length < 100) return null
    page += 1
  }

  throw new Error(`Could not find ${email}; user list exceeded seed script pagination limit.`)
}

function isSeedUser(user) {
  return user?.app_metadata?.seed === 'cargofi-dev' || user?.user_metadata?.seed === 'cargofi-dev'
}

async function upsertAuthUser(supabase, email, password, role) {
  const existing = await findAuthUserByEmail(supabase, email)

  if (existing) {
    if (!isSeedUser(existing)) {
      throw new Error(`${email} already exists and is not marked as CargoFi dev seed data.`)
    }

    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: {
        seed: 'cargofi-dev',
        role,
      },
      app_metadata: {
        seed: 'cargofi-dev',
        role,
      },
    })

    if (error) throw error
    return data.user
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      seed: 'cargofi-dev',
      role,
    },
    app_metadata: {
      seed: 'cargofi-dev',
      role,
    },
  })

  if (error) throw error
  return data.user
}

async function upsertRow(supabase, table, values, onConflict = 'id') {
  const { error } = await supabase
    .from(table)
    .upsert(values, { onConflict })

  if (error) {
    throw new Error(`${table} seed failed: ${error.message}`)
  }
}

async function deleteById(supabase, table, id) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`${table} cleanup failed: ${error.message}`)
  }
}

async function deleteByColumn(supabase, table, column, value) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq(column, value)

  if (error) {
    throw new Error(`${table} cleanup failed: ${error.message}`)
  }
}

async function resetSeedData(supabase, config) {
  const adminUser = await findAuthUserByEmail(supabase, config.adminEmail)
  const driverUser = await findAuthUserByEmail(supabase, config.driverEmail)

  await deleteById(supabase, 'load_drivers', SEED.loadDriverId)
  await deleteById(supabase, 'stops', SEED.pickupStopId)
  await deleteById(supabase, 'stops', SEED.deliveryStopId)
  await deleteById(supabase, 'loads', SEED.loadId)
  await deleteById(supabase, 'driver_assignments', SEED.assignmentId)

  if (driverUser) {
    await deleteByColumn(supabase, 'driver_users', 'user_id', driverUser.id)
  }

  await deleteById(supabase, 'drivers', SEED.driverId)
  await deleteById(supabase, 'units', SEED.unitId)

  if (adminUser) {
    if (!isSeedUser(adminUser)) {
      throw new Error(`${config.adminEmail} exists and is not marked as CargoFi dev seed data.`)
    }

    await deleteByColumn(supabase, 'user_profiles', 'id', adminUser.id)
    const { error } = await supabase.auth.admin.deleteUser(adminUser.id)
    if (error) throw error
  }

  if (driverUser) {
    if (!isSeedUser(driverUser)) {
      throw new Error(`${config.driverEmail} exists and is not marked as CargoFi dev seed data.`)
    }

    await deleteByColumn(supabase, 'user_profiles', 'id', driverUser.id)
    const { error } = await supabase.auth.admin.deleteUser(driverUser.id)
    if (error) throw error
  }
}

async function seedDevData(supabase, config) {
  const adminUser = await upsertAuthUser(supabase, config.adminEmail, config.adminPassword, 'admin')
  const driverUser = await upsertAuthUser(supabase, config.driverEmail, config.driverPassword, 'driver')

  await upsertRow(supabase, 'tenants', {
    id: TENANT_ID,
    name: 'CargoFi',
    slug: 'cargofi',
    active: true,
  })

  await upsertRow(supabase, 'units', {
    id: SEED.unitId,
    tenant_id: TENANT_ID,
    owner_operator_id: null,
    unit_number: 'DEV-101',
    make: 'Freightliner',
    model: 'Cascadia',
    year: 2022,
    license_plate: 'DEV101',
    license_state: 'TX',
    active: true,
  })

  await upsertRow(supabase, 'drivers', {
    id: SEED.driverId,
    tenant_id: TENANT_ID,
    owner_operator_id: null,
    name: 'Dev Driver',
    phone_whatsapp: '+15555550101',
    cdl_number: 'DEV-CDL-101',
    cdl_state: 'TX',
    active: true,
    notes: 'NON-PRODUCTION SEED DATA: safe to delete.',
  })

  await upsertRow(supabase, 'user_profiles', [{
    id: adminUser.id,
    tenant_id: TENANT_ID,
    role: 'admin',
    display_name: 'Dev Admin',
    phone: '+15555550001',
    active: true,
  }, {
    id: driverUser.id,
    tenant_id: TENANT_ID,
    role: 'driver',
    display_name: 'Dev Driver',
    phone: '+15555550101',
    active: true,
  }])

  await upsertRow(supabase, 'driver_users', {
    user_id: driverUser.id,
    driver_id: SEED.driverId,
  }, 'user_id')

  await upsertRow(supabase, 'driver_assignments', {
    id: SEED.assignmentId,
    tenant_id: TENANT_ID,
    driver_id: SEED.driverId,
    assignment_type: 'company',
    owner_operator_id: null,
    unit_id: SEED.unitId,
    starts_at: new Date().toISOString(),
    ends_at: null,
    assigned_by_user_id: adminUser.id,
    notes: 'NON-PRODUCTION SEED DATA: CargoFi direct driver assignment.',
  })

  await upsertRow(supabase, 'loads', {
    id: SEED.loadId,
    tenant_id: TENANT_ID,
    load_number: 'DEV-TRIP-001',
    kanban_status: 'in_transit',
    trip_status: 'in_transit',
    work_order_number: 'DEV-WO-001',
    owner_operator_id: null,
    driver_id: SEED.driverId,
    unit_id: SEED.unitId,
    broker_name: 'Dev Broker Logistics',
    broker_mc: 'MC-DEV',
    broker_contact: 'Dispatch Test',
    broker_phone: '+15555550200',
    broker_email: 'dispatch-test@example.invalid',
    customer_name: 'CargoFi Dev Customer',
    rate: 1850,
    currency: 'USD',
    dispatch_fee_pct: 0,
    factoring_fee_pct: 0,
    commodity: 'Non-production test freight',
    weight_lbs: 28500,
    pieces: 18,
    mx_carrier: 'DEV-MX-CARRIER',
    crossing_point: 'Laredo / Nuevo Laredo',
    pickup_date: new Date().toISOString().slice(0, 10),
    delivery_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    rate_con_ok: true,
    pod_ok: false,
    invoiced_ok: false,
    paid_ok: false,
    settled_ok: false,
    archived_at: null,
    raw_rate_con_text: 'NON-PRODUCTION SEED DATA: sample current trip for driver shell testing.',
    fuel_cost: 0,
    total_miles: 156.4,
  })

  await upsertRow(supabase, 'stops', [{
    id: SEED.pickupStopId,
    load_id: SEED.loadId,
    stop_type: 'pickup',
    sequence: 1,
    facility_name: 'Dev Pickup Warehouse',
    address: '100 Test Dock Rd',
    city: 'Laredo',
    state: 'TX',
    zip: '78045',
    country: 'US',
    appointment_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    notes: 'NON-PRODUCTION SEED DATA.',
  }, {
    id: SEED.deliveryStopId,
    load_id: SEED.loadId,
    stop_type: 'delivery',
    sequence: 2,
    facility_name: 'Dev Delivery Yard',
    address: '200 Test Crossing Blvd',
    city: 'Nuevo Laredo',
    state: 'TAM',
    zip: '88000',
    country: 'MX',
    appointment_at: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    notes: 'NON-PRODUCTION SEED DATA.',
  }])

  await upsertRow(supabase, 'load_drivers', {
    id: SEED.loadDriverId,
    load_id: SEED.loadId,
    driver_id: SEED.driverId,
    driver_name: 'Dev Driver',
    miles: 156.4,
    rate_per_mile: 0,
    total_pay: 0,
    sort_order: 0,
  })

  return {
    adminEmail: config.adminEmail,
    driverEmail: config.driverEmail,
    driverId: SEED.driverId,
    loadId: SEED.loadId,
  }
}

async function main() {
  const config = getConfig()
  const supabase = createServiceClient(config)

  if (resetOnly) {
    await resetSeedData(supabase, config)
    console.log('Removed CargoFi non-production seed users and operational records.')
    return
  }

  await resetSeedData(supabase, config)
  const result = await seedDevData(supabase, config)

  console.log('Seeded CargoFi non-production admin, driver, active assignment, and sample trip.')
  console.log(`Admin email: ${result.adminEmail}`)
  console.log(`Driver email: ${result.driverEmail}`)
  console.log(`Driver ID: ${result.driverId}`)
  console.log(`Sample trip/load ID: ${result.loadId}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
