'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { Field, inputCls, selectCls } from '@/components/ui/Field'
import DocUploader from '@/components/ui/DocUploader'
import type { OwnerOperator } from '@/types'

const UNIT_DOCS = [
  { value: 'inspection_us',       label: 'Inspección Anual USA' },
  { value: 'inspection_mx',       label: 'Inspección MX / Físico-Mecánica' },
  { value: 'cab_card',            label: 'Cab Card' },
  { value: 'insurance_us',        label: 'Seguro USA' },
  { value: 'insurance_mx',        label: 'Póliza Seguro MX' },
  { value: 'registration_us',     label: 'Registration / Title USA' },
  { value: 'tarjeta_circulacion', label: 'Tarjeta de Circulación MX' },
  { value: 'cvsa',                label: 'CVSA Sticker' },
  { value: 'photo',               label: 'Foto del Truck / Placas' },
  { value: 'other',               label: 'Otro' },
]

interface Unit {
  id: string
  unit_number: string
  owner_operator_id?: string
  make?: string; model?: string; year?: number; color?: string; vin?: string
  license_plate?: string; license_state?: string
  license_plate_mx?: string; license_state_mx?: string
  plate_expiry_us?: string; plate_expiry_mx?: string
  eld_device_id?: string; status?: string
  insurance_carrier?: string
  insurance_expiry?: string; insurance_expiry_mx?: string
  registration_expiry?: string
  inspection_expiry?: string; inspection_expiry_mx?: string
  cvsa_expiry?: string
  laredo_tag?: string; transponder?: string
  blocked?: boolean; notes?: string
}

interface Props {
  unit?: Unit
  onClose: () => void
  onSaved: (unit: Unit) => void
}

