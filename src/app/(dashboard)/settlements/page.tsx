'use client'
import { useState, useEffect, useCallback } from 'react'
import { DollarSign, FileText, CheckCircle, Printer, ChevronRight } from 'lucide-react'
import Link from 'next/link'

function fmt(n: number | string | null | undefined) {
  const v = parseFloat(String(n ?? 0)) || 0
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function SettlementsPage() {
  const [loads, setLoads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState<string | null>(null)

  const fetchLoads = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/loads?paid=true&settled=false')
    if (r.ok) setLoads(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchLoads() }, [fetchLoads])

  // Group by OO
  const byOO: Record<string, { oo: any; loads: any[] }> = {}
  for (const load of loads) {
    const ooId = load.owner_operator_id ?? '__no_oo__'
    if (!byOO[ooId]) byOO[ooId] = { oo: load.owner_operator, loads: [] }
    byOO[ooId].loads.push(load)
  }
  const groups = Object.values(byOO)

  async function markSettled(loadId: string) {
    setSettling(loadId)
    await fetch(`/api/loads/${loadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settled_ok: true }),
    })
    await fetchLoads()
    setSettling(null)
  }

  if (loading) {
    return (
      <div className="px-6 py-6 flex items-center gap-2 text-gray-500">
        <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        Loading settlements...
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-orange-400" />
          <h1 className="text-white font-semibold text-lg">Settlements</h1>
          <span className="text-xs text-gray-600 bg-gray-800 rounded-full px-2 py-0.5">{loads.length} pending</span>
        </div>
        <p className="text-xs text-gray-500">Loads marked <span className="text-emerald-400">Paid</span> — ready to settle with OO</p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-gray-600">
            <CheckCircle className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">All caught up</p>
            <p className="text-xs mt-1">No loads pending settlement. Mark loads as <strong className="text-emerald-400">Paid</strong> on the Kanban to see them here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(({ oo, loads: ooLoads }) => {
              const ooName = oo?.company_name || oo?.name || 'No OO assigned'
              const totalNet = ooLoads.reduce((s, l) => s + (parseFloat(l.oo_net) || 0), 0)
              return (
                <div key={oo?.id ?? 'none'} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  {/* OO Header */}
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-800/50 border-b border-gray-800">
                    <div>
                      <p className="text-white font-semibold">{ooName}</p>
                      {oo?.phone_whatsapp && <p className="text-xs text-gray-500">{oo.phone_whatsapp}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{ooLoads.length} load{ooLoads.length !== 1 ? 's' : ''}</p>
                      <p className="text-white font-bold">${fmt(totalNet)} net</p>
                    </div>
                  </div>

                  {/* Loads */}
                  <div className="divide-y divide-gray-800/60">
                    {ooLoads.map(load => {
                      const rate     = parseFloat(load.rate) || 0
                      const dspFee   = rate * (parseFloat(load.dispatch_fee_pct) || 0) / 100
                      const facFee   = rate * (parseFloat(load.factoring_fee_pct) || 0) / 100
                      const drvPay   = (load.load_drivers ?? []).reduce((s: number, d: any) => s + Number(d.total_pay || 0), 0)
                      const fuel     = parseFloat(load.fuel_cost) || 0
                      const deds     = (load.deductions ?? []).reduce((s: number, d: any) => s + Number(d.amount || 0), 0)
                      const ooNet    = rate - dspFee - facFee - drvPay - fuel - deds

                      return (
                        <div key={load.id} className="px-5 py-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-orange-400 font-semibold text-sm">{load.load_number}</span>
                                {load.work_order_number && <span className="text-xs text-gray-500">WO: {load.work_order_number}</span>}
                              </div>
                              <p className="text-gray-300 text-sm mt-0.5">{load.broker_name ?? '—'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/settlements/${load.id}`}
                                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors"
                              >
                                <Printer className="w-3.5 h-3.5" /> Preview / PDF
                              </Link>
                              <button
                                onClick={() => markSettled(load.id)}
                                disabled={settling === load.id}
                                className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                {settling === load.id ? 'Settling...' : 'Mark Settled'}
                              </button>
                            </div>
                          </div>

                          {/* Math breakdown */}
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
                            <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                              <p className="text-gray-500 mb-0.5">Gross Rate</p>
                              <p className="text-white font-semibold">${fmt(rate)}</p>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                              <p className="text-gray-500 mb-0.5">Dispatch ({load.dispatch_fee_pct ?? 13}%)</p>
                              <p className="text-orange-400 font-semibold">-${fmt(dspFee)}</p>
                            </div>
                            {facFee > 0 && (
                              <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                                <p className="text-gray-500 mb-0.5">Factoring ({load.factoring_fee_pct}%)</p>
                                <p className="text-red-400 font-semibold">-${fmt(facFee)}</p>
                              </div>
                            )}
                            {drvPay > 0 && (
                              <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                                <p className="text-gray-500 mb-0.5">Driver Pay</p>
                                <p className="text-red-400 font-semibold">-${fmt(drvPay)}</p>
                              </div>
                            )}
                            {fuel > 0 && (
                              <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                                <p className="text-gray-500 mb-0.5">Fuel</p>
                                <p className="text-red-400 font-semibold">-${fmt(fuel)}</p>
                              </div>
                            )}
                            {deds > 0 && (
                              <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                                <p className="text-gray-500 mb-0.5">Deductions</p>
                                <p className="text-red-400 font-semibold">-${fmt(deds)}</p>
                              </div>
                            )}
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                              <p className="text-gray-400 mb-0.5">OO Net</p>
                              <p className={`font-bold text-base ${ooNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>${fmt(ooNet)}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
