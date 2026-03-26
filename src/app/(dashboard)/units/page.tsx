'use client'

import { useState, useEffect } from 'react'
import { Container, Plus, Pencil, AlertTriangle, CheckCircle, XCircle, Truck } from 'lucide-react'
import UnitModal from '@/components/units/UnitModal'

interface Unit {
  id: string; unit_number: string; make?: string; model?: string; year?: number
  color?: string; vin?: string; license_plate?: string; license_state?: string
  status?: string; eld_device_id?: string; insurance_carrier?: string
  insurance_expiry?: string; registration_expiry?: string
  inspection_expiry?: string; cvsa_expiry?: string; notes?: string
  owner_operator?: { id: string; name: string }
}

const STATUS_COLORS: Record<string, string> = {
  available:   'bg-green-500/10 text-green-400',
  in_transit:  'bg-yellow-500/10 text-yellow-400',
  maintenance: 'bg-red-500/10 text-red-400',
  inactive:    'bg-gray-700 text-gray-500',
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Unit | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/units')
    if (res.ok) setUnits(await res.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function handleSaved(unit: Unit) {
    setUnits(prev => {
      const idx = prev.findIndex(u => u.id === unit.id)
      return idx >= 0 ? prev.map(u => u.id === unit.id ? unit : u) : [unit, ...prev]
    })
    setShowAdd(false); setEditing(null)
  }

  function expiryBadge(expiry?: string, label?: string) {
    if (!expiry) return null
    const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
    if (days < 0) return { icon: XCircle, cls: 'text-red-400', text: `${label} VENCIDO` }
    if (days < 30) return { icon: AlertTriangle, cls: 'text-yellow-400', text: `${label} — ${days}d` }
    if (days < 90) return { icon: CheckCircle, cls: 'text-green-400', text: `${label} — ${new Date(expiry).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` }
    return null
  }

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Container className="w-5 h-5 text-orange-400" />
          <h1 className="text-white font-semibold text-lg">Unidades</h1>
          <span className="text-xs text-gray-500 bg-gray-800 rounded-full px-2 py-0.5">{units.length}</span>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Agregar unidad
        </button>
      </div>

      {loading && <p className="text-gray-500 text-sm">Cargando...</p>}

      {!loading && units.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Truck className="w-12 h-12 text-gray-700 mb-3" />
          <p className="text-gray-400 font-medium">Sin unidades registradas</p>
          <p className="text-gray-600 text-sm mt-1">Agrega tu primer truck para empezar</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Agregar unidad
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {units.map(unit => {
          const alerts = [
            expiryBadge(unit.insurance_expiry, 'Seguro'),
            expiryBadge(unit.inspection_expiry, 'Inspección'),
            expiryBadge(unit.registration_expiry, 'Registro'),
            expiryBadge(unit.cvsa_expiry, 'CVSA'),
          ].filter(Boolean)

          return (
            <div key={unit.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold text-lg">#{unit.unit_number}</h3>
                    {unit.status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[unit.status] ?? STATUS_COLORS.inactive}`}>
                        {unit.status}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mt-0.5">
                    {[unit.year, unit.make, unit.model].filter(Boolean).join(' ')}
                    {unit.color && ` · ${unit.color}`}
                  </p>
                </div>
                <button onClick={() => setEditing(unit)}
                  className="text-gray-500 hover:text-white p-1 rounded transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* OO */}
              {unit.owner_operator && (
                <p className="text-xs text-gray-500 mb-2">OO: <span className="text-gray-300">{unit.owner_operator.name}</span></p>
              )}

              {/* Plates + VIN */}
              <div className="flex gap-2 mb-3 flex-wrap">
                {unit.license_plate && (
                  <span className="text-xs bg-gray-700/60 text-gray-300 rounded px-2 py-0.5">
                    🪪 {unit.license_plate}{unit.license_state && ` (${unit.license_state})`}
                  </span>
                )}
                {unit.eld_device_id && (
                  <span className="text-xs bg-gray-700/60 text-gray-400 rounded px-2 py-0.5">
                    ELD: {unit.eld_device_id}
                  </span>
                )}
              </div>

              {/* Alerts */}
              {alerts.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-gray-700">
                  {alerts.map((a, i) => {
                    const { icon: Icon, cls, text } = a!
                    return (
                      <div key={i} className={`flex items-center gap-1.5 text-xs ${cls}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {text}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showAdd && <UnitModal onClose={() => setShowAdd(false)} onSaved={handleSaved} />}
      {editing && <UnitModal unit={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
    </div>
  )
}
