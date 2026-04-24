'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Truck, Plus, Pencil, Phone, AlertTriangle, CheckCircle, XCircle, BookOpen } from 'lucide-react'
import OOModal from '@/components/oos/OOModal'
import type { OwnerOperator } from '@/types'

export default function OwnerOperatorsPage() {
  const router = useRouter()
  const [oos, setOOs] = useState<OwnerOperator[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<OwnerOperator | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/owner-operators')
    if (res.ok) setOOs(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleSaved(oo: OwnerOperator) {
    setOOs(prev => {
      const idx = prev.findIndex(o => o.id === oo.id)
      return idx >= 0 ? prev.map(o => o.id === oo.id ? oo : o) : [oo, ...prev]
    })
    setShowAdd(false)
    setEditing(null)
  }

  function insuranceStatus(expiry?: string) {
    if (!expiry) return null
    const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
    if (days < 0) return { icon: XCircle, color: 'text-red-400', label: 'Expired' }
    if (days < 30) return { icon: AlertTriangle, color: 'text-yellow-400', label: `${days}d left` }
    return { icon: CheckCircle, color: 'text-green-400', label: new Date(expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  }

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-[#3ab690]" />
          <h1 className="text-white font-semibold text-lg">Owner Operators</h1>
          <span className="text-xs text-gray-500 bg-[#161b22] rounded-full px-2 py-0.5">{oos.length}</span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-[#3ab690] hover:bg-[#1a9d75] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add OO
        </button>
      </div>

      {/* Loading */}
      {loading && <div className="text-gray-500 text-sm">Loading...</div>}

      {/* Empty */}
      {!loading && oos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Truck className="w-12 h-12 text-[#30363d] mb-3" />
          <p className="text-gray-400 font-medium">No owner operators yet</p>
          <p className="text-[#484f58] text-sm mt-1">Add your first OO to start dispatching</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-4 bg-[#3ab690] hover:bg-[#1a9d75] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Add first OO
          </button>
        </div>
      )}

      {/* Grid */}
      {!loading && oos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {oos.map(oo => {
            const ins = insuranceStatus(oo.insurance_expiry ?? undefined)
            return (
              <div key={oo.id} className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 hover:border-gray-600 transition-colors">
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold">{oo.name}</h3>
                    {oo.company_name && (
                      <p className="text-gray-400 text-xs mt-0.5">{oo.company_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#3ab690] text-sm font-bold">{oo.dispatch_fee_pct}%</span>
                    <button onClick={() => setEditing(oo)}
                      className="text-gray-500 hover:text-white p-1 rounded transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Phone */}
                <a href={`https://wa.me/${oo.phone_whatsapp.replace(/\D/g,'')}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-green-400 transition-colors mb-3">
                  <Phone className="w-3.5 h-3.5" />
                  {oo.phone_whatsapp}
                </a>

                {/* MC / DOT */}
                <div className="flex gap-3 mb-3">
                  {oo.mc_number && (
                    <span className="text-xs text-gray-500 bg-gray-700/50 rounded px-2 py-0.5">MC {oo.mc_number}</span>
                  )}
                  {oo.dot_number && (
                    <span className="text-xs text-gray-500 bg-gray-700/50 rounded px-2 py-0.5">DOT {oo.dot_number}</span>
                  )}
                </div>

                {/* Insurance */}
                {ins && (() => { const Icon = ins.icon; return (
                  <div className={`flex items-center gap-1.5 text-xs ${ins.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                    Insurance: {ins.label}
                  </div>
                )})()}

                {/* Compliance dots + Ledger */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#30363d]">
                  <div className="flex gap-2">
                    {[
                      ['cdl_verified', 'CDL'],
                      ['psp_cleared', 'PSP'],
                      ['mvr_cleared', 'MVR'],
                      ['clearinghouse_ok', 'CH'],
                    ].map(([key, label]) => (
                      <span key={key}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          (oo as any)[key]
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-gray-700 text-gray-500'
                        }`}>
                        {label}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => router.push(`/owner-operators/${oo.id}`)}
                    className="flex items-center gap-1 text-xs text-[#3ab690] hover:text-[#72d2b3] transition-colors">
                    <BookOpen className="w-3.5 h-3.5" /> Ledger
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showAdd && <OOModal onClose={() => setShowAdd(false)} onSaved={handleSaved} />}
      {editing && <OOModal oo={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
    </div>
  )
}
