import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

// Called daily by Vercel Cron (see vercel.json)
// Also callable manually: GET /api/cron/daily
export async function GET(req: NextRequest) {
  // Optional: protect with a secret so only Vercel can call it
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb   = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)
  const in30  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const in7   = new Date(Date.now() +  7 * 86400000).toISOString().slice(0, 10)

  const created: string[] = []

  async function notify(type: string, severity: string, title: string, body: string, link?: string) {
    // Avoid duplicates: don't create same type+title if already exists unread today
    const { data: existing } = await sb
      .from('notifications')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('type', type)
      .eq('title', title)
      .eq('read', false)
      .gte('created_at', `${today}T00:00:00Z`)
      .limit(1)

    if (existing && existing.length > 0) return // already notified today

    await sb.from('notifications').insert({ tenant_id: TENANT_ID, type, severity, title, body, link })
    created.push(title)
  }

  // ── 1. Overdue invoices ───────────────────────────────────────
  const { data: overdueInvoices } = await sb
    .from('invoices')
    .select('id, invoice_number, broker_name, due_at, rate')
    .eq('tenant_id', TENANT_ID)
    .in('status', ['sent'])
    .lt('due_at', today)

  for (const inv of overdueInvoices ?? []) {
    const days = Math.floor((Date.now() - new Date(inv.due_at + 'T12:00:00').getTime()) / 86400000)
    await notify(
      'invoice_overdue',
      days > 30 ? 'error' : 'warning',
      `Invoice ${inv.invoice_number} overdue`,
      `${inv.broker_name} — $${parseFloat(inv.rate).toFixed(2)} — ${days} day${days !== 1 ? 's' : ''} past due`,
      '/invoices'
    )
    // Also update status to overdue
    await sb.from('invoices').update({ status: 'overdue' }).eq('id', inv.id)
  }

  // ── 2. OO insurance expiring ──────────────────────────────────
  const { data: oos } = await sb
    .from('owner_operators')
    .select('id, name, insurance_expiry, insurance_carrier')
    .eq('tenant_id', TENANT_ID)
    .eq('active', true)
    .not('insurance_expiry', 'is', null)
    .lte('insurance_expiry', in30)
    .gte('insurance_expiry', today)

  for (const oo of oos ?? []) {
    const days = Math.ceil((new Date(oo.insurance_expiry).getTime() - Date.now()) / 86400000)
    await notify(
      'insurance_expiring',
      days <= 7 ? 'error' : 'warning',
      `Insurance expiring — ${oo.name}`,
      `${oo.insurance_carrier ?? 'Carrier'} — expires in ${days} day${days !== 1 ? 's' : ''} (${oo.insurance_expiry})`,
      '/owner-operators'
    )
  }

  // Insurance already expired
  const { data: expiredOOs } = await sb
    .from('owner_operators')
    .select('id, name, insurance_expiry, insurance_carrier')
    .eq('tenant_id', TENANT_ID)
    .eq('active', true)
    .not('insurance_expiry', 'is', null)
    .lt('insurance_expiry', today)

  for (const oo of expiredOOs ?? []) {
    await notify(
      'insurance_expired',
      'error',
      `⚠️ Insurance EXPIRED — ${oo.name}`,
      `${oo.insurance_carrier ?? 'Carrier'} — expired ${oo.insurance_expiry}. Do not dispatch.`,
      '/owner-operators'
    )
  }

  // ── 3. Driver CDL expiring ────────────────────────────────────
  const { data: drivers } = await sb
    .from('drivers')
    .select('id, name, cdl_expiry, cdl_state')
    .eq('tenant_id', TENANT_ID)
    .eq('active', true)
    .not('cdl_expiry', 'is', null)
    .lte('cdl_expiry', in30)
    .gte('cdl_expiry', today)

  for (const d of drivers ?? []) {
    const days = Math.ceil((new Date(d.cdl_expiry).getTime() - Date.now()) / 86400000)
    await notify(
      'cdl_expiring',
      days <= 7 ? 'error' : 'warning',
      `CDL expiring — ${d.name}`,
      `${d.cdl_state ?? ''} CDL expires in ${days} day${days !== 1 ? 's' : ''} (${d.cdl_expiry})`,
      '/drivers'
    )
  }

  // CDL already expired
  const { data: expiredDrivers } = await sb
    .from('drivers')
    .select('id, name, cdl_expiry, cdl_state')
    .eq('tenant_id', TENANT_ID)
    .eq('active', true)
    .not('cdl_expiry', 'is', null)
    .lt('cdl_expiry', today)

  for (const d of expiredDrivers ?? []) {
    await notify(
      'cdl_expired',
      'error',
      `⚠️ CDL EXPIRED — ${d.name}`,
      `${d.cdl_state ?? ''} CDL expired ${d.cdl_expiry}. Driver cannot operate.`,
      '/drivers'
    )
  }

  // ── 4. Driver Medical Card expiring ──────────────────────────
  const { data: medDrivers } = await sb
    .from('drivers')
    .select('id, name, medical_card_expiry')
    .eq('tenant_id', TENANT_ID)
    .eq('active', true)
    .not('medical_card_expiry', 'is', null)
    .lte('medical_card_expiry', in30)
    .gte('medical_card_expiry', today)

  for (const d of medDrivers ?? []) {
    const days = Math.ceil((new Date(d.medical_card_expiry).getTime() - Date.now()) / 86400000)
    await notify(
      'medical_expiring',
      days <= 7 ? 'error' : 'warning',
      `Medical card expiring — ${d.name}`,
      `DOT Medical Card expires in ${days} day${days !== 1 ? 's' : ''} (${d.medical_card_expiry})`,
      '/drivers'
    )
  }

  return NextResponse.json({
    ok: true,
    date: today,
    created: created.length,
    alerts: created,
  })
}
