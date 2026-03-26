'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { Field, inputCls, selectCls } from '@/components/ui/Field'
import DocUploader from '@/components/ui/DocUploader'
import type { Driver, OwnerOperator } from '@/types'

const DRIVER_DOCS = [
  { value: 'cdl',      label: 'CDL / Licencia Federal MX' },
  { value: 'passport', label: 'Pasaporte MX' },
  { value: 'visa',     label: 'Visa B1/B2' },
  { value: 'ine',      label: 'INE / ID Oficial' },
  { value: 'medical',  label: 'Medical Card' },
  { value: 'photo',    label: 'Foto' },
  { value: 'other',    label: 'Otro' },
]

interface Props {
  driver?: Driver
  onClose: () => void
  onSaved: (driver: Driver) => void
}

export default function DriverModal({ driver, onClose, onSaved }: Props) {
  const isEdit = !!driver
  const [tab, setTab] = useState<'info' | 'mx' | 'docs'>('info')
  const [oos, setOOs] = useState<OwnerOperator[]>([])
  const [form, setForm] = useState<Record<string, any>>(driver ? { ...driver } : {
    name: '', phone_whatsapp: '', owner_operator_id: '',
    cdl_number: '', cdl_state: '', cdl_expiry: '', medical_card_expiry: '',
    nationality: 'MX', rfc: '', curp: '',
    passport_number: '', passport_expiry: '',
    visa_type: 'B1/B2', visa_number: '', visa_expiry: '',
    ine_number: '', federal_license_number: '', federal_license_expiry: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { fetch('/api/owner-operators').then(r => r.json()).then(setOOs) }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = { ...form }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    payload.owner_operator_id = payload.owner_operator_id || null

    const res = isEdit
      ? await fetch(`/api/drivers/${driver.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/drivers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) onSaved(await res.json())
    setLoading(false)
  }

  const tabCls = (t: string) =>
    `px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`

  return (
    <Modal title={isEdit ? `Driver — ${driver.name}` : 'Agregar Driver'} onClose={onClose} width="max-w-2xl">
      <div className="flex gap-2 mb-5">
        <button type="button" className={tabCls('info')} onClick={() => setTab('info')}>Información</button>
        <button type="button" className={tabCls('mx')} onClick={() => setTab('mx')}>Docs MX / Visa</button>
        {isEdit && <button type="button" className={tabCls('docs')} onClick={() => setTab('docs')}>Archivos</button>}
      </div>

      {/* INFO */}
      {tab === 'info' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre completo" required>
              <input className={inputCls} value={form.name ?? ''} onChange={e => set('name', e.target.value)} required placeholder="Pedro Ramírez" />
            </Field>
            <Field label="WhatsApp (check-ins)" required>
              <input className={inputCls} value={form.phone_whatsapp ?? ''} onChange={e => set('phone_whatsapp', e.target.value)} required placeholder="+15126781234" />
            </Field>
          </div>
          <Field label="Owner Operator (si aplica)">
            <select className={selectCls} value={form.owner_operator_id ?? ''} onChange={e => set('owner_operator_id', e.target.value)}>
              <option value="">Sin OO asignado</option>
              {oos.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Field label="CDL # (USA)">
                <input className={inputCls} value={form.cdl_number ?? ''} onChange={e => set('cdl_number', e.target.value)} placeholder="D1234567" />
              </Field>
            </div>
            <Field label="Estado CDL">
              <input className={inputCls} value={form.cdl_state ?? ''} maxLength={2} onChange={e => set('cdl_state', e.target.value.toUpperCase())} placeholder="TX" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="CDL — vence">
              <input className={inputCls} type="date" value={form.cdl_expiry ?? ''} onChange={e => set('cdl_expiry', e.target.value)} />
            </Field>
            <Field label="Medical Card — vence">
              <input className={inputCls} type="date" value={form.medical_card_expiry ?? ''} onChange={e => set('medical_card_expiry', e.target.value)} />
            </Field>
          </div>
          <Field label="Notas">
            <textarea className={inputCls + ' resize-none'} rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
              {loading ? 'Guardando...' : isEdit ? 'Guardar' : 'Agregar Driver'}
            </button>
          </div>
        </form>
      )}

      {/* MX DOCS */}
      {tab === 'mx' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="RFC">
              <input className={inputCls} value={form.rfc ?? ''} onChange={e => set('rfc', e.target.value.toUpperCase())} placeholder="RAMP800101ABC" />
            </Field>
            <Field label="CURP">
              <input className={inputCls} value={form.curp ?? ''} onChange={e => set('curp', e.target.value.toUpperCase())} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="INE #">
              <input className={inputCls} value={form.ine_number ?? ''} onChange={e => set('ine_number', e.target.value)} />
            </Field>
            <Field label="Licencia Federal MX #">
              <input className={inputCls} value={form.federal_license_number ?? ''} onChange={e => set('federal_license_number', e.target.value)} />
            </Field>
          </div>
          <Field label="Lic. Federal MX — vence">
            <input className={inputCls} type="date" value={form.federal_license_expiry ?? ''} onChange={e => set('federal_license_expiry', e.target.value)} />
          </Field>
          <div className="border-t border-gray-700 pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Pasaporte</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="# Pasaporte MX">
                <input className={inputCls} value={form.passport_number ?? ''} onChange={e => set('passport_number', e.target.value.toUpperCase())} placeholder="G12345678" />
              </Field>
              <Field label="Pasaporte — vence">
                <input className={inputCls} type="date" value={form.passport_expiry ?? ''} onChange={e => set('passport_expiry', e.target.value)} />
              </Field>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Visa USA</p>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Tipo">
                <input className={inputCls} value={form.visa_type ?? ''} onChange={e => set('visa_type', e.target.value)} placeholder="B1/B2" />
              </Field>
              <Field label="# Visa">
                <input className={inputCls} value={form.visa_number ?? ''} onChange={e => set('visa_number', e.target.value.toUpperCase())} />
              </Field>
              <Field label="Visa — vence">
                <input className={inputCls} type="date" value={form.visa_expiry ?? ''} onChange={e => set('visa_expiry', e.target.value)} />
              </Field>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {/* ARCHIVOS */}
      {tab === 'docs' && isEdit && (
        <DocUploader entityType="driver" entityId={driver.id} categories={DRIVER_DOCS} />
      )}
    </Modal>
  )
}
