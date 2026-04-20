import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  const sb = createServiceClient()
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [loadsRes, invoicesRes, recentRes] = await Promise.all([
    sb.from('loads').select('id, rate, kanban_status, pickup_date, owner_operator_id').eq('tenant_id', TENANT_ID),
    sb.from('invoices').select('rate, fuel_surcharge, accessorials, status, due_at').eq('tenant_id', TENANT_ID).eq('status', 'overdue'),
    sb.from('loads')
      .select('id, load_number, broker_name, kanban_status, rate, pickup_date, owner_operators(name)')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const loads = loadsRes.data ?? []
  const overdue = invoicesRes.data ?? []
  const recent = recentRes.data ?? []

  const activeLoads = loads.filter(l => ['confirmed', 'in_transit'].includes(l.kanban_status)).length
  const revenueThisMonth = loads
    .filter(l => ['delivered','pod_received','invoiced','paid','settled'].includes(l.kanban_status) && (l.pickup_date ?? '') >= monthStart)
    .reduce((s, l) => s + (parseFloat(l.rate) || 0), 0)
  const overdueAR = overdue.reduce((s, i) => s + (parseFloat(i.rate) || 0) + (parseFloat(i.fuel_surcharge) || 0) + (parseFloat(i.accessorials) || 0), 0)
  const avgRate = loads.length > 0 ? loads.reduce((s, l) => s + (parseFloat(l.rate) || 0), 0) / loads.length : 0

  const statusCounts: Record<string, number> = {}
  loads.forEach(l => { statusCounts[l.kanban_status] = (statusCounts[l.kanban_status] ?? 0) + 1 })

  return NextResponse.json({ activeLoads, revenueThisMonth, overdueAR, overdueCount: overdue.length, avgRate, recentLoads: recent, statusCounts, totalLoads: loads.length })
}
