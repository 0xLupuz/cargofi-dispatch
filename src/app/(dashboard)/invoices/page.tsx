'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Search, Clock, AlertCircle, CheckCircle, DollarSign, ChevronRight } from 'lucide-react'

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  draft:   { bg: 'bg-gray-700/60',       text: 'text-gray-400',   label: 'Draft'   },
  sent:    { bg: 'bg-blue-500/10',        text: 'text-blue-400',   label: 'Sent'    },
  paid:    { bg: 'bg-emerald-500/10',     text: 'text-emerald-400',label: 'Paid'    },
  overdue: { bg: 'bg-red-500/10',         text: 'text-red-400',    label: 'Overdue' },
  void:    { bg: 'bg-gray-800',           text: 'text-gray-600',   label: 'Void'    },
}

function fmt(n: any) { return parseFloat(String(n ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d?: string | null) { if (!d) return '—'; return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) }
function daysUntilDue(due?: string | null) { if (!due) return null; return Math.ceil((new Date(due + 'T12:00:00').getTime() - Date.now()) / 86400000) }

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'pending' | 'paid' | 'all'>('pending')
  const [query, setQuery]       = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => { const t = setTimeout(() => setDebounced(query), 300); return () => clearTimeout(t) }, [query])

  const load = useCallback(async () => {
    setLoading(true)
    const status = tab === 'pending' ? 'pending' : tab === 'paid' ? 'paid' : 'all'
    const url = `/api/invoices?status=${status}${debounced ? `&q=${encodeURIComponent(debounced)}` : ''}`
    const r = await fetch(url)
    if (r.ok) setInvoices(await r.json())
    setLoading(false)
  }, [tab, debounced])

  useEffect(() => { load() }, [load])

  async function markPaid(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/invoices/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paid' }) })
    load()
  }

  async function markSent(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/invoices/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'sent' }) })
    load()
  }

  // Stats
  const pending  = invoices.filter(i => ['draft','sent'].includes(i.status))
  const overdue  = invoices.filter(i => i.status === 'overdue')
  const totalAR  = pending.reduce((s, i) => s + (parseFloat(i.rate) + parseFloat(i.fuel_surcharge ?? 0) + parseFloat(i.accessorials ?? 0)), 0)
  const overdueAmt = overdue.reduce((s, i) => s + (parseFloat(i.rate) + parseFloat(i.fuel_surcharge ?? 0) + parseFloat(i.accessorials ?? 0)), 0)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-400" />
          <h1 className="text-white font-semibold text-lg">Invoices</h1>
        </div>
        <button onClick={() => router.push('/invoices/new')}
          className="flex items-center gap-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="px-6 pt-5 pb-1 grid grid-cols-4 gap-4 flex-shrink-0">
        {[
          { label: 'Accounts Receivable', value: `$${fmt(totalAR)}`, sub: `${pending.length} invoices`, icon: DollarSign, color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/5' },
          { label: 'Overdue', value: `$${fmt(overdueAmt)}`, sub: `${overdue.length} invoices`, icon: AlertCircle, color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/5' },
          { label: 'Paid (current)',
            value: `$${fmt(invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(parseFloat(i.rate)+parseFloat(i.fuel_surcharge??0)+parseFloat(i.accessorials??0)),0))}`,
            sub: `${invoices.filter(i=>i.status==='paid').length} invoices`,
            icon: CheckCircle, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
          { label: 'Drafts', value: invoices.filter(i=>i.status==='draft').length, sub: 'not sent', icon: Clock, color: 'text-gray-400', border: 'border-gray-700', bg: 'bg-gray-800/30' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} px-4 py-3`}>
            <div className="flex items-center gap-1.5 mb-2">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Aging AR bar */}
      {pending.length > 0 && (
        <div className="px-6 py-3 flex-shrink-0">
          <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wider">Aging AR</p>
          <div className="flex gap-3">
            {[['0–30 days', 0, 30, 'bg-emerald-500/20 text-emerald-400'],
              ['31–60 days', 31, 60, 'bg-yellow-500/20 text-yellow-400'],
              ['61–90 days', 61, 90, 'bg-orange-500/20 text-orange-400'],
              ['+90 days', 91, 9999, 'bg-red-500/20 text-red-400']].map(([label, min, max, cls]) => {
              const group = pending.filter(i => {
                const d = daysUntilDue(i.due_at)
                if (d === null) return false
                const daysOld = -d
                return daysOld >= (min as number) && daysOld <= (max as number)
              })
              const amt = group.reduce((s, i) => s + parseFloat(i.rate ?? 0) + parseFloat(i.fuel_surcharge ?? 0), 0)
              if (amt === 0 && group.length === 0) return null
              return (
                <div key={label as string} className={`rounded-lg px-3 py-2 ${cls}`}>
                  <p className="text-xs font-semibold">{label as string}</p>
                  <p className="text-sm font-bold">${fmt(amt)}</p>
                  <p className="text-xs opacity-70">{group.length} inv.</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs + search */}
      <div className="px-6 py-2 border-b border-gray-800 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg p-1">
          {(['pending','paid','all'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${tab === t ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500 hover:text-gray-300'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Invoice #, broker..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors" />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 px-6 py-8 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" /> Loading...
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600">
            <FileText className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">{query ? 'No results' : 'No invoices yet'}</p>
            {!query && <button onClick={() => router.push('/invoices/new')} className="mt-2 text-xs text-orange-400 hover:underline">Create your first invoice →</button>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-950 border-b border-gray-800 z-10">
              <tr>
                {['Invoice #','Broker','Load','Issued','Due','Amount','Status',''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {invoices.map(inv => {
                const total  = (parseFloat(inv.rate) + parseFloat(inv.fuel_surcharge ?? 0) + parseFloat(inv.accessorials ?? 0))
                const s      = STATUS_STYLE[inv.status] ?? STATUS_STYLE.draft
                const days   = daysUntilDue(inv.due_at)
                const isLate = days !== null && days < 0 && inv.status !== 'paid'
                return (
                  <tr key={inv.id} onClick={() => router.push(`/invoices/${inv.id}`)}
                    className="hover:bg-gray-800/40 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-orange-400 font-semibold">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-[140px] truncate">{inv.broker_name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{inv.load?.load_number ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(inv.issued_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={isLate ? 'text-red-400 font-semibold' : 'text-gray-500'}>{fmtDate(inv.due_at)}</span>
                      {isLate && <span className="ml-1 text-xs text-red-500">{Math.abs(days!)}d late</span>}
                    </td>
                    <td className="px-4 py-3 text-white font-semibold">${fmt(total)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${s.bg} ${s.text}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {inv.status === 'draft' && (
                          <button onClick={e => markSent(inv.id, e)}
                            className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-md px-2 py-1 hover:bg-blue-500/25 transition-colors">
                            Send
                          </button>
                        )}
                        {['sent','overdue'].includes(inv.status) && (
                          <button onClick={e => markPaid(inv.id, e)}
                            className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-md px-2 py-1 hover:bg-emerald-500/25 transition-colors">
                            Mark Paid
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-700" />
                      </div>
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
