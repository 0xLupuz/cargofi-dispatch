'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { Field, inputCls, selectCls } from '@/components/ui/Field'
import DocUploader from '@/components/ui/DocUploader'
import type { OwnerOperator } from '@/types'

const UNIT_DOCS = [
  { value: 'insurance',    label: 'Seguro / Insurance' },
  { value: 'inspection',   label: 'Inspección Anual' },
  { value: 'cvsa',         label: 'CVSA Sticker' },
  { value: 'registration', label: 'Registro / Title' },
  { value: 'photo',        label: 'Foto del Truck' },
  { value: 'other',        label: 'Otro' },
]

interface Unit {
  id: string
  unit_number: string
  owner_operator_id?: string
  make?: string
  model?: string
  year?: number
  vin?: string
  license_plate?: string
  license_state?: string
  color?: string
  eld_device_id?: string
  status?: string
  insurance_carrier?: string
  insurance_expiry?: string
  registration_expiry?: string
  inspection_expiry?: string
  cvsa_expiry?: string
  notes?: string
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
    eld_device_id: '', status: 'available', owner_operator_id: '',
    insurance_carrier: '', insurance_expiry: '',
    registration_expiry: '', inspection_expiry: '', cvsa_expiry: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    fetch('/api/owner-operators').then(r => r.json()).then(setOOs)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      ...form,
      year: form.year ? Number(form.year) : null,
      owner_operator_id: form.owner_operator_id || null,
      insurance_expiry: form.insurance_expiry || null,
      registration_expiry: form.registration_expiry || null,
      inspection_expiry: form.inspection_expiry || null,
      cvsa_expiry: form.cvsa_expiry || null,
    }
    const res = isEdit
      ? await fetch(`/api/units/${unit.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/units', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) onSaved(await res.json())
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
              <input className={inputCls} value={form.unit_number ?? ''} onChange={e => set('unit_number', e.target.value)} required placeholder="259136" />
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

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Field label="Placas">
                <input className={inputCls} value={form.license_plate ?? ''} onChange={e => set('license_plate', e.target.value)} placeholder="ABC1234" />
              </Field>
            </div>
            <Field label="Estado">
              <input className={inputCls} value={form.license_state ?? ''} onChange={e => set('license_state', e.target.value.toUpperCase())} placeholder="TX" maxLength={2} />
            </Field>
          </div>

          {/* Expiry dates */}
          <div className="border-t border-gray-700 pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Vencimientos</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Seguro — vence">
                <input className={inputCls} type="date" value={form.insurance_expiry ?? ''} onChange={e => set('insurance_expiry', e.target.value)} />
              </Field>
              <Field label="Aseguradora">
                <input className={inputCls} value={form.insurance_carrier ?? ''} onChange={e => set('insurance_carrier', e.target.value)} placeholder="Owner's Policy, Progressive..." />
              </Field>
              <Field label="Registro — vence">
                <input className={inputCls} type="date" value={form.registration_expiry ?? ''} onChange={e => set('registration_expiry', e.target.value)} />
              </Field>
              <Field label="Inspección anual — vence">
                <input className={inputCls} type="date" value={form.inspection_expiry ?? ''} onChange={e => set('inspection_expiry', e.target.value)} />
              </Field>
              <Field label="CVSA sticker — vence">
                <input className={inputCls} type="date" value={form.cvsa_expiry ?? ''} onChange={e => set('cvsa_expiry', e.target.value)} />
              </Field>
            </div>
          </div>

          <Field label="Notas">
            <textarea className={inputCls + ' resize-none'} rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Detalles adicionales..." />
          </Field>

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
