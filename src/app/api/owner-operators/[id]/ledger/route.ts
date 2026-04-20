import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = createServiceClient()
  const { id } = await params

  const [ooRes, loadsRes] = await Promise.all([
    sb.from('owner_operators').select('*').eq('id', id).single(),
    sb.from('loads')
      .select('id, load_number, broker_name, rate, dispatch_fee_amount, factoring_fee_amount, oo_gross, fuel_cost, kanban_status, pickup_date, delivery_date, deductions(*), load_drivers(*)')
      .eq('owner_operator_id', id)
      .eq('tenant_id', TENANT_ID)
      .order('pickup_date', { ascending: true }),
  ])

  if (ooRes.error) return NextResponse.json({ error: ooRes.error.message }, { status: 404 })

  const loads = loadsRes.data ?? []

  // Compute per-load net + running balance
  let running = 0
  const rows = loads.map(l => {
    const gross       = parseFloat(l.rate) || 0
    const dispFee     = parseFloat(l.dispatch_fee_amount) || 0
    const facFee      = parseFloat(l.factoring_fee_amount) || 0
    const fuel        = parseFloat(l.fuel_cost) || 0
    const driverPay   = (l.load_drivers as any[] ?? []).reduce((s: number, d: any) => s + (parseFloat(d.total_pay) || 0), 0)
    const otherDeds   = (l.deductions as any[] ?? []).reduce((s: number, d: any) => s + (parseFloat(d.amount) || 0), 0)
    const ooNet       = gross - dispFee - facFee - fuel - driverPay - otherDeds
    running          += ooNet
    return { ...l, _gross: gross, _dispFee: dispFee, _facFee: facFee, _fuel: fuel, _driverPay: driverPay, _otherDeds: otherDeds, _ooNet: ooNet, _runningBalance: running }
  })

  const totals = {
    gross:      rows.reduce((s, r) => s + r._gross, 0),
    dispFee:    rows.reduce((s, r) => s + r._dispFee, 0),
    fuel:       rows.reduce((s, r) => s + r._fuel, 0),
    driverPay:  rows.reduce((s, r) => s + r._driverPay, 0),
    otherDeds:  rows.reduce((s, r) => s + r._otherDeds, 0),
    ooNet:      rows.reduce((s, r) => s + r._ooNet, 0),
  }

  return NextResponse.json({ oo: ooRes.data, loads: rows, totals })
}
