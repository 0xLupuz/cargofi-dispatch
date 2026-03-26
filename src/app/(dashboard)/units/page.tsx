'use client'

import { useState, useEffect } from 'react'
import { Container, Plus, Pencil, AlertTriangle, CheckCircle, XCircle, Truck, Ban, Trash2 } from 'lucide-react'
import UnitModal from '@/components/units/UnitModal'

interface Unit {
  id: string; unit_number: string; make?: string; model?: string; year?: number
  color?: string; vin?: string
  license_plate?: string; license_state?: string
  license_plate_mx?: string; plate_expiry_us?: string; plate_expiry_mx?: string
  status?: string; eld_device_id?: string; insurance_carrier?: string
  insurance_expiry?: string; insurance_expiry_mx?: string
  registration_expiry?: string; inspection_expiry?: string; inspection_expiry_mx?: string
  cvsa_expiry?: string; laredo_tag?: string; transponder?: string
  blocked?: boolean; notes?: string
  owner_operator?: { id: string; name: string }
}

const STATUS_COLORS: Record<string, string> = {
  available:   'bg-green-500/10 text-green-400 border-green-500/20',
  in_transit:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  maintenance: 'bg-red-500/10 text-red-400 border-red-500/20',
  inactive:    'bg-gray-700 text-gray-500 border-gray-600',
}

function expiryIcon(expiry?: string) {
  if (!expiry) return null
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
  if (days < 0) return <span title="Vencido"><XCircle className="w-3.5 h-3.5 text-red-400" /></span>
  if (days < 30) return <span title={`${days}d restantes`}><AlertTriangle className="w-3.5 h-3.5 text-yellow-400" /></span>
  return <span title="Vigente"><CheckCircle className="w-3.5 h-3.5 text-green-400" /></span>
}

function fmtDate(d?: string) {
  if (!d) return <span className="text-gray-600">—</span>
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  const fmt = new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
  const cls = days < 0 ? 'text-red-400' : days < 30 ? 'text-yellow-400' : 'text-gray-300'
  return <span className={cls}>{fmt}</span>
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

  // Soft delete — tabla (oculta de la UI, mantiene historial)
  async function handleSoftDelete(unit: Unit) {
    if (!confirm(`¿Desactivar unidad #${unit.unit_number}?\n\nEl registro se conserva en la base de datos.`)) return
    const res = await fetch(`/api/units/${unit.id}`, { method: 'DELETE' })
    if (res.ok) setUnits(prev => prev.filter(u => u.id !== unit.id))
  }

  // Hard delete — modal de edición (borra TODO: registro + documentos + archivos)
  async function handleHardDelete(unit: Unit) {
    const confirmed = confirm(
      `⚠️ ELIMINAR PERMANENTEMENTE\n\nUnidad #${unit.unit_number}\n\nEsto borrará:\n• El registro completo de la unidad\n• Todos sus documentos y archivos\n\nEsta acción es IRREVERSIBLE.\n\n¿Continuar?`
    )
    if (!confirmed) return
    const res = await fetch(`/api/units/${unit.id}`, { method: 'POST' })
    if (res.ok) {
      setUnits(prev => prev.filter(u => u.id !== unit.id))
      setEditing(null)
    }
  }

  function handleSaved(unit: Unit) {
    setUnits(prev => {
      const idx = prev.findIndex(u => u.id === unit.id)
      return idx >= 0 ? prev.map(u => u.id === unit.id ? unit : u) : [unit, ...prev]
    })
    setShowAdd(false); setEditing(null)
  }

  return (
    <div className="px-6 py-6">
      {/* Header */}
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
          <button onClick={() => setShowAdd(true)} className="mt-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Agregar primera unidad
          </button>
        </div>
      )}

      {!loading && units.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/50">
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Unidad</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Carrier / OO</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Make / Model</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Placas USA</th>
                <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Placas MX</th>
                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Seg.</th>
                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Insp.</th>
                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">CVSA</th>
                <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit, i) => (
                <tr key={unit.id}
                  className={`border-b border-gray-800 hover:bg-gray-800/30 transition-colors ${unit.blocked ? 'opacity-60' : ''} ${i % 2 === 0 ? '' : 'bg-gray-800/10'}`}>
                  {/* Unit # */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {unit.blocked && <span title="Bloqueada"><Ban className="w-3.5 h-3.5 text-red-400 flex-shrink-0" /></span>}
                      <span className="text-white font-mono font-bold">{unit.unit_number}</span>
                    </div>
                    {unit.eld_device_id && <p className="text-xs text-gray-600 mt-0.5">ELD: {unit.eld_device_id}</p>}
                  </td>

                  {/* OO */}
                  <td className="px-4 py-3">
                    <p className="text-gray-300">{unit.owner_operator?.name ?? '—'}</p>
                  </td>

                  {/* Make/Model/Year */}
                  <td className="px-4 py-3">
                    <p className="text-gray-300">{[unit.make, unit.model].filter(Boolean).join(' ')}</p>
                    <p className="text-xs text-gray-500">{unit.year}</p>
                  </td>

                  {/* Plates USA */}
                  <td className="px-4 py-3">
                    <p className="text-gray-300 font-mono">{unit.license_plate ?? '—'}</p>
                    {unit.plate_expiry_us && <p className="text-xs">{fmtDate(unit.plate_expiry_us)}</p>}
                  </td>

                  {/* Plates MX */}
                  <td className="px-4 py-3">
                    <p className="text-gray-300 font-mono">{unit.license_plate_mx ?? '—'}</p>
                    {unit.plate_expiry_mx && <p className="text-xs">{fmtDate(unit.plate_expiry_mx)}</p>}
                  </td>

                  {/* Seguro */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {expiryIcon(unit.insurance_expiry)}
                      {expiryIcon(unit.insurance_expiry_mx)}
                    </div>
                  </td>

                  {/* Inspección */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {expiryIcon(unit.inspection_expiry)}
                      {expiryIcon(unit.inspection_expiry_mx)}
                    </div>
                  </td>

                  {/* CVSA */}
                  <td className="px-4 py-3 text-center">
                    {expiryIcon(unit.cvsa_expiry)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[unit.status ?? 'inactive']}`}>
                      {unit.status ?? 'inactive'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(unit)}
                        className="text-gray-500 hover:text-orange-400 p-1 rounded transition-colors" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleSoftDelete(unit)}
                        className="text-gray-600 hover:text-yellow-400 p-1 rounded transition-colors" title="Desactivar (soft delete)">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <UnitModal onClose={() => setShowAdd(false)} onSaved={handleSaved} />}
      {editing && <UnitModal unit={editing as any} onClose={() => setEditing(null)} onSaved={handleSaved} onDelete={handleHardDelete} />}
    </div>
  )
}
