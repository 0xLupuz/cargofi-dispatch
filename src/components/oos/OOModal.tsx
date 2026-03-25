'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { Field, inputCls } from '@/components/ui/Field'
import type { OwnerOperator } from '@/types'

interface Props {
  oo?: OwnerOperator
  onClose: () => void
  onSaved: (oo: OwnerOperator) => void
}

const EMPTY = {
  name: '', company_name: '', phone_whatsapp: '', email: '',
  dispatch_fee_pct: '13', mc_number: '', dot_number: '',
  insurance_carrier: '', insurance_expiry: '', notes: '',
}

export default function OOModal({ oo, onClose, onSaved }: Props) {
  const isEdit = !!oo
  const [form, setForm] = useState(
    oo ? {
      name: oo.name, company_name: oo.company_name ?? '',
      phone_whatsapp: oo.phone_whatsapp, email: oo.email ?? '',
      dispatch_fee_pct: String(oo.dispatch_fee_pct),
      mc_number: oo.mc_number ?? '', dot_number: oo.dot_number ?? '',
      insurance_carrier: (oo as any).insurance_carrier ?? '',
      insurance_expiry: oo.insurance_expiry ?? '',
      notes: oo.notes ?? '',
    } : EMPTY
  )
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      ...form,
      dispatch_fee_pct: parseFloat(form.dispatch_fee_pct),
      insurance_expiry: form.insurance_expiry || null,
      company_name: form.company_name || null,
      email: form.email || null,
      mc_number: form.mc_number || null,
      dot_number: form.dot_number || null,
      insurance_carrier: form.insurance_carrier || null,
      notes: form.notes || null,
    }

    const res = isEdit
      ? await fetch(`/api/owner-operators/${oo.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/owner-operators', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

    if (res.ok) onSaved(await res.json())
    setLoading(false)
  }

  return (
    <Modal title={isEdit ? `Edit — ${oo.name}` : 'Add Owner Operator'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" required>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Juan García" />
          </Field>
          <Field label="Company Name">
            <input className={inputCls} value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="García Trucking LLC" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="WhatsApp" required>
            <input className={inputCls} value={form.phone_whatsapp} onChange={e => set('phone_whatsapp', e.target.value)} required placeholder="+15126781234" />
          </Field>
          <Field label="Email">
            <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="juan@email.com" />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Dispatch Fee %" required>
            <input className={inputCls} type="number" step="0.5" min="0" max="30"
              value={form.dispatch_fee_pct} onChange={e => set('dispatch_fee_pct', e.target.value)} required />
          </Field>
          <Field label="MC Number">
            <input className={inputCls} value={form.mc_number} onChange={e => set('mc_number', e.target.value)} placeholder="MC123456" />
          </Field>
          <Field label="DOT Number">
            <input className={inputCls} value={form.dot_number} onChange={e => set('dot_number', e.target.value)} placeholder="DOT7654321" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Insurance Carrier">
            <input className={inputCls} value={form.insurance_carrier} onChange={e => set('insurance_carrier', e.target.value)} placeholder="Progressive, Owner Policy..." />
          </Field>
          <Field label="Insurance Expiry">
            <input className={inputCls} type="date" value={form.insurance_expiry} onChange={e => set('insurance_expiry', e.target.value)} />
          </Field>
        </div>

        <Field label="Notes">
          <textarea className={inputCls + ' resize-none'} rows={2} value={form.notes}
            onChange={e => set('notes', e.target.value)} placeholder="Preferred routes, special notes..." />
        </Field>

        {/* Compliance checklist (edit only) */}
        {isEdit && (
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
            <p className="text-xs text-gray-400 font-medium mb-2">Compliance</p>
            {[
              ['cdl_verified', 'CDL Verified'],
              ['psp_cleared', 'PSP Cleared'],
              ['mvr_cleared', 'MVR Cleared'],
              ['clearinghouse_ok', 'Clearinghouse OK'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" className="accent-orange-500"
                  checked={(oo as any)[key] ?? false}
                  onChange={() => {}} readOnly />
                {label}
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-700 text-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add OO'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
