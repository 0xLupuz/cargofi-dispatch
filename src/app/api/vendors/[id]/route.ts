import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
export async function PATCH(req: NextRequest, { params }: { params: Promise<{id:string}> }) {
  const { id } = await params
  const { data, error } = await createServiceClient().from('vendors').update(await req.json()).eq('id',id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{id:string}> }) {
  const { id } = await params
  const { error } = await createServiceClient().from('vendors').delete().eq('id',id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
