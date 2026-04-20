import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = createServiceClient()
  const { id } = await params
  const { data, error } = await sb
    .from('invoices')
    .select(`*, load:load_id(*, stops(*), owner_operator:owner_operator_id(*))`)
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = createServiceClient()
  const { id } = await params
  const body = await req.json()

  // If marking as paid, set paid_at
  if (body.status === 'paid' && !body.paid_at) body.paid_at = new Date().toISOString()

  // If marking as sent, set issued_at + auto-compute due_at if missing
  if (body.status === 'sent') {
    body.issued_at = body.issued_at ?? new Date().toISOString().slice(0, 10)
    if (!body.due_at) {
      const { data: inv } = await sb.from('invoices').select('payment_terms').eq('id', id).single()
      if (inv) {
        const d = new Date(body.issued_at)
        d.setDate(d.getDate() + (inv.payment_terms ?? 30))
        body.due_at = d.toISOString().slice(0, 10)
      }
    }
    // Mark load invoiced_ok
    const { data: inv } = await sb.from('invoices').select('load_id').eq('id', id).single()
    if (inv?.load_id) await sb.from('loads').update({ invoiced_ok: true }).eq('id', inv.load_id)
  }

  // If marking paid, also update load paid_ok
  if (body.status === 'paid') {
    const { data: inv } = await sb.from('invoices').select('load_id').eq('id', id).single()
    if (inv?.load_id) await sb.from('loads').update({ paid_ok: true }).eq('id', inv.load_id)
  }

  const { data, error } = await sb.from('invoices').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = createServiceClient()
  const { id } = await params
  const { error } = await sb.from('invoices').update({ status: 'void' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
