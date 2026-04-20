import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(req: NextRequest) {
  const sb = createServiceClient()
  const { searchParams } = req.nextUrl
  const months = parseInt(searchParams.get('months') ?? '6')

  // ── Fetch raw loads ───────────────────────────────────────────
  const { data: loads, error: loadsErr } = await sb
    .from('loads')
    .select('id, rate, dispatch_fee_amount, factoring_fee_amount, fuel_cost, kanban_status, pickup_date, delivery_date, owner_operator_id, owner_operators(name)')
    .eq('tenant_id', TENANT_ID)
    .order('pickup_date', { ascending: false })

  if (loadsErr) return NextResponse.json({ error: loadsErr.message }, { status: 500 })

  // ── Fetch invoices for AR aging ───────────────────────────────
  const { data: invoices } = await sb
    .from('invoices')
    .select('id, rate, fuel_surcharge, accessorials, status, due_at, issued_at')
    .eq('tenant_id', TENANT_ID)
    .not('status', 'in', '("paid","void")')

  // ── 1. Summary stats ─────────────────────────────────────────
  const allLoads = loads ?? []
  const totalRevenue = allLoads.reduce((s, l) => s + (parseFloat(l.rate) || 0), 0)
  const totalFees    = allLoads.reduce((s, l) => s + (parseFloat(l.dispatch_fee_amount) || 0), 0)
  const totalLoads   = allLoads.length
  const paidLoads    = allLoads.filter(l => ['paid','settled'].includes(l.kanban_status))
  const avgRate      = totalLoads > 0 ? totalRevenue / totalLoads : 0

  // ── 2. Loads by status ────────────────────────────────────────
  const statusMap: Record<string, number> = {}
  allLoads.forEach(l => {
    statusMap[l.kanban_status] = (statusMap[l.kanban_status] ?? 0) + 1
  })
  const loadsByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }))

  // ── 3. Monthly revenue (last N months) ───────────────────────
  const now = new Date()
  const monthlyMap: Record<string, { month: string; revenue: number; fees: number; net: number; loads: number }> = {}

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    monthlyMap[key] = { month: label, revenue: 0, fees: 0, net: 0, loads: 0 }
  }

  allLoads.forEach(l => {
    const dateStr = l.delivery_date ?? l.pickup_date
    if (!dateStr) return
    const d = new Date(dateStr + 'T12:00:00')
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyMap[key]) return
    const rate = parseFloat(l.rate) || 0
    const fee  = parseFloat(l.dispatch_fee_amount) || 0
    monthlyMap[key].revenue += rate
    monthlyMap[key].fees    += fee
    monthlyMap[key].net     += fee  // net for carrier = dispatch fees collected
    monthlyMap[key].loads   += 1
  })

  const monthly = Object.values(monthlyMap)

  // ── 4. Top OOs by gross revenue ──────────────────────────────
  const ooMap: Record<string, { name: string; revenue: number; loads: number; fees: number }> = {}
  allLoads.forEach(l => {
    const id   = l.owner_operator_id ?? 'company'
    const name = (l.owner_operators as any)?.name ?? 'Company Driver'
    if (!ooMap[id]) ooMap[id] = { name, revenue: 0, loads: 0, fees: 0 }
    ooMap[id].revenue += parseFloat(l.rate) || 0
    ooMap[id].loads   += 1
    ooMap[id].fees    += parseFloat(l.dispatch_fee_amount) || 0
  })
  const topOOs = Object.values(ooMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)

  // ── 5. Aging AR ───────────────────────────────────────────────
  const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 }
  const agingCount = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 }
  ;(invoices ?? []).forEach(inv => {
    const total = (parseFloat(inv.rate) || 0) + (parseFloat(inv.fuel_surcharge) || 0) + (parseFloat(inv.accessorials) || 0)
    if (!inv.due_at) { aging.current += total; agingCount.current++; return }
    const daysLate = Math.floor((Date.now() - new Date(inv.due_at + 'T12:00:00').getTime()) / 86400000)
    if (daysLate <= 0)       { aging.current += total; agingCount.current++ }
    else if (daysLate <= 30) { aging.days30  += total; agingCount.days30++  }
    else if (daysLate <= 60) { aging.days60  += total; agingCount.days60++  }
    else if (daysLate <= 90) { aging.days90  += total; agingCount.days90++  }
    else                     { aging.over90  += total; agingCount.over90++  }
  })
  const agingChart = [
    { label: 'Current',  amount: aging.current, count: agingCount.current, color: '#10b981' },
    { label: '1–30d',    amount: aging.days30,  count: agingCount.days30,  color: '#f59e0b' },
    { label: '31–60d',   amount: aging.days60,  count: agingCount.days60,  color: '#f97316' },
    { label: '61–90d',   amount: aging.days90,  count: agingCount.days90,  color: '#ef4444' },
    { label: '+90d',     amount: aging.over90,  count: agingCount.over90,  color: '#7f1d1d' },
  ]

  // ── 6. Loads pipeline (last 30d) ─────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const recent = allLoads.filter(l => (l.pickup_date ?? '') >= thirtyDaysAgo)
  const pipeline = {
    available: recent.filter(l => l.kanban_status === 'available').length,
    in_transit: recent.filter(l => ['confirmed','in_transit'].includes(l.kanban_status)).length,
    delivered: recent.filter(l => l.kanban_status === 'delivered').length,
    invoiced: recent.filter(l => l.kanban_status === 'invoiced').length,
    paid: recent.filter(l => ['paid','settled'].includes(l.kanban_status)).length,
  }

  return NextResponse.json({
    summary: { totalRevenue, totalFees, totalLoads, avgRate, paidLoads: paidLoads.length },
    monthly,
    loadsByStatus,
    topOOs,
    agingChart,
    pipeline,
  })
}
