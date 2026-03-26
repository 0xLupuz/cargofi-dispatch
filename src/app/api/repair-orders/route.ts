import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
const T = '00000000-0000-0000-0000-000000000001'

export async function GET(req: NextRequest) {
  const sb = createServiceClient()
  const { searchParams } = req.nextUrl
  const from   = searchParams.get('from')
  const to     = searchParams.get('to')
  const status = searchParams.get('status')
  const q      = searchParams.get('q')

  let query = sb.from('repair_orders')
    .select(`*, vendor:vendors(id,name), unit:units(id,unit_number,make,model,year,vin), trailer:trailers(id,trailer_number,make,model,year,vin)`)
    .eq('tenant_id', T)
    .order('created_at', { ascending: false })

  if (from)   query = query.gte('arrived_at', from)
  if (to)     query = query.lte('arrived_at', to + 'T23:59:59')
  if (status) query = query.eq('status', status)
  if (q)      query = query.or(`ro_number.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

function computeTotals(parts: any[], labor: any[], taxRate: number) {
  let taxable = 0, noTax = 0
  parts.forEach(p => {
    const amt = (p.quantity ?? 1) * (p.unit_price ?? 0)
    if (p.taxable) taxable += amt; else noTax += amt
  })
  labor.forEach(l => { noTax += (l.hours ?? 0) * (l.unit_price ?? 0) })
  const taxAmt = taxable * taxRate / 100
  return { subtotal_taxable: taxable, subtotal_no_taxable: noTax, tax_amount: taxAmt, total: taxable + noTax + taxAmt }
}

export async function POST(req: NextRequest) {
  const sb = createServiceClient()
  const body = await req.json()
  const { parts = [], labor = [], ...roData } = body

  const taxRate = parseFloat(roData.tax_rate ?? 8.25)
  const totals  = computeTotals(parts, labor, taxRate)

  const { data: ro, error } = await sb.from('repair_orders')
    .insert({ ...roData, ...totals, tenant_id: T })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (parts.length) {
    const pRows = parts.map((p: any, i: number) => ({
      ro_id: ro.id, ...p,
      amount: (p.quantity ?? 1) * (p.unit_price ?? 0),
      sort_order: i,
    }))
    await sb.from('ro_parts').insert(pRows)
  }
  if (labor.length) {
    const lRows = labor.map((l: any, i: number) => ({
      ro_id: ro.id, ...l,
      amount: (l.hours ?? 0) * (l.unit_price ?? 0),
      sort_order: i,
    }))
    await sb.from('ro_labor').insert(lRows)
  }

  return NextResponse.json(ro, { status: 201 })
}
