import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
const T = '00000000-0000-0000-0000-000000000001'
export async function GET() {
  const { data, error } = await createServiceClient().from('vendors').select('*').eq('tenant_id',T).order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
export async function POST(req: NextRequest) {
  const { data, error } = await createServiceClient().from('vendors').insert({ ...await req.json(), tenant_id: T }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
