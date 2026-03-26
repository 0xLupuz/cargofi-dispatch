import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('units')
    .select('*, owner_operator:owner_operators(id, name)')
    .eq('tenant_id', TENANT_ID)
    .eq('active', true)
    .order('unit_number')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const body = await req.json()
  const { data, error } = await supabase
    .from('units')
    .insert({ ...body, tenant_id: TENANT_ID })
    .select('*, owner_operator:owner_operators(id, name)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
