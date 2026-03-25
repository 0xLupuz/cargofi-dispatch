import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('owner_operators')
    .select('*, drivers(id, name, phone_whatsapp), units(id, unit_number)')
    .eq('tenant_id', TENANT_ID)
    .eq('active', true)
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { data, error } = await supabase
    .from('owner_operators')
    .insert({ ...body, tenant_id: TENANT_ID })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
