'use client'
import { useState, useEffect } from 'react'
import { Fuel, RefreshCw, TrendingDown, TrendingUp, MapPin, ChevronDown } from 'lucide-react'

function fmt2(n: any) { return parseFloat(String(n ?? 0)).toFixed(2) }
function fmt1(n: any) { return parseFloat(String(n ?? 0)).toLocaleString('en-US', { maximumFractionDigits: 1 }) }

const QUARTERS = ['Q1 (Jan–Mar)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dec)']
const currentQ = Math.ceil((new Date().getMonth() + 1) / 3)
const currentY = new Date().getFullYear()

export default function IFTAPage() {
  const [quarter, setQuarter] = useState(currentQ)
  const [year, setYear]       = useState(currentY)
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [quarter, year])

  async function loadData() {
    setLoading(true)
    const r = await fetch(`/api/ifta?quarter=${quarter}&year=${year}`)
    if (r.ok) setData(await r.json())
    setLoading(false)
  }

  const states = data?.states ?? []
  const totals = data?.totals ?? {}
  const owedStates   = states.filter((s: any) => s.net_tax > 0)
  const creditStates = states.filter((s: any) => s.net_tax < 0)
  const netOwed      = totals.total_net_tax ?? 0

  return (
    <div className="h-full overflow-auto">
      <div className="px-6 py-5 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Fuel className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">IFTA</h1>
              <p className="text-xs text-gray-500">International Fuel Tax Agreement — Quarterly Report</p>
            </div>
          </div>
          {/* Period selector */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <select value={quarter} onChange={e => setQuarter(parseInt(e.target.value))}
                className="appearance-none bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-orange-500">
                {QUARTERS.map((q, i) => <option key={i+1} value={i+1}>{q}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={year} onChange={e => setYear(parseInt(e.target.value))}
                className="appearance-none bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-orange-500">
                {[currentY, currentY-1, currentY-2].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <button onClick={loadData} className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 py-10">
            <div className="w-4 h-4 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
            Calculating IFTA...
          </div>
        ) : states.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-10 text-gray-600">
              <Fuel className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium text-gray-400">No IFTA data for {QUARTERS[quarter-1]} {year}</p>
              <p className="text-xs mt-1 text-gray-600">Capture fuel purchases on each load to populate this report.</p>
            </div>
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 max-w-xl mx-auto">
              <p className="text-sm font-semibold text-yellow-300 mb-3">📋 How to populate IFTA data</p>
              <ol className="space-y-2 text-sm text-gray-400">
                <li><span className="text-yellow-400 font-semibold">1.</span> Open any load → click the <strong className="text-white">Fuel</strong> tab</li>
                <li><span className="text-yellow-400 font-semibold">2.</span> Add each fuel stop: state, gallons purchased, price/gallon</li>
                <li><span className="text-yellow-400 font-semibold">3.</span> State miles are auto-calculated via OpenRoute Service when the load has pickup/delivery stops</li>
                <li><span className="text-yellow-400 font-semibold">4.</span> IFTA report aggregates all loads in the quarter automatically</li>
              </ol>
              <p className="text-xs text-gray-600 mt-3">Miles per state: set automatically from route. Fuel per state: captured manually from fuel receipts.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Miles', value: fmt1(totals.total_miles), unit: 'mi', color: 'text-white' },
                { label: 'Total Gallons', value: fmt1(totals.total_gallons_purchased), unit: 'gal', color: 'text-yellow-400' },
                { label: 'Avg MPG', value: fmt2(totals.avg_mpg), unit: 'mpg', color: 'text-blue-400' },
                {
                  label: netOwed >= 0 ? 'Tax Owed' : 'Net Credit',
                  value: `$${Math.abs(netOwed).toFixed(2)}`,
                  unit: netOwed >= 0 ? 'due' : 'refund',
                  color: netOwed >= 0 ? 'text-red-400' : 'text-emerald-400',
                },
              ].map(s => (
                <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{s.unit}</p>
                </div>
              ))}
            </div>

            {/* Net tax summary */}
            {(owedStates.length > 0 || creditStates.length > 0) && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                {owedStates.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-red-400" />
                      <p className="text-sm font-semibold text-red-300">States — Tax Owed</p>
                    </div>
                    <div className="space-y-1.5">
                      {owedStates.map((s: any) => (
                        <div key={s.state} className="flex justify-between text-sm">
                          <span className="text-gray-400 font-mono font-semibold">{s.state}</span>
                          <span className="text-red-400 font-semibold">${fmt2(s.net_tax)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm pt-2 border-t border-red-500/20">
                        <span className="text-gray-300 font-semibold">Total owed</span>
                        <span className="text-red-400 font-bold">${fmt2(owedStates.reduce((s: number, r: any) => s + r.net_tax, 0))}</span>
                      </div>
                    </div>
                  </div>
                )}
                {creditStates.length > 0 && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-5 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown className="w-4 h-4 text-emerald-400" />
                      <p className="text-sm font-semibold text-emerald-300">States — Credit / Refund</p>
                    </div>
                    <div className="space-y-1.5">
                      {creditStates.map((s: any) => (
                        <div key={s.state} className="flex justify-between text-sm">
                          <span className="text-gray-400 font-mono font-semibold">{s.state}</span>
                          <span className="text-emerald-400 font-semibold">${fmt2(Math.abs(s.net_tax))}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm pt-2 border-t border-emerald-500/20">
                        <span className="text-gray-300 font-semibold">Total credit</span>
                        <span className="text-emerald-400 font-bold">${fmt2(Math.abs(creditStates.reduce((s: number, r: any) => s + r.net_tax, 0)))}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Full state table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <p className="text-sm font-semibold text-gray-300">State Breakdown</p>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800">
                  <tr>
                    {['State','Miles','Gal Purchased','Gal Consumed','Rate (¢/gal)','Tax Paid','Tax Owed','Net'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {states.map((s: any) => (
                    <tr key={s.state} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-white">{s.state}</td>
                      <td className="px-4 py-3 text-gray-300">{fmt1(s.miles)}</td>
                      <td className="px-4 py-3 text-gray-400">{s.gallons_purchased.toFixed(3)}</td>
                      <td className="px-4 py-3 text-gray-400">{s.gallons_consumed.toFixed(3)}</td>
                      <td className="px-4 py-3 text-gray-500">{(s.tax_rate_cents * 100).toFixed(1)}¢</td>
                      <td className="px-4 py-3 text-gray-400">${fmt2(s.tax_paid)}</td>
                      <td className="px-4 py-3 text-gray-400">${fmt2(s.tax_owed)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${s.net_tax > 0 ? 'text-red-400' : s.net_tax < 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                          {s.net_tax > 0 ? '+' : ''}{fmt2(s.net_tax)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-700">
                  <tr>
                    <td className="px-4 py-3 font-bold text-white">TOTAL</td>
                    <td className="px-4 py-3 font-bold text-white">{fmt1(totals.total_miles)}</td>
                    <td className="px-4 py-3 font-bold text-gray-300">{parseFloat(totals.total_gallons_purchased ?? 0).toFixed(3)}</td>
                    <td colSpan={3} />
                    <td colSpan={1} />
                    <td className="px-4 py-3">
                      <span className={`font-bold text-base ${netOwed > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {netOwed > 0 ? `Owe $${fmt2(netOwed)}` : `Credit $${fmt2(Math.abs(netOwed))}`}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="text-xs text-gray-700 mt-4 text-center">
              State miles calculated via OpenRoute Service (auto) · Tax rates updated Q1 2024 · Verify current rates at <span className="text-gray-500">iftach.org</span>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
