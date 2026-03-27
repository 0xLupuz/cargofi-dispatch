import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const miles   = parseInt(body.miles)       || 0
  const rate_pm = parseFloat(body.rate_per_mile) || 0
  const total_pay = parseFloat((miles * rate_pm).toFixed(2))

  const { data, error } = await createServiceClient()
    .from('load_drivers')
    .update({ ...body, total_pay })
    .eq('id', id)
    .select(`*, driver:drivers(id, first_name, last_name)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await createServiceClient().from('load_drivers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
