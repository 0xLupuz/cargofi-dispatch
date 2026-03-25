'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { Field, inputCls, selectCls } from '@/components/ui/Field'
import type { Driver, OwnerOperator } from '@/types'

interface Props {
  driver?: Driver
  onClose: () => void
  onSaved: (driver: Driver) => void
}

const EMPTY = {
  name: '', phone_whatsapp: '', owner_operator_id: '',
  cdl_number: '', cdl_state: '', cdl_expiry: '',
  medical_card_expiry: '', notes: '',
}

export default function DriverModal({ driver, onClose, onSaved }: Props) {
  const isEdit = !!driver
  const [oos, setOOs] = useState<OwnerOperator[]>([])
  const [form, setForm] = useState(
    driver ? {
      name: driver.name,
      phone_whatsapp: driver.phone_whatsapp,
      owner_operator_id: driver.owner_operator_id ?? '',
      cdl_number: driver.cdl_number ?? '',
      cdl_state: driver.cdl_state ?? '',
      cdl_expiry: driver.cdl_expiry ?? '',
      medical_card_expiry: driver.medical_card_expiry ?? '',
      notes: (driver as any).notes ?? '',
    } : EMPTY
  )
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    fetch('/api/owner-operators').then(r => r.json()).then(setOOs)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      ...form,
      owner_operator_id: form.owner_operator_id || null,
      cdl_number: form.cdl_number || null,
      cdl_state: form.cdl_state || null,
      cdl_expiry: form.cdl_expiry || null,
      medical_card_expiry: form.medical_card_expiry || null,
      notes: (form as any).notes || null,
    }

    const res = isEdit
      ? await fetch(`/api/drivers/${driver.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/drivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

    if (res.ok) onSaved(await res.json())
    setLoading(false)
  }

  return (
    <Modal title={isEdit ? `Edit — ${driver.name}` : 'Add Driver'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" required>
            <input className={inputCls} value={form.name}
              onChange={e => set('name', e.target.value)} required placeholder="Pedro Ramírez" />
          </Field>
          <Field label="WhatsApp" required>
            <input className={inputCls} value={form.phone_whatsapp}
              onChange={e => set('phone_whatsapp', e.target.value)} required placeholder="+15126781234" />
          </Field>
        </div>

        <Field label="Owner Operator (si aplica)">
          <select className={selectCls} value={form.owner_operator_id}
            onChange={e => set('owner_operator_id', e.target.value)}>
            <option value="">Sin OO asignado</option>
            {oos.map(oo => (
              <option key={oo.id} value={oo.id}>{oo.name}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field label="CDL Number">
              <input className={inputCls} value={form.cdl_number}
                onChange={e => set('cdl_number', e.target.value)} placeholder="D1234567" />
            </Field>
          </div>
          <Field label="CDL State">
            <input className={inputCls} value={form.cdl_state} maxLength={2}
              onChange={e => set('cdl_state', e.target.value.toUpperCase())} placeholder="TX" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="CDL Expiry">
            <input className={inputCls} type="date" value={form.cdl_expiry}
              onChange={e => set('cdl_expiry', e.target.value)} />
          </Field>
          <Field label="Medical Card Expiry">
            <input className={inputCls} type="date" value={form.medical_card_expiry}
              onChange={e => set('medical_card_expiry', e.target.value)} />
          </Field>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-700 text-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Driver'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
