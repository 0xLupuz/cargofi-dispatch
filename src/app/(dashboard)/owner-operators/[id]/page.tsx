'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Users, Phone, Printer, DollarSign, Truck, TrendingUp } from 'lucide-react'

function fmt(n: any) { return (parseFloat(String(n ?? 0)) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d?: string | null) { if (!d) return '—'; return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

const STATUS_LABEL: Record<string, string> = {
  available:'Available', rate_con:'Rate Con', confirmed:'Confirmed', in_transit:'In Transit',
  delivered:'Delivered', pod_received:'POD Rcvd', invoiced:'Invoiced', paid:'Paid', settled:'Settled',
}

export default function OOLedgerPage() {
  const { id } = useParams() as { id: string }
  const router  = useRouter()
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/owner-operators/${id}/ledger`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [id])

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-500 px-6 py-12 text-sm">
      <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" /> Loading...
    </div>
  )
  if (!data?.oo) return <div className="px-6 py-8 text-gray-500">OO not found</div>

  const { oo, loads, totals } = data

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { padding: 0 !important; }
          body { background: white !important; color: black !important; }
          table { font-size: 11px; }
          th, td { border: 1px solid #ccc; padding: 4px 8px; color: black !important; background: white !important; }
          th { background: #f3f4f6 !important; }
        }
      `}</style>

      <div className="h-full overflow-auto px-6 py-6 max-w-6xl print-area">

        {/* Header */}
        <div className="no-print flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/owner-operators')} className="text-gray-500 hover:text-gray-300 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Users className="w-5 h-5 text-orange-400" />
            <div>
              <h1 className="text-white font-semibold text-lg">{oo.name}</h1>
              {oo.company_name && <p className="text-xs text-gray-500">{oo.company_name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {oo.phone_whatsapp && (
              <a href={`https://wa.me/${oo.phone_whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-sm text-green-400 border border-green-500/20 rounded-lg px-3 py-2 hover:bg-green-500/10 transition-colors">
                <Phone className="w-4 h-4" /> {oo.phone_whatsapp}
              </a>
            )}
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 text-sm border border-gray-700 text-gray-300 rounded-lg px-3 py-2 hover:border-gray-500 transition-colors">
              <Printer className="w-4 h-4" /> Print Statement
            </button>
          </div>
        </div>

        {/* Print header (only shows when printing) */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">{oo.name} — Account Statement</h1>
          {oo.company_name && <p>{oo.company_name}</p>}
          <p className="text-sm text-gray-500">Generated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>

        {/* Summary cards */}
        <div className="no-print grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Loads',    value: loads.length,              suffix: '',    icon: Truck,       color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/5', currency: false },
            { label: 'Total Gross',    value: totals.gross,              suffix: '',    icon: DollarSign,  color: 'text-blue-400',   border: 'border-blue-500/20',   bg: 'bg-blue-500/5',   currency: true  },
            { label: 'Dispatch Fees',  value: totals.dispFee,            suffix: '',    icon: TrendingUp,  color: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'bg-yellow-500/5', currency: true  },
            { label: 'OO Net Total',   value: totals.ooNet,              suffix: '',    icon: DollarSign,  color: totals.ooNet >= 0 ? 'text-emerald-400' : 'text-red-400', border: totals.ooNet >= 0 ? 'border-emerald-500/20' : 'border-red-500/20', bg: totals.ooNet >= 0 ? 'bg-emerald-500/5' : 'bg-red-500/5', currency: true },
          ].map(c => (
            <div key={c.label} className={`rounded-xl border ${c.border} ${c.bg} px-4 py-3`}>
              <div className="flex items-center gap-1.5 mb-2">
                <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
                <p className="text-xs text-gray-500">{c.label}</p>
              </div>
              <p className={`text-2xl font-bold ${c.color}`}>{c.currency ? `$${fmt(c.value)}` : c.value}</p>
            </div>
          ))}
        </div>

        {/* Loads table */}
        {loads.length === 0 ? (
          <div className="text-center py-16 text-gray-600 text-sm">No loads for this OO yet</div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800">
                  <tr>
                    {['Date', 'Load #', 'Broker', 'Status', 'Gross', 'Disp Fee', 'Fuel', 'Driver Pay', 'Other Deds', 'OO Net', 'Balance'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-500 px-3 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {loads.map((l: any) => (
                    <tr key={l.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{fmtDate(l.pickup_date)}</td>
                      <td className="px-3 py-2.5 font-mono text-orange-400 text-xs font-semibold whitespace-nowrap">{l.load_number}</td>
                      <td className="px-3 py-2.5 text-gray-300 max-w-[120px] truncate text-xs">{l.broker_name}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-gray-500">{STATUS_LABEL[l.kanban_status] ?? l.kanban_status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-white font-medium text-xs">${fmt(l._gross)}</td>
                      <td className="px-3 py-2.5 text-yellow-400 text-xs">-${fmt(l._dispFee)}</td>
                      <td className="px-3 py-2.5 text-red-400 text-xs">{l._fuel > 0 ? `-$${fmt(l._fuel)}` : '—'}</td>
                      <td className="px-3 py-2.5 text-red-400 text-xs">{l._driverPay > 0 ? `-$${fmt(l._driverPay)}` : '—'}</td>
                      <td className="px-3 py-2.5 text-red-400 text-xs">{l._otherDeds > 0 ? `-$${fmt(l._otherDeds)}` : '—'}</td>
                      <td className="px-3 py-2.5 font-semibold text-xs">
                        <span className={l._ooNet >= 0 ? 'text-emerald-400' : 'text-red-400'}>${fmt(l._ooNet)}</span>
                      </td>
                      <td className="px-3 py-2.5 font-bold text-xs">
                        <span className={l._runningBalance >= 0 ? 'text-emerald-300' : 'text-red-400'}>${fmt(l._runningBalance)}</span>
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="border-t-2 border-gray-700 bg-gray-800/50">
                    <td colSpan={4} className="px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">TOTALS ({loads.length} loads)</td>
                    <td className="px-3 py-3 text-white font-bold text-xs">${fmt(totals.gross)}</td>
                    <td className="px-3 py-3 text-yellow-400 font-bold text-xs">-${fmt(totals.dispFee)}</td>
                    <td className="px-3 py-3 text-red-400 font-bold text-xs">{totals.fuel > 0 ? `-$${fmt(totals.fuel)}` : '—'}</td>
                    <td className="px-3 py-3 text-red-400 font-bold text-xs">{totals.driverPay > 0 ? `-$${fmt(totals.driverPay)}` : '—'}</td>
                    <td className="px-3 py-3 text-red-400 font-bold text-xs">{totals.otherDeds > 0 ? `-$${fmt(totals.otherDeds)}` : '—'}</td>
                    <td className="px-3 py-3 font-bold text-xs">
                      <span className={totals.ooNet >= 0 ? 'text-emerald-400' : 'text-red-400'}>${fmt(totals.ooNet)}</span>
                    </td>
                    <td className="px-3 py-3 font-bold text-xs">
                      <span className={totals.ooNet >= 0 ? 'text-emerald-300' : 'text-red-400'}>${fmt(totals.ooNet)}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="no-print text-xs text-gray-700 text-center mt-6 pb-2">
          Dispatch fee: {oo.dispatch_fee_pct ?? 13}% · {oo.mc_number ? `MC: ${oo.mc_number}` : 'MC not set'}
        </p>
      </div>
    </>
  )
}
