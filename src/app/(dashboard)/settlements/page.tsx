'use client'
import { useState, useEffect, useCallback } from 'react'
import { DollarSign, FileText, CheckCircle, Printer, ChevronRight, History, Clock, Search } from 'lucide-react'
import Link from 'next/link'

function fmt(n: number | string | null | undefined) {
  const v = parseFloat(String(n ?? 0)) || 0
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

// ─── Shared financial calc ───────────────────────────────────────
function calcFinancials(load: any) {
  const rate   = parseFloat(load.rate) || 0
  const dspFee = rate * (parseFloat(load.dispatch_fee_pct) || 0) / 100
  const facFee = rate * (parseFloat(load.factoring_fee_pct) || 0) / 100
  const drvPay = (load.load_drivers ?? []).reduce((s: number, d: any) => s + Number(d.total_pay || 0), 0)
  const fuel   = parseFloat(load.fuel_cost) || 0
  const deds   = (load.deductions ?? []).reduce((s: number, d: any) => s + Number(d.amount || 0), 0)
  const ooNet  = rate - dspFee - facFee - drvPay - fuel - deds
  return { rate, dspFee, facFee, drvPay, fuel, deds, ooNet }
}

// ─── Breakdown pills ─────────────────────────────────────────────
function Breakdown({ load }: { load: any }) {
  const { rate, dspFee, facFee, drvPay, fuel, deds, ooNet } = calcFinancials(load)
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs">
      <Pill label="Gross" value={`$${fmt(rate)}`} color="text-white" />
      <Pill label={`Dispatch (${load.dispatch_fee_pct ?? 13}%)`} value={`-$${fmt(dspFee)}`} color="text-[#3ab690]" />
      {facFee > 0 && <Pill label={`Factoring (${load.factoring_fee_pct}%)`} value={`-$${fmt(facFee)}`} color="text-red-400" />}
      {drvPay > 0 && <Pill label="Driver Pay" value={`-$${fmt(drvPay)}`} color="text-red-400" />}
      {fuel > 0   && <Pill label="Fuel" value={`-$${fmt(fuel)}`} color="text-red-400" />}
      {deds > 0   && <Pill label="Deductions" value={`-$${fmt(deds)}`} color="text-red-400" />}
      <Pill label="OO Net" value={`$${fmt(ooNet)}`} color={ooNet >= 0 ? 'text-emerald-400' : 'text-red-400'} highlight />
    </div>
  )
}

