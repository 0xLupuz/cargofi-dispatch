'use client'
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

const inp = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors'
const lbl = 'block text-xs text-gray-400 mb-1'
const sel = inp + ' cursor-pointer'

const TYPES = ['53\' Van','48\' Van','Flatbed','Reefer','Dry Van','Bobtail','Step Deck','RGN','Other']
const SUSPENSIONS = ['Air Ride','Spring','Other']

interface Props {
  trailer?: any
  onClose: () => void
  onSaved: () => void
}

export default function TrailerModal({ trailer, onClose, onSaved }: Props) {
  const isEdit = !!trailer
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState('')

  async function handleDelete() {
    if (!confirm(`¿Eliminar trailer #${trailer?.trailer_number}?`)) return
    setDeleting(true)
    const res = await fetch(`/api/trailers/${trailer!.id}`, { method: 'DELETE' })
    if (res.ok) { onClose(); window.location.reload() }
    else { const d = await res.json(); setError(d.error ?? 'Error al eliminar'); setDeleting(false) }
  }

  const [form, setForm] = useState({
    trailer_number:     trailer?.trailer_number     ?? '',
    make:               trailer?.make               ?? '',
    model:              trailer?.model              ?? '',
    year:               trailer?.year               ?? '',
    vin:                trailer?.vin                ?? '',
    gps_serial:         trailer?.gps_serial         ?? '',
    trailer_type:       trailer?.trailer_type       ?? "53' Van",
    suspension:         trailer?.suspension         ?? 'Air Ride',
    license_plate:      trailer?.license_plate      ?? '',
    plate_country:      trailer?.plate_country      ?? 'United States',
    plate_state:        trailer?.plate_state        ?? '',
    plate_expiry:       trailer?.plate_expiry       ?? '',
    plate_never_expire: trailer?.plate_never_expire ?? false,
    inspection_expiry:  trailer?.inspection_expiry  ?? '',
    lease_expiry:       trailer?.lease_expiry       ?? '',
    bond_expiry:        trailer?.bond_expiry        ?? '',
    company_owned:      trailer?.company_owned      ?? true,
    carrier:            trailer?.carrier            ?? 'CargoFi',
    notes:              trailer?.notes              ?? '',
    active:             trailer?.active             ?? true,
    inactive_since:     trailer?.inactive_since     ?? '',
  })

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const payload: any = { ...form }
    if (payload.year) payload.year = parseInt(payload.year)
    else payload.year = null
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    payload.plate_never_expire = form.plate_never_expire
    payload.company_owned = form.company_owned
    payload.active = form.active

    const url  = isEdit ? `/api/trailers/${trailer.id}` : '/api/trailers'
    const meth = isEdit ? 'PATCH' : 'POST'
    const res  = await fetch(url, { method: meth, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { onSaved(); onClose() }
    else { const e = await res.json(); setError(e.error ?? 'Error') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-white font-semibold">{isEdit ? `Edit Trailer #${trailer.trailer_number}` : 'New Trailer'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-white" /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-3 gap-4">
            <div><label className={lbl}>Trailer # *</label><input className={inp} value={form.trailer_number} onChange={e => set('trailer_number', e.target.value)} required /></div>
            <div><label className={lbl}>Make</label><input className={inp} placeholder="Great Dane, Wabash..." value={form.make} onChange={e => set('make', e.target.value)} /></div>
            <div><label className={lbl}>Model</label><input className={inp} value={form.model} onChange={e => set('model', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={lbl}>Year</label><input className={inp} type="number" placeholder="2023" value={form.year} onChange={e => set('year', e.target.value)} /></div>
            <div><label className={lbl}>VIN</label><input className={inp} value={form.vin} onChange={e => set('vin', e.target.value.toUpperCase())} /></div>
            <div><label className={lbl}>GPS Serial</label><input className={inp} value={form.gps_serial} onChange={e => set('gps_serial', e.target.value)} /></div>
          </div>

          {/* Type + Suspension */}
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Type *</label>
              <select className={sel} value={form.trailer_type} onChange={e => set('trailer_type', e.target.value)}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Suspension</label>
              <select className={sel} value={form.suspension} onChange={e => set('suspension', e.target.value)}>
                {SUSPENSIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Plates */}
          <div className="p-4 bg-gray-800/40 rounded-lg space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Plates</p>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={lbl}>License Plate</label><input className={inp} value={form.license_plate} onChange={e => set('license_plate', e.target.value.toUpperCase())} /></div>
              <div><label className={lbl}>Country</label><input className={inp} value={form.plate_country} onChange={e => set('plate_country', e.target.value)} /></div>
              <div><label className={lbl}>State</label><input className={inp} value={form.plate_state} onChange={e => set('plate_state', e.target.value.toUpperCase())} maxLength={2} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Plate Expiry</label>
                <input className={inp} type="date" value={form.plate_expiry} onChange={e => set('plate_expiry', e.target.value)} disabled={form.plate_never_expire} />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.plate_never_expire} onChange={e => set('plate_never_expire', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                  <span className="text-sm text-gray-400">Never Expire</span>
                </label>
              </div>
            </div>
          </div>

          {/* Expiry dates */}
          <div className="p-4 bg-gray-800/40 rounded-lg space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Expiry Dates</p>
            <div className="grid grid-cols-3 gap-3">
              <div><label className={lbl}>Inspection</label><input className={inp} type="date" value={form.inspection_expiry} onChange={e => set('inspection_expiry', e.target.value)} /></div>
              <div><label className={lbl}>Lease</label><input className={inp} type="date" value={form.lease_expiry} onChange={e => set('lease_expiry', e.target.value)} /></div>
              <div><label className={lbl}>Bond</label><input className={inp} type="date" value={form.bond_expiry} onChange={e => set('bond_expiry', e.target.value)} /></div>
            </div>
          </div>

          {/* Ownership + Carrier */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Carrier</label>
              <input className={inp} value={form.carrier} onChange={e => set('carrier', e.target.value)} />
            </div>
            <div className="flex items-end pb-2 gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.company_owned} onChange={e => set('company_owned', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span className="text-sm text-gray-300">Company Owned</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span className="text-sm text-gray-300">Active</span>
              </label>
            </div>
          </div>

          {!form.active && (
            <div><label className={lbl}>Inactive Since</label><input className={inp} type="date" value={form.inactive_since} onChange={e => set('inactive_since', e.target.value)} /></div>
          )}

          <div><label className={lbl}>Notes</label><textarea className={inp} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>

          {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">⚠️ {error}</p>}

          <div className="flex gap-3 pt-2">
            {isEdit && (
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg px-3 py-2.5 text-sm transition-colors disabled:opacity-50">
                {deleting ? '...' : 'Eliminar'}
              </button>
            )}
            <button type="button" onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isEdit ? 'Save Changes' : 'Add Trailer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
