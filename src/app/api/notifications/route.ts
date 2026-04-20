import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(req: NextRequest) {
  const sb = createServiceClient()
  const { searchParams } = req.nextUrl
  const unreadOnly = searchParams.get('unread') === 'true'

  let q = sb
    .from('notifications')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false })
    .limit(50)

  if (unreadOnly) q = q.eq('read', false)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const sb   = createServiceClient()
  const body = await req.json()
  const { data, error } = await sb
    .from('notifications')
    .insert({ ...body, tenant_id: TENANT_ID })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  // Mark all as read
  const sb = createServiceClient()
  const { error } = await sb
    .from('notifications')
    .update({ read: true })
    .eq('tenant_id', TENANT_ID)
    .eq('read', false)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
