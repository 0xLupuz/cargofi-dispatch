'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Truck, DollarSign, AlertCircle, TrendingUp, ArrowRight, RefreshCw } from 'lucide-react'

function fmt(n: any) { return (parseFloat(String(n ?? 0)) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d?: string | null) { if (!d) return '—'; return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  available:   { bg: 'bg-gray-700/60',       text: 'text-gray-300',   label: 'Available'  },
  rate_con:    { bg: 'bg-[#58a6ff]/15',        text: 'text-[#58a6ff]',   label: 'Rate Con'   },
  confirmed:   { bg: 'bg-indigo-500/15',      text: 'text-indigo-400', label: 'Confirmed'  },
  in_transit:  { bg: 'bg-yellow-500/15',      text: 'text-yellow-400', label: 'In Transit' },
  delivered:   { bg: 'bg-[rgba(58,182,144,0.15)]',      text: 'text-[#3ab690]', label: 'Delivered'  },
  pod_received:{ bg: 'bg-purple-500/15',      text: 'text-purple-400', label: 'POD Rcvd'  },
  invoiced:    { bg: 'bg-cyan-500/15',        text: 'text-cyan-400',   label: 'Invoiced'   },
  paid:        { bg: 'bg-emerald-500/15',     text: 'text-emerald-400',label: 'Paid'       },
  settled:     { bg: 'bg-teal-500/15',        text: 'text-teal-400',   label: 'Settled'    },
}

const PIPELINE = [
  { key: 'rate_con',   label: 'Rate Con'  },
  { key: 'confirmed',  label: 'Confirmed' },
  { key: 'in_transit', label: 'In Transit'},
  { key: 'delivered',  label: 'Delivered' },
  { key: 'invoiced',   label: 'Invoiced'  },
  { key: 'paid',       label: 'Paid'      },
]

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/dashboard')
    if (r.ok) setData(await r.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const now = new Date()
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-500 px-6 py-12 text-sm">
      <div className="w-4 h-4 rounded-full border-2 border-[#3ab690] border-t-transparent animate-spin" /> Loading...
    </div>
  )

  return (
    <div className="h-full overflow-auto px-6 py-6 space-y-6 w-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-[#3ab690]" />
          <h1 className="text-white font-semibold text-lg">Dashboard</h1>
          <span className="text-xs text-gray-500">{monthName}</span>
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-gray-400 hover:text-gray-200 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Loads',      value: data?.activeLoads ?? 0,             sub: 'confirmed + in transit',        icon: Truck,      color: 'text-[#3ab690]', border: 'border-[#3ab690]/20', bg: 'bg-[#3ab690]/5', fmt: false },
          { label: `Revenue ${now.toLocaleDateString('en-US',{month:'short'})}`,  value: data?.revenueThisMonth ?? 0,   sub: 'delivered + invoiced + paid',   icon: DollarSign, color: 'text-emerald-400',border: 'border-emerald-500/20',bg: 'bg-emerald-500/5', fmt: true  },
          { label: 'Overdue AR',        value: data?.overdueAR ?? 0,               sub: `${data?.overdueCount ?? 0} invoices overdue`, icon: AlertCircle, color: 'text-red-400',    border: 'border-red-500/20',    bg: 'bg-red-500/5',     fmt: true  },
          { label: 'Avg Rate / Load',   value: data?.avgRate ?? 0,                 sub: `${data?.totalLoads ?? 0} total loads`,        icon: TrendingUp,  color: 'text-[#58a6ff]',   border: 'border-[#58a6ff]/20',   bg: 'bg-[#58a6ff]/5',    fmt: true  },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border ${c.border} ${c.bg} px-4 py-3`}>
            <div className="flex items-center gap-1.5 mb-2">
              <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
              <p className="text-xs text-gray-500">{c.label}</p>
            </div>
            <p className={`text-2xl font-bold ${c.color}`}>
              {c.fmt ? `$${fmt(c.value)}` : c.value}
            </p>
            <p className="text-xs text-[#484f58] mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-5">
        <p className="text-sm font-semibold text-gray-300 mb-4">Load Pipeline</p>
        <div className="flex items-stretch gap-1.5 w-full overflow-x-auto pb-1">
          {PIPELINE.map((step, i) => {
            const count = data?.statusCounts?.[step.key] ?? 0
            const s = STATUS_STYLE[step.key]
            const borderMap: Record<string, string> = {
              'text-[#58a6ff]':    'border-[#58a6ff]/30',
              'text-indigo-400':  'border-indigo-500/30',
              'text-yellow-400':  'border-yellow-500/30',
              'text-[#3ab690]':  'border-[#3ab690]/30',
              'text-cyan-400':    'border-cyan-500/30',
              'text-emerald-400': 'border-emerald-500/30',
            }
            const borderColor = borderMap[s.text] ?? 'border-[#30363d]/40'
            return (
              <div key={step.key} className="flex items-center gap-1.5 flex-1 min-w-0">
                <button
                  onClick={() => router.push('/loads')}
                  className={`flex-1 rounded-xl ${s.bg} border ${borderColor} px-3 py-3 text-center hover:opacity-80 transition-opacity min-w-[70px]`}
                >
                  <p className={`text-[11px] font-medium ${s.text} whitespace-nowrap`}>{step.label}</p>
                  <p className={`text-xl font-bold ${s.text} mt-0.5`}>{count}</p>
                </button>
                {i < PIPELINE.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-[#30363d] flex-shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Loads */}
      <div className="bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#21262d]">
          <p className="text-sm font-semibold text-gray-300">Recent Loads</p>
          <button onClick={() => router.push('/loads')} className="text-xs text-[#3ab690] hover:text-[#72d2b3] transition-colors flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {data?.recentLoads?.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="border-b border-[#21262d]">
              <tr>
                {['Load #', 'Broker', 'OO', 'Pickup', 'Rate', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {data.recentLoads.map((l: any) => {
                const s = STATUS_STYLE[l.kanban_status] ?? STATUS_STYLE.available
                return (
                  <tr key={l.id} onClick={() => router.push('/loads')}
                    className="hover:bg-[#161b22]/40 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-[#3ab690] font-semibold text-xs">{l.load_number}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-[140px] truncate">{l.broker_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{(l.owner_operators as any)?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(l.pickup_date)}</td>
                    <td className="px-4 py-3 text-white font-medium">${fmt(l.rate)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${s.bg} ${s.text}`}>{s.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-10 text-center text-[#484f58] text-sm">
            No loads yet — <button onClick={() => router.push('/loads')} className="text-[#3ab690] hover:underline">create your first load</button>
          </div>
        )}
      </div>

      <p className="text-xs text-[#30363d] text-center pb-2">
        CargoFi Dispatch · Updated {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}