function Pill({ label, value, color, highlight }: { label: string; value: string; color: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-1.5 ${highlight ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-[#161b22]/60'}`}>
      <p className="text-gray-500 text-[10px] mb-0.5">{label}</p>
      <p className={`font-semibold ${color}`}>{value}</p>
    </div>
  )
}

// ─── Pending tab (original) ──────────────────────────────────────
function PendingTab() {
  const [loads, setLoads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/loads?paid=true&settled=false')
    if (r.ok) setLoads(await r.json())
    setLoading(false)
  }, [])
  useEffect(() => { fetch_() }, [fetch_])

  const byOO: Record<string, { oo: any; loads: any[] }> = {}
  for (const load of loads) {
    const key = load.owner_operator_id ?? '__no_oo__'
    if (!byOO[key]) byOO[key] = { oo: load.owner_operator, loads: [] }
    byOO[key].loads.push(load)
  }
  const groups = Object.values(byOO)

  async function markSettled(loadId: string) {
    setSettling(loadId)
    await fetch(`/api/loads/${loadId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settled_ok: true }) })
    await fetch_()
    setSettling(null)
  }

  if (loading) return <Spinner />
  if (groups.length === 0) return (
    <div className="flex flex-col items-center justify-center h-60 text-[#484f58]">
      <CheckCircle className="w-10 h-10 mb-3 opacity-20" />
      <p className="text-sm font-medium">All caught up</p>
      <p className="text-xs mt-1 text-center max-w-xs">No loads pending settlement. Mark loads as <strong className="text-emerald-400">Paid</strong> on the board to see them here.</p>
    </div>
  )

  return (
    <div className="space-y-6 px-6 py-5">
      {groups.map(({ oo, loads: ooLoads }) => {
        const ooName   = oo?.company_name || oo?.name || 'No OO assigned'
        const totalNet = ooLoads.reduce((s, l) => s + calcFinancials(l).ooNet, 0)
        return (
          <div key={oo?.id ?? 'none'} className="bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-[#161b22]/50 border-b border-[#21262d]">
              <div>
                <p className="text-white font-semibold">{ooName}</p>
                {oo?.phone_whatsapp && <p className="text-xs text-gray-500">{oo.phone_whatsapp}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{ooLoads.length} load{ooLoads.length !== 1 ? 's' : ''}</p>
                <p className="text-white font-bold">${fmt(totalNet)} net</p>
              </div>
            </div>
            <div className="divide-y divide-gray-800/60">
              {ooLoads.map(load => (
                <div key={load.id} className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#3ab690] font-semibold text-sm">{load.load_number}</span>
                        {load.work_order_number && <span className="text-xs text-gray-500">WO: {load.work_order_number}</span>}
                        <span className="text-xs text-[#484f58]">{fmtDate(load.pickup_date)}</span>
                      </div>
                      <p className="text-gray-300 text-sm mt-0.5">{load.broker_name ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/settlements/${load.id}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-[#30363d] hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors">
                        <Printer className="w-3.5 h-3.5" /> Preview / PDF
                      </Link>
                      <button onClick={() => markSettled(load.id)} disabled={settling === load.id} className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {settling === load.id ? 'Settling...' : 'Mark Settled'}
                      </button>
                    </div>
                  </div>
                  <Breakdown load={load} />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── History tab ─────────────────────────────────────────────────
function HistoryTab() {
  const [loads, setLoads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => { const t = setTimeout(() => setDebounced(query), 300); return () => clearTimeout(t) }, [query])

  useEffect(() => {
    setLoading(true)
    const url = `/api/loads?paid=true&settled=true${debounced ? `&q=${encodeURIComponent(debounced)}` : ''}`
    fetch(url).then(r => r.json()).then(d => { setLoads(Array.isArray(d) ? d : []); setLoading(false) })
  }, [debounced])

  const totalSettled = loads.reduce((s, l) => s + calcFinancials(l).ooNet, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Search + summary */}
      <div className="px-6 py-3 border-b border-[#21262d] flex items-center gap-4 flex-shrink-0">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Load #, WO #, broker..." value={query} onChange={e => setQuery(e.target.value)}
            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3ab690] transition-colors"
          />
        </div>
        {!loading && loads.length > 0 && (
          <div className="text-xs text-gray-500 ml-auto text-right">
            <span className="text-white font-semibold">{loads.length}</span> settlements ·{' '}
            <span className="text-emerald-400 font-semibold">${fmt(totalSettled)}</span> total OO paid
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? <Spinner /> : loads.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-[#484f58] text-sm">
            {debounced ? 'No results' : 'No settled loads yet'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#080c12] border-b border-[#21262d] z-10">
              <tr>
                {['Load #', 'WO #', 'Date', 'OO', 'Broker', 'Gross', 'Dispatch', 'Driver Pay', 'Fuel', 'OO Net', ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loads.map(load => {
                const { rate, dspFee, drvPay, fuel, ooNet } = calcFinancials(load)
                const ooName = load.owner_operator?.company_name || load.owner_operator?.name || '—'
                return (
                  <tr key={load.id} className="hover:bg-[#161b22]/40 cursor-pointer transition-colors group">
                    <td className="px-4 py-3 font-mono text-[#3ab690] font-semibold">{load.load_number}</td>
                    <td className="px-4 py-3 text-gray-400">{load.work_order_number ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(load.pickup_date)}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-[130px] truncate">{ooName}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-[120px] truncate">{load.broker_name ?? '—'}</td>
                    <td className="px-4 py-3 text-white font-semibold">${fmt(rate)}</td>
                    <td className="px-4 py-3 text-[#3ab690]">-${fmt(dspFee)}</td>
                    <td className="px-4 py-3 text-red-400">{drvPay > 0 ? `-$${fmt(drvPay)}` : '—'}</td>
                    <td className="px-4 py-3 text-red-400">{fuel > 0 ? `-$${fmt(fuel)}` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${ooNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${fmt(ooNet)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/settlements/${load.id}`} onClick={e => e.stopPropagation()}
                        className="text-[#484f58] hover:text-gray-300 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center gap-2 text-gray-500 px-6 py-8">
      <div className="w-4 h-4 rounded-full border-2 border-[#3ab690] border-t-transparent animate-spin" />
      Loading...
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────
export default function SettlementsPage() {
  const [tab, setTab] = useState<'pending' | 'history'>('pending')

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d] flex-shrink-0">
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-[#3ab690]" />
          <h1 className="text-white font-semibold text-lg">Settlements</h1>
        </div>
        {/* Tab toggle */}
        <div className="flex items-center gap-1 bg-[#161b22]/60 rounded-lg p-1">
          <button
            onClick={() => setTab('pending')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'pending' ? 'bg-[rgba(58,182,144,0.2)] text-[#3ab690]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Pending
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'history' ? 'bg-[rgba(58,182,144,0.2)] text-[#3ab690]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <History className="w-3.5 h-3.5" /> History
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'pending' ? <PendingTab /> : <HistoryTab />}
      </div>
    </div>
  )
}
