'use client'
import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell
} from 'recharts'
import { BarChart2, DollarSign, TrendingUp, Truck, AlertCircle, RefreshCw, Users } from 'lucide-react'

function fmt(n: any) {
  const v = parseFloat(String(n ?? 0)) || 0
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`
}
function fmtFull(n: any) {
  return (parseFloat(String(n ?? 0)) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const AGING_COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#991b1b']
const STATUS_LABELS: Record<string, string> = {
  available: 'Available', rate_con: 'Rate Con', confirmed: 'Confirmed',
  in_transit: 'In Transit', delivered: 'Delivered', pod_received: 'POD Rcvd',
  invoiced: 'Invoiced', paid: 'Paid', settled: 'Settled',
}

// ── Custom tooltip ────────────────────────────────────────────────
function MonthTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill ?? p.color }}>
          {p.name}: ${fmtFull(p.value)}
        </p>
      ))}
    </div>
  )
}

function OOTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-300 font-semibold mb-1 truncate max-w-[160px]">{label}</p>
      <p className="text-orange-400">Revenue: ${fmtFull(payload[0]?.value)}</p>
      {payload[1] && <p className="text-emerald-400">Fees: ${fmtFull(payload[1]?.value)}</p>}
    </div>
  )
}

export default function ReportsPage() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [months, setMonths]   = useState(6)
  const [error, setError]     = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const r = await fetch(`/api/reports?months=${months}`)
      if (!r.ok) throw new Error('Failed to load')
      setData(await r.json())
    } catch { setError('Error loading reports') }
    setLoading(false)
  }

  useEffect(() => { load() }, [months])

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-500 px-6 py-12 text-sm">
      <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      Loading reports...
    </div>
  )

  if (error) return (
    <div className="px-6 py-8 text-red-400 text-sm">{error}</div>
  )

  const { summary, monthly, topOOs, agingChart, loadsByStatus, pipeline } = data ?? {}

  const totalAR = (agingChart ?? []).reduce((s: number, b: any) => s + b.amount, 0)

  return (
    <div className="h-full overflow-auto px-6 py-6 space-y-6 w-full">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-orange-400" />
          <h1 className="text-white font-semibold text-lg">Reports</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg p-1">
            {[3, 6, 12].map(m => (
              <button key={m} onClick={() => setMonths(m)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors
                  ${months === m ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500 hover:text-gray-300'}`}>
                {m}M
              </button>
            ))}
          </div>
          <button onClick={load} className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue',     value: `$${fmtFull(summary?.totalRevenue)}`, sub: `${summary?.totalLoads} loads`,                icon: DollarSign, color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/5' },
          { label: 'Dispatch Fees',     value: `$${fmtFull(summary?.totalFees)}`,    sub: `${((summary?.totalFees/summary?.totalRevenue)*100 || 0).toFixed(1)}% of rev`,icon: TrendingUp, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
          { label: 'Avg Rate / Load',   value: `$${fmtFull(summary?.avgRate)}`,      sub: `${summary?.totalLoads} loads total`,          icon: Truck,      color: 'text-blue-400',   border: 'border-blue-500/20',   bg: 'bg-blue-500/5' },
          { label: 'Accounts Receivable', value: `$${fmtFull(totalAR)}`,             sub: `${(agingChart ?? []).reduce((s: number, b: any) => s + b.count, 0)} invoices open`,icon: AlertCircle, color: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'bg-yellow-500/5' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border ${c.border} ${c.bg} px-4 py-3`}>
            <div className="flex items-center gap-1.5 mb-2">
              <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
              <p className="text-xs text-gray-500">{c.label}</p>
            </div>
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-600 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Monthly Revenue ──────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-300 mb-4">Monthly Revenue vs Dispatch Fees</p>
        {monthly?.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={52} />
              <Tooltip content={<MonthTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="revenue" name="Revenue"       fill="#f97316" radius={[4,4,0,0]} maxBarSize={40} />
              <Bar dataKey="fees"    name="Dispatch Fees" fill="#10b981" radius={[4,4,0,0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">No load data yet</div>
        )}
        <div className="flex items-center gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded bg-orange-500 inline-block" />Revenue</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />Dispatch Fees</span>
        </div>
      </div>

      {/* ── Top OOs + Aging AR ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Top OOs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-orange-400" />
            <p className="text-sm font-semibold text-gray-300">Top OOs by Revenue</p>
          </div>
          {topOOs?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topOOs} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<OOTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#f97316" radius={[0,4,4,0]} maxBarSize={20} />
                <Bar dataKey="fees"    name="Fees"    fill="#10b981" radius={[0,4,4,0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">No OO data yet</div>
          )}
        </div>

        {/* Aging AR */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <p className="text-sm font-semibold text-gray-300">Aging Accounts Receivable</p>
          </div>
          {totalAR > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={agingChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={46} />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
                          <p className="text-gray-400 font-semibold">{label}</p>
                          <p style={{ color: payload[0]?.payload?.color }}>
                            ${fmtFull(payload[0]?.value)} · {payload[0]?.payload?.count} inv
                          </p>
                        </div>
                      ) : null
                    }
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="amount" radius={[4,4,0,0]} maxBarSize={48}>
                    {agingChart.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Summary rows */}
              <div className="mt-3 space-y-1.5">
                {agingChart.filter((b: any) => b.amount > 0).map((b: any) => (
                  <div key={b.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: b.color }} />
                      <span className="text-gray-400">{b.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{b.count} inv</span>
                      <span className="text-white font-medium">${fmtFull(b.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">No open invoices</div>
          )}
        </div>
      </div>

      {/* ── Load Status Breakdown ────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-300 mb-4">Loads by Status — All Time</p>
        {loadsByStatus?.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {loadsByStatus
              .sort((a: any, b: any) => b.count - a.count)
              .map((s: any) => {
                const colors: Record<string, string> = {
                  available: 'bg-gray-700 text-gray-300',
                  rate_con: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  confirmed: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                  in_transit: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                  delivered: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                  pod_received: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                  invoiced: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                  paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  settled: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
                }
                const pct = ((s.count / (summary?.totalLoads || 1)) * 100).toFixed(0)
                return (
                  <div key={s.status} className={`rounded-lg border px-4 py-2.5 ${colors[s.status] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                    <p className="text-xs font-medium">{STATUS_LABELS[s.status] ?? s.status}</p>
                    <p className="text-xl font-bold">{s.count}</p>
                    <p className="text-xs opacity-60">{pct}% of total</p>
                  </div>
                )
              })}
          </div>
        ) : (
          <div className="h-20 flex items-center justify-center text-gray-600 text-sm">No loads yet</div>
        )}
      </div>

      {/* ── Pipeline (last 30d) ──────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-300 mb-4">30-Day Pipeline</p>
        <div className="flex items-center gap-1">
          {[
            { key: 'in_transit', label: 'In Transit', color: 'bg-yellow-500' },
            { key: 'delivered',  label: 'Delivered',  color: 'bg-orange-500' },
            { key: 'invoiced',   label: 'Invoiced',   color: 'bg-cyan-500'   },
            { key: 'paid',       label: 'Paid',        color: 'bg-emerald-500'},
          ].map((step, i) => {
            const count = pipeline?.[step.key] ?? 0
            return (
              <div key={step.key} className="flex items-center gap-1 flex-1">
                <div className={`flex-1 rounded-lg ${step.color}/10 border border-${step.color.replace('bg-','')}/20 px-3 py-3 text-center`}>
                  <p className="text-xs text-gray-500">{step.label}</p>
                  <p className={`text-2xl font-bold ${step.color.replace('bg-','text-')}`}>{count}</p>
                </div>
                {i < 3 && <span className="text-gray-700 text-lg">→</span>}
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-gray-700 text-center pb-2">
        Data pulled live from CargoFi Dispatch · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>
    </div>
  )
}
