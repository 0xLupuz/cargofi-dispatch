import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('loads')
    .select(`
      *,
      owner_operator:owner_operators(id, name, company_name, phone_whatsapp, dispatch_fee_pct),
      driver:drivers(id, name, phone_whatsapp),
      unit:units(id, unit_number, make, model),
      stops(id, stop_type, sequence, city, state, appointment_at),
      deductions(id, description, amount, type)
    `)
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('loads')
    .insert({ ...body, tenant_id: TENANT_ID })
    .select(`
      *,
      owner_operator:owner_operators(id, name, company_name, phone_whatsapp),
      driver:drivers(id, name, phone_whatsapp),
      unit:units(id, unit_number)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
