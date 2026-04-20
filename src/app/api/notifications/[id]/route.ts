import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = createServiceClient()
  const { id } = await params
  const { error } = await sb.from('notifications').update({ read: true }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = createServiceClient()
  const { id } = await params
  const { error } = await sb.from('notifications').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
