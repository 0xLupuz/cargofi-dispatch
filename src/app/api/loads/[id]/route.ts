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
      deductions(id, description, amount, type)
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
