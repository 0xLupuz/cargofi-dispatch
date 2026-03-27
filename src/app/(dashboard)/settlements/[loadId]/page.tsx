'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer, CheckCircle, Loader2, DollarSign } from 'lucide-react'
import Link from 'next/link'

function fmt(n: any) {
  const v = parseFloat(String(n ?? 0)) || 0
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SettlementDetailPage() {
  const { loadId } = useParams<{ loadId: string }>()
  const router = useRouter()
  const [load, setLoad] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)

  useEffect(() => {
    fetch(`/api/loads/${loadId}`)
      .then(r => r.json())
      .then(d => { setLoad(d); setLoading(false) })
  }, [loadId])

  async function markSettled() {
    setSettling(true)
    await fetch(`/api/loads/${loadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settled_ok: true }),
    })
    router.push('/settlements')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
    </div>
  )
  if (!load) return (
    <div className="px-6 py-6 text-gray-500">Load not found.</div>
  )

  const rate       = parseFloat(load.rate) || 0
  const dspPct     = parseFloat(load.dispatch_fee_pct) || 13
  const facPct     = parseFloat(load.factoring_fee_pct) || 0
  const dspFee     = rate * dspPct / 100
  const facFee     = rate * facPct / 100
  const drivers    = (load.load_drivers ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)
  const drvPay     = drivers.reduce((s: number, d: any) => s + Number(d.total_pay || 0), 0)
  const fuel       = parseFloat(load.fuel_cost) || 0
  const deds       = load.deductions ?? []
  const totalDeds  = deds.reduce((s: number, d: any) => s + Number(d.amount || 0), 0)
  const ooNet      = rate - dspFee - facFee - drvPay - fuel - totalDeds

  const oo = load.owner_operator
  const settlementDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const pickup = load.stops?.find((s: any) => s.stop_type === 'pickup')
  const delivery = load.stops?.find((s: any) => s.stop_type === 'delivery') ?? load.stops?.slice(-1)[0]

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar — hidden on print */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/settlements" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <DollarSign className="w-5 h-5 text-orange-400" />
          <h1 className="text-white font-semibold">Settlement — {load.load_number}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
          {!load.settled_ok && (
            <button
              onClick={markSettled}
              disabled={settling}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {settling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {settling ? 'Settling...' : 'Mark as Settled'}
            </button>
          )}
          {load.settled_ok && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> Settled
            </span>
          )}
        </div>
      </div>

      {/* Settlement document — printable */}
      <div className="flex-1 overflow-auto bg-gray-950 print:bg-white py-8 px-6">
        <div className="max-w-2xl mx-auto bg-gray-900 print:bg-white rounded-xl border border-gray-800 print:border-0 print:shadow-none overflow-hidden">

          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-800 print:border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white print:text-black">CargoFi</h1>
                <p className="text-sm text-gray-400 print:text-gray-600 mt-0.5">Settlement Statement</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 print:text-gray-500">Settlement Date</p>
                <p className="text-sm text-white print:text-black font-semibold">{settlementDate}</p>
                <p className="text-xs text-gray-500 print:text-gray-500 mt-1">Load #</p>
                <p className="text-sm font-mono font-bold text-orange-400 print:text-orange-600">{load.load_number}</p>
              </div>
            </div>
          </div>

          {/* OO Info */}
          <div className="px-8 py-5 border-b border-gray-800 print:border-gray-200">
            <p className="text-xs text-gray-500 print:text-gray-500 font-semibold uppercase tracking-wide mb-2">Owner Operator</p>
            <p className="text-white print:text-black font-semibold text-base">{oo?.company_name || oo?.name || '—'}</p>
            {oo?.name && oo?.company_name && <p className="text-sm text-gray-400 print:text-gray-600">{oo.name}</p>}
            {oo?.phone_whatsapp && <p className="text-sm text-gray-400 print:text-gray-600">{oo.phone_whatsapp}</p>}
          </div>

          {/* Load Details */}
          <div className="px-8 py-5 border-b border-gray-800 print:border-gray-200">
            <p className="text-xs text-gray-500 print:text-gray-500 font-semibold uppercase tracking-wide mb-3">Load Details</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400 print:text-gray-500">Broker / Customer</span>
                <span className="text-white print:text-black font-medium">{load.broker_name || '—'}</span>
              </div>
              {load.work_order_number && (
                <div className="flex justify-between">
                  <span className="text-gray-400 print:text-gray-500">Work Order #</span>
                  <span className="text-white print:text-black font-medium">{load.work_order_number}</span>
                </div>
              )}
              {load.bol_number && (
                <div className="flex justify-between">
                  <span className="text-gray-400 print:text-gray-500">BOL #</span>
                  <span className="text-white print:text-black font-medium">{load.bol_number}</span>
                </div>
              )}
              {pickup && (
                <div className="flex justify-between">
                  <span className="text-gray-400 print:text-gray-500">Origin</span>
                  <span className="text-white print:text-black font-medium">{pickup.city}, {pickup.state}</span>
                </div>
              )}
              {delivery && (
                <div className="flex justify-between">
                  <span className="text-gray-400 print:text-gray-500">Destination</span>
                  <span className="text-white print:text-black font-medium">{delivery.city}, {delivery.state}</span>
                </div>
              )}
              {load.total_miles && (
                <div className="flex justify-between">
                  <span className="text-gray-400 print:text-gray-500">Total Miles</span>
                  <span className="text-white print:text-black font-medium">{Number(load.total_miles).toLocaleString()} mi</span>
                </div>
              )}
              {load.pickup_date && (
                <div className="flex justify-between">
                  <span className="text-gray-400 print:text-gray-500">Pickup</span>
                  <span className="text-white print:text-black font-medium">{fmtDate(load.pickup_date)}</span>
                </div>
              )}
              {load.delivery_date && (
                <div className="flex justify-between">
                  <span className="text-gray-400 print:text-gray-500">Delivery</span>
                  <span className="text-white print:text-black font-medium">{fmtDate(load.delivery_date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pay Breakdown */}
          <div className="px-8 py-5 border-b border-gray-800 print:border-gray-200">
            <p className="text-xs text-gray-500 print:text-gray-500 font-semibold uppercase tracking-wide mb-4">Pay Breakdown</p>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300 print:text-gray-700">Gross Rate</span>
                <span className="text-white print:text-black font-semibold">${fmt(rate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 print:text-gray-600">Dispatch Fee ({dspPct}%)</span>
                <span className="text-red-400 print:text-red-600">- ${fmt(dspFee)}</span>
              </div>
              {facFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 print:text-gray-600">Factoring Fee ({facPct}%)</span>
                  <span className="text-red-400 print:text-red-600">- ${fmt(facFee)}</span>
                </div>
              )}
              {drivers.map((d: any) => (
                <div key={d.id} className="flex justify-between text-sm">
                  <span className="text-gray-400 print:text-gray-600">
                    Driver Pay — {d.driver_name}
                    <span className="text-gray-600 print:text-gray-400 ml-1">
                      ({Number(d.miles).toLocaleString()} mi × ${Number(d.rate_per_mile).toFixed(2)})
                    </span>
                  </span>
                  <span className="text-red-400 print:text-red-600">- ${fmt(d.total_pay)}</span>
                </div>
              ))}
              {fuel > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 print:text-gray-600">Fuel Cost</span>
                  <span className="text-red-400 print:text-red-600">- ${fmt(fuel)}</span>
                </div>
              )}
              {deds.map((d: any) => (
                <div key={d.id} className="flex justify-between text-sm">
                  <span className="text-gray-400 print:text-gray-600 capitalize">{d.description}</span>
                  <span className="text-red-400 print:text-red-600">- ${fmt(d.amount)}</span>
                </div>
              ))}
            </div>

            {/* Net Pay — highlighted */}
            <div className="mt-5 bg-emerald-500/10 print:bg-emerald-50 border border-emerald-500/30 print:border-emerald-200 rounded-xl px-5 py-4 flex justify-between items-center">
              <span className="text-emerald-300 print:text-emerald-800 font-bold text-base">NET PAY TO OO</span>
              <span className="text-emerald-400 print:text-emerald-700 font-bold text-2xl">${fmt(ooNet)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 text-center">
            <p className="text-xs text-gray-600 print:text-gray-400">
              This settlement statement was generated by CargoFi Dispatch on {settlementDate}.
              For questions, contact dispatch@cargofi.io
            </p>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          nav, aside, header[data-sidebar] { display: none !important; }
        }
      `}</style>
    </div>
  )
}
