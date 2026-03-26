import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

function computeTotals(parts: any[], labor: any[], taxRate: number) {
  let taxable = 0, noTax = 0
  parts.forEach(p => { const a = (p.quantity??1)*(p.unit_price??0); if (p.taxable) taxable+=a; else noTax+=a })
  labor.forEach(l => { noTax += (l.hours??0)*(l.unit_price??0) })
  const tax = taxable * taxRate / 100
  return { subtotal_taxable: taxable, subtotal_no_taxable: noTax, tax_amount: tax, total: taxable + noTax + tax }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{id:string}> }) {
  const sb = createServiceClient()
  const { id } = await params
  const [roRes, partsRes, laborRes] = await Promise.all([
    sb.from('repair_orders').select(`*, vendor:vendors(id,name), unit:units(id,unit_number,make,model,year,vin), trailer:trailers(id,trailer_number,make,model,year,vin)`).eq('id',id).single(),
    sb.from('ro_parts').select('*').eq('ro_id',id).order('sort_order'),
    sb.from('ro_labor').select('*').eq('ro_id',id).order('sort_order'),
  ])
  if (roRes.error) return NextResponse.json({ error: roRes.error.message }, { status: 500 })
  return NextResponse.json({ ...roRes.data, parts: partsRes.data ?? [], labor: laborRes.data ?? [] })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{id:string}> }) {
  const sb = createServiceClient()
  const { id } = await params
  const body = await req.json()
  const { parts, labor, ...roData } = body

  const taxRate = parseFloat(roData.tax_rate ?? 8.25)

  let updateData = { ...roData }
  if (parts !== undefined && labor !== undefined) {
    const totals = computeTotals(parts, labor, taxRate)
    updateData = { ...updateData, ...totals }
  }

  const { data: ro, error } = await sb.from('repair_orders').update(updateData).eq('id',id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Replace line items if provided
  if (parts !== undefined) {
    await sb.from('ro_parts').delete().eq('ro_id', id)
    if (parts.length) {
      await sb.from('ro_parts').insert(parts.map((p: any, i: number) => ({
        ro_id: id, ...p, amount: (p.quantity??1)*(p.unit_price??0), sort_order: i
      })))
    }
  }
  if (labor !== undefined) {
    await sb.from('ro_labor').delete().eq('ro_id', id)
    if (labor.length) {
      await sb.from('ro_labor').insert(labor.map((l: any, i: number) => ({
        ro_id: id, ...l, amount: (l.hours??0)*(l.unit_price??0), sort_order: i
      })))
    }
  }

  return NextResponse.json(ro)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{id:string}> }) {
  const { id } = await params
  const { error } = await createServiceClient().from('repair_orders').delete().eq('id',id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
