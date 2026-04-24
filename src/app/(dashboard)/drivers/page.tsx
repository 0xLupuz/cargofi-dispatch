'use client'

import { useState, useEffect } from 'react'
import { UserCheck, Plus, Pencil, Phone, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import DriverModal from '@/components/drivers/DriverModal'
import type { Driver } from '@/types'

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/drivers')
    if (res.ok) setDrivers(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleSaved(driver: Driver) {
    setDrivers(prev => {
      const idx = prev.findIndex(d => d.id === driver.id)
      return idx >= 0 ? prev.map(d => d.id === driver.id ? driver : d) : [driver, ...prev]
    })
    setShowAdd(false)
    setEditing(null)
  }

  function expiryStatus(expiry?: string | null, label = '') {
    if (!expiry) return null
    const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
    if (days < 0) return { color: 'text-red-400', icon: XCircle, label: `${label} expired` }
    if (days < 30) return { color: 'text-yellow-400', icon: AlertTriangle, label: `${label} — ${days}d` }
    return { color: 'text-green-400', icon: CheckCircle, label: `${label} — ${new Date(expiry).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` }
  }

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-[#3ab690]" />
          <h1 className="text-white font-semibold text-lg">Drivers</h1>
          <span className="text-xs text-gray-500 bg-[#161b22] rounded-full px-2 py-0.5">{drivers.length}</span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-[#3ab690] hover:bg-[#1a9d75] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Driver
        </button>
      </div>

      {loading && <div className="text-gray-500 text-sm">Loading...</div>}

      {!loading && drivers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <UserCheck className="w-12 h-12 text-[#30363d] mb-3" />
          <p className="text-gray-400 font-medium">No drivers yet</p>
          <p className="text-[#484f58] text-sm mt-1">Add drivers to assign them to loads</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-4 bg-[#3ab690] hover:bg-[#1a9d75] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Add first driver
          </button>
        </div>
      )}

      {!loading && drivers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {drivers.map(driver => {
            const cdl = expiryStatus(driver.cdl_expiry, 'CDL')
            const med = expiryStatus(driver.medical_card_expiry, 'Medical')
            return (
              <div key={driver.id} className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 hover:border-gray-600 transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold">{driver.name}</h3>
                    {(driver as any).owner_operator?.name && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        OO: {(driver as any).owner_operator.name}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setEditing(driver)}
                    className="text-gray-500 hover:text-white p-1 rounded transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Phone */}
                <a href={`https://wa.me/${driver.phone_whatsapp.replace(/\D/g,'')}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-green-400 transition-colors mb-3">
                  <Phone className="w-3.5 h-3.5" />
                  {driver.phone_whatsapp}
                </a>

                {/* CDL */}
                {driver.cdl_number && (
                  <div className="flex gap-2 mb-3">
                    <span className="text-xs text-gray-500 bg-gray-700/50 rounded px-2 py-0.5">
                      CDL {driver.cdl_number} {driver.cdl_state && `(${driver.cdl_state})`}
                    </span>
                  </div>
                )}

                {/* Expiry alerts */}
                <div className="space-y-1">
                  {cdl && (() => { const Icon = cdl.icon; return (
                    <div className={`flex items-center gap-1.5 text-xs ${cdl.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {cdl.label}
                    </div>
                  )})()}
                  {med && (() => { const Icon = med.icon; return (
                    <div className={`flex items-center gap-1.5 text-xs ${med.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {med.label}
                    </div>
                  )})()}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && <DriverModal onClose={() => setShowAdd(false)} onSaved={handleSaved} />}
      {editing && <DriverModal driver={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
    </div>
  )
}