export default function UnitModal({ unit, onClose, onSaved }: Props) {
  const isEdit = !!unit
  const [oos, setOOs] = useState<OwnerOperator[]>([])
  const [tab, setTab] = useState<'info' | 'docs'>('info')
  const [form, setForm] = useState<Partial<Unit>>(unit ?? {
    unit_number: '', make: '', model: '', year: undefined,
    vin: '', license_plate: '', license_state: '', color: '',
    license_plate_mx: '', license_state_mx: '',
    plate_expiry_us: '', plate_expiry_mx: '',
    eld_device_id: '', status: 'available', owner_operator_id: '',
    insurance_carrier: '', insurance_expiry: '', insurance_expiry_mx: '',
    registration_expiry: '', inspection_expiry: '', inspection_expiry_mx: '',
    cvsa_expiry: '', laredo_tag: '', transponder: '',
    blocked: false, notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    fetch('/api/owner-operators').then(r => r.json()).then(setOOs)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.unit_number?.trim()) { setError('El número de unidad es obligatorio'); return }
    setLoading(true)
    setError('')

    // Convert all empty strings to null (prevents DB type errors on date/text fields)
    const payload: Record<string, any> = { ...form }
    Object.keys(payload).forEach(k => {
      if (payload[k] === '') payload[k] = null
    })
    payload.year = payload.year ? Number(payload.year) : null

    try {
      const res = isEdit
        ? await fetch(`/api/units/${unit.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/units', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

      if (res.ok) {
        onSaved(await res.json())
      } else {
        const err = await res.json()
        setError(err.error ?? `Error ${res.status}`)
      }
    } catch (e: any) {
      setError(e.message ?? 'Error de red')
    }
    setLoading(false)
  }

  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`

  return (
    <Modal title={isEdit ? `Unidad ${unit.unit_number}` : 'Nueva Unidad'} onClose={onClose} width="max-w-2xl">
      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button type="button" className={tabCls('info')} onClick={() => setTab('info')}>Información</button>
        {isEdit && <button type="button" className={tabCls('docs')} onClick={() => setTab('docs')}>Documentos</button>}
      </div>

      {/* INFO TAB */}
      {tab === 'info' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Field label="# Unidad" required>
              <input className={inputCls} value={form.unit_number ?? ''} onChange={e => { set('unit_number', e.target.value); setError('') }} placeholder="259136" />
            </Field>
            <Field label="Status">
              <select className={selectCls} value={form.status ?? 'available'} onChange={e => set('status', e.target.value)}>
                <option value="available">Available</option>
                <option value="in_transit">In Transit</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <Field label="Owner Operator">
              <select className={selectCls} value={form.owner_operator_id ?? ''} onChange={e => set('owner_operator_id', e.target.value)}>
                <option value="">Sin asignar</option>
                {oos.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Field label="Marca">
              <input className={inputCls} value={form.make ?? ''} onChange={e => set('make', e.target.value)} placeholder="Kenworth" />
            </Field>
            <Field label="Modelo">
              <input className={inputCls} value={form.model ?? ''} onChange={e => set('model', e.target.value)} placeholder="T680" />
            </Field>
            <Field label="Año">
              <input className={inputCls} type="number" value={form.year ?? ''} onChange={e => set('year', e.target.value)} placeholder="2022" min={1990} max={2030} />
            </Field>
            <Field label="Color">
              <input className={inputCls} value={form.color ?? ''} onChange={e => set('color', e.target.value)} placeholder="Blanco" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="VIN">
              <input className={inputCls} value={form.vin ?? ''} onChange={e => set('vin', e.target.value)} placeholder="1XKWDB0X5LJ123456" />
            </Field>
            <Field label="ELD Device ID (Monarch)">
              <input className={inputCls} value={form.eld_device_id ?? ''} onChange={e => set('eld_device_id', e.target.value)} placeholder="MON-12345" />
            </Field>
          </div>

          {/* Plates USA */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <Field label="Placas USA">
                <input className={inputCls} value={form.license_plate ?? ''} onChange={e => set('license_plate', e.target.value)} placeholder="ABC1234" />
              </Field>
            </div>
            <Field label="Estado">
              <input className={inputCls} value={form.license_state ?? ''} onChange={e => set('license_state', e.target.value.toUpperCase())} placeholder="TX" maxLength={2} />
            </Field>
            <Field label="Vence USA">
              <input className={inputCls} type="date" value={(form as any).plate_expiry_us ?? ''} onChange={e => set('plate_expiry_us', e.target.value)} />
            </Field>
          </div>

          {/* Plates MX */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <Field label="Placas MX">
                <input className={inputCls} value={(form as any).license_plate_mx ?? ''} onChange={e => set('license_plate_mx', e.target.value)} placeholder="08ES3L" />
              </Field>
            </div>
            <Field label="Estado MX">
              <input className={inputCls} value={(form as any).license_state_mx ?? ''} onChange={e => set('license_state_mx', e.target.value.toUpperCase())} placeholder="TAM" maxLength={3} />
            </Field>
            <Field label="Vence MX">
              <input className={inputCls} type="date" value={(form as any).plate_expiry_mx ?? ''} onChange={e => set('plate_expiry_mx', e.target.value)} />
            </Field>
          </div>

          {/* Laredo Tag + Transponder */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Laredo Tag">
              <input className={inputCls} value={(form as any).laredo_tag ?? ''} onChange={e => set('laredo_tag', e.target.value)} placeholder="LDO00187376" />
            </Field>
            <Field label="Transponder">
              <input className={inputCls} value={(form as any).transponder ?? ''} onChange={e => set('transponder', e.target.value)} placeholder="2C283537B3FA0E..." />
            </Field>
          </div>

          {/* Expiry dates */}
          <div className="border-t border-gray-700 pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Vencimientos</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Aseguradora">
                <input className={inputCls} value={form.insurance_carrier ?? ''} onChange={e => set('insurance_carrier', e.target.value)} placeholder="Owner's Policy, Progressive..." />
              </Field>
              <Field label="Seguro USA — vence">
                <input className={inputCls} type="date" value={form.insurance_expiry ?? ''} onChange={e => set('insurance_expiry', e.target.value)} />
              </Field>
              <Field label="Seguro MX — vence">
                <input className={inputCls} type="date" value={(form as any).insurance_expiry_mx ?? ''} onChange={e => set('insurance_expiry_mx', e.target.value)} />
              </Field>
              <Field label="Inspección USA — vence">
                <input className={inputCls} type="date" value={form.inspection_expiry ?? ''} onChange={e => set('inspection_expiry', e.target.value)} />
              </Field>
              <Field label="Inspección MX — vence">
                <input className={inputCls} type="date" value={(form as any).inspection_expiry_mx ?? ''} onChange={e => set('inspection_expiry_mx', e.target.value)} />
              </Field>
              <Field label="Registro USA — vence">
                <input className={inputCls} type="date" value={form.registration_expiry ?? ''} onChange={e => set('registration_expiry', e.target.value)} />
              </Field>
              <Field label="CVSA sticker — vence">
                <input className={inputCls} type="date" value={form.cvsa_expiry ?? ''} onChange={e => set('cvsa_expiry', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Blocked */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="accent-red-500 w-4 h-4"
              checked={!!(form as any).blocked}
              onChange={e => set('blocked', e.target.checked)} />
            <span className="text-sm text-gray-300">
              <span className="text-red-400 font-medium">Bloquear unidad</span> — no asignable a nuevos loads
            </span>
          </label>

          <Field label="Notas">
            <textarea className={inputCls + ' resize-none'} rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Detalles adicionales..." />
          </Field>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear unidad'}
            </button>
          </div>
        </form>
      )}

      {/* DOCS TAB */}
      {tab === 'docs' && isEdit && (
        <DocUploader entityType="unit" entityId={unit.id} categories={UNIT_DOCS} />
      )}
    </Modal>
  )
}
