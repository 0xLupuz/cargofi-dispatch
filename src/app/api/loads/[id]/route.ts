import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServiceClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('loads')
    .select(`
      *,
      owner_operator:owner_operators(id, name, company_name, phone_whatsapp, dispatch_fee_pct),
      driver:drivers(id, name, phone_whatsapp),
      unit:units(id, unit_number, make, model, license_plate, license_plate_mx),
      stops(id, stop_type, sequence, facility_name, address, city, state, country, appointment_at, actual_arrival_at, actual_departure_at, notes),
      deductions(id, description, amount, type),
      load_drivers(id, driver_id, driver_name, miles, rate_per_mile, total_pay, sort_order, driver:drivers(id, name, phone_whatsapp))
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServiceClient()
  const { id } = await params
  const body = await req.json()

  // Auto-archive when settled_ok is set to true
  // (this is also the trigger point for the WhatsApp settlement message in the future)
  if (body.settled_ok === true) {
    body.archived_at = new Date().toISOString()
  }

  // If un-settling, remove archive
  if (body.settled_ok === false) {
    body.archived_at = null
  }

  const { data, error } = await supabase
    .from('loads')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServiceClient()
  const { id } = await params
  const { error } = await supabase.from('loads').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
