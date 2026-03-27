import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
const T = '00000000-0000-0000-0000-000000000001'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const miles      = parseInt(body.miles)       || 0
  const rate_pm    = parseFloat(body.rate_per_mile) || 0
  const total_pay  = parseFloat((miles * rate_pm).toFixed(2))

  const { data, error } = await createServiceClient()
    .from('load_drivers')
    .insert({ ...body, total_pay, tenant_id: T })
    .select(`*, driver:drivers(id, first_name, last_name)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
