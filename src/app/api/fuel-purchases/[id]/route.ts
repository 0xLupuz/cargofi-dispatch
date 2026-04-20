import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = createServiceClient()
  const { id } = await params

  // Get the load_id before deleting
  const { data: fp } = await sb.from('fuel_purchases').select('load_id, amount').eq('id', id).single()
  const { error } = await sb.from('fuel_purchases').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recalculate fuel_cost on the load
  if (fp?.load_id) {
    const { data: all } = await sb.from('fuel_purchases').select('amount').eq('load_id', fp.load_id)
    const total = (all ?? []).reduce((s: number, r: any) => s + parseFloat(r.amount), 0)
    await sb.from('loads').update({ fuel_cost: total }).eq('id', fp.load_id)
  }

  return NextResponse.json({ ok: true })
}
