'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronRight, DollarSign } from 'lucide-react'
import type { Load } from '@/types'

const TRIP_LABELS: Record<string, string> = {
  open:       'Open',
  in_transit: 'In Transit',
  delivered:  'Delivered',
}

const TRIP_COLORS: Record<string, string> = {
  open:       'bg-blue-500/10 text-blue-400',
  in_transit: 'bg-amber-500/10 text-amber-400',
  delivered:  'bg-emerald-500/10 text-emerald-400',
}

interface Props {
  onCardClick: (load: Load) => void
}

export default function LoadsHistory({ onCardClick }: Props) {
  const [loads, setLoads] = useState<Load[]>([])
  const [fetching, setFetching] = useState(true)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const fetchLoads = useCallback(async () => {
    setFetching(true)
    const url = `/api/loads?history=1${debouncedQuery ? `&q=${encodeURIComponent(debouncedQuery)}` : ''}`
    const res = await fetch(url)
    if (res.ok) setLoads(await res.json())
    setFetching(false)
  }, [debouncedQuery])

  useEffect(() => { fetchLoads() }, [fetchLoads])

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-6 py-3 border-b border-gray-800 flex-shrink-0">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Load #, Work Order #, broker, BOL..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {fetching ? (
          <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
            Loading...
          </div>
        ) : loads.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
            {debouncedQuery ? 'No results found' : 'No loads yet'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-950 border-b border-gray-800 z-10">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Load #</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-3">WO #</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-3">Route</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-3">Broker</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-3">OO</th>
                <th className="text-right text-xs font-medium text-gray-500 px-3 py-3">Rate</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-3">Checklist</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-3">Pickup</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loads.map(load => {
                const origin = load.stops?.find(s => s.stop_type === 'pickup')
                const dest   = load.stops?.find(s => s.stop_type === 'delivery')
                const done   = [load.rate_con_ok, load.pod_ok, load.invoiced_ok, load.paid_ok, load.settled_ok]
                const doneCount = done.filter(Boolean).length

                return (
                  <tr
                    key={load.id}
                    onClick={() => onCardClick(load)}
                    className="hover:bg-gray-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-3">
                      <span className="font-mono text-orange-400 font-medium">{load.load_number}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-400">{load.work_order_number ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-300">
                      {origin && dest ? (
                        <span>
                          {origin.city}, {origin.state}
                          <span className="text-gray-600 mx-1">→</span>
                          {dest.city}, {dest.state}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-400 max-w-[120px] truncate">{load.broker_name}</td>
                    <td className="px-3 py-3 text-gray-400 max-w-[120px] truncate">
                      {load.owner_operator?.name ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="flex items-center justify-end gap-0.5 text-white font-semibold">
                        <DollarSign className="w-3 h-3 text-green-400" />
                        {load.rate.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {load.archived_at ? (
                        <span className="text-xs bg-gray-700/60 text-gray-400 rounded-full px-2 py-0.5">Archived</span>
                      ) : (
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${TRIP_COLORS[load.trip_status] ?? ''}`}>
                          {TRIP_LABELS[load.trip_status] ?? load.trip_status}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {['rate_con_ok','pod_ok','invoiced_ok','paid_ok','settled_ok'].map(f => (
                          <span
                            key={f}
                            className={`w-1.5 h-1.5 rounded-full ${
                              (load as any)[f] ? 'bg-emerald-400' : 'bg-gray-700'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-gray-600 ml-1">{doneCount}/5</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">
                      {load.pickup_date
                        ? new Date(load.pickup_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-600 group-hover:text-gray-400 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      {!fetching && loads.length > 0 && (
        <div className="px-6 py-2 border-t border-gray-800 text-xs text-gray-600 flex-shrink-0">
          {loads.length} load{loads.length !== 1 ? 's' : ''}
          {debouncedQuery ? ` matching "${debouncedQuery}"` : ' total'}
        </div>
      )}
    </div>
  )
}
