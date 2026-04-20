import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  const sb = createServiceClient()
  const { data, error } = await sb
    .from('tenants')
    .select('*')
    .eq('id', TENANT_ID)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const sb   = createServiceClient()
  const body = await req.json()

  // Strip read-only fields
  const { id, created_at, slug, ...payload } = body
  payload.updated_at = new Date().toISOString()

  const { data, error } = await sb
    .from('tenants')
    .update(payload)
    .eq('id', TENANT_ID)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
