import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
const TENANT = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  const sb = createServiceClient()
  const { data, error } = await sb.from('factoring_companies').select('*').eq('tenant_id', TENANT).order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
export async function POST(req: NextRequest) {
  const sb = createServiceClient()
  const body = await req.json()
  const { data, error } = await sb.from('factoring_companies').insert({ ...body, tenant_id: TENANT }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
