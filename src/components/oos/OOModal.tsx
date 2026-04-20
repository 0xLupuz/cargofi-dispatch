'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { Field, inputCls } from '@/components/ui/Field'
import DocUploader from '@/components/ui/DocUploader'
import type { OwnerOperator } from '@/types'

const OO_DOCS = [
  { value: 'passport',  label: 'Pasaporte MX' },
  { value: 'visa',      label: 'Visa B1/B2' },
  { value: 'ine',       label: 'INE / ID Oficial' },
  { value: 'cdl',       label: 'Licencia Federal MX' },
  { value: 'insurance', label: 'Seguro Trucking' },
  { value: 'photo',     label: 'Foto' },
  { value: 'other',     label: 'Otro' },
]

interface Props {
  oo?: OwnerOperator
  onClose: () => void
  onSaved: (oo: OwnerOperator) => void
}

export default function OOModal({ oo, onClose, onSaved }: Props) {
  const isEdit = !!oo
  const [tab, setTab] = useState<'info' | 'mx' | 'docs'>('info')
  const [form, setForm] = useState<Record<string, any>>(oo ? { ...oo } : {
    name: '', company_name: '', phone_whatsapp: '', email: '',
    dispatch_fee_pct: '13', mc_number: '', dot_number: '',
    insurance_carrier: '', insurance_expiry: '', notes: '',
    nationality: 'MX', rfc: '', curp: '',
    passport_number: '', passport_expiry: '',
    visa_type: 'B1/B2', visa_number: '', visa_expiry: '',
    ine_number: '', federal_license_number: '', federal_license_expiry: '',
  })
  const [loading, setLoading]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState('')
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  // Pull default dispatch fee from Settings when creating a new OO
  useEffect(() => {
    if (!isEdit) {
      fetch('/api/settings').then(r => r.ok ? r.json() : null).then(s => {
        if (s?.default_dispatch_fee_pct) set('dispatch_fee_pct', String(s.default_dispatch_fee_pct))
      })
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const payload: Record<string, any> = {
      ...form,
      dispatch_fee_pct: parseFloat(form.dispatch_fee_pct),
      insurance_expiry:        form.insurance_expiry        || null,
      passport_expiry:         form.passport_expiry         || null,
      visa_expiry:             form.visa_expiry             || null,
      federal_license_expiry:  form.federal_license_expiry  || null,
    }
    // Clean empty strings to null; remove internal/relation keys
    Object.keys(payload).forEach(k => {
      if (payload[k] === '') payload[k] = null
    })
    // Strip nested relation arrays returned by the GET select
    delete payload._defaultFeeLoaded
    delete payload.drivers
    delete payload.units
    delete payload.loads

    const res = isEdit
      ? await fetch(`/api/owner-operators/${oo.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/owner-operators',            { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

    if (res.ok) {
      onSaved(await res.json())
    } else {
      const d = await res.json()
      setError(d.error ?? 'Error al guardar — intenta de nuevo')
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar a ${oo?.name}?\n\nSi tiene loads asignados quedará inactivo. Si no tiene, se eliminará permanentemente.`)) return
    setDeleting(true)
    const res = await fetch(`/api/owner-operators/${oo!.id}`, { method: 'DELETE' })
    if (res.ok) { onClose(); window.location.reload() }
    else { const d = await res.json(); setError(d.error ?? 'Error al eliminar'); setDeleting(false) }
  }

  const tabCls = (t: string) =>
    `px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`

  return (
    <Modal title={isEdit ? `OO — ${oo.name}` : 'Agregar Owner Operator'} onClose={onClose} width="max-w-2xl">
      <div className="flex gap-2 mb-5">
        <button type="button" className={tabCls('info')} onClick={() => setTab('info')}>Información</button>
        <button type="button" className={tabCls('mx')} onClick={() => setTab('mx')}>Docs MX / Visa</button>
        <button type="button" className={tabCls('docs')} onClick={() => setTab('docs')}>Archivos</button>
      </div>

      {/* INFO */}
      {tab === 'info' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre completo" required>
              <input className={inputCls} value={form.name ?? ''} onChange={e => set('name', e.target.value)} required placeholder="Juan García" />
            </Field>
            <Field label="Empresa">
              <input className={inputCls} value={form.company_name ?? ''} onChange={e => set('company_name', e.target.value)} placeholder="García Trucking LLC" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="WhatsApp" required>
              <input className={inputCls} value={form.phone_whatsapp ?? ''} onChange={e => set('phone_whatsapp', e.target.value)} required placeholder="+15126781234" />
            </Field>
            <Field label="Email">
              <input className={inputCls} type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Dispatch Fee %" required>
              <input className={inputCls} type="number" step="0.5" value={form.dispatch_fee_pct ?? '13'} onChange={e => set('dispatch_fee_pct', e.target.value)} required />
            </Field>
            <Field label="MC Number">
              <input className={inputCls} value={form.mc_number ?? ''} onChange={e => set('mc_number', e.target.value)} placeholder="MC123456" />
            </Field>
            <Field label="DOT Number">
              <input className={inputCls} value={form.dot_number ?? ''} onChange={e => set('dot_number', e.target.value)} placeholder="DOT7654321" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Aseguradora">
              <input className={inputCls} value={form.insurance_carrier ?? ''} onChange={e => set('insurance_carrier', e.target.value)} />
            </Field>
            <Field label="Seguro — vence">
              <input className={inputCls} type="date" value={form.insurance_expiry ?? ''} onChange={e => set('insurance_expiry', e.target.value)} />
            </Field>
          </div>
          <Field label="Notas">
            <textarea className={inputCls + ' resize-none'} rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
          </Field>
          {isEdit && (
            <div className="bg-gray-800/50 rounded-lg p-3 grid grid-cols-4 gap-2">
              {[['cdl_verified','CDL'],['psp_cleared','PSP'],['mvr_cleared','MVR'],['clearinghouse_ok','CH']].map(([k,l]) => (
                <label key={k} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input type="checkbox" className="accent-orange-500" checked={!!form[k]}
                    onChange={e => set(k, e.target.checked)} />
                  {l}
                </label>
              ))}
            </div>
          )}
          {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">⚠️ {error}</p>}
          <div className="flex gap-3 pt-2">
            {isEdit && (
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg px-3 py-2.5 text-sm transition-colors disabled:opacity-50">
                {deleting ? '...' : 'Eliminar'}
              </button>
            )}
            <button type="button" onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Agregar OO'}
            </button>
          </div>
        </form>
      )}

      {/* MX DOCS */}
      {tab === 'mx' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="RFC">
              <input className={inputCls} value={form.rfc ?? ''} onChange={e => set('rfc', e.target.value.toUpperCase())} placeholder="GAJA800101ABC" />
            </Field>
            <Field label="CURP">
              <input className={inputCls} value={form.curp ?? ''} onChange={e => set('curp', e.target.value.toUpperCase())} placeholder="GAJA800101HCMRJN00" />
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
          <div className="grid grid-cols-2 gap-4">
            <Field label="Lic. Federal — vence">
              <input className={inputCls} type="date" value={form.federal_license_expiry ?? ''} onChange={e => set('federal_license_expiry', e.target.value)} />
            </Field>
          </div>
          <div className="border-t border-gray-700 pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Pasaporte</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="# Pasaporte">
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
          {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">⚠️ {error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}

      {/* ARCHIVOS */}
      {tab === 'docs' && (
        isEdit
          ? <DocUploader entityType="owner_operator" entityId={oo.id} categories={OO_DOCS} />
          : <p className="text-sm text-gray-500 text-center py-8">Guarda el registro primero para adjuntar documentos.</p>
      )}
    </Modal>
  )
}
