'use client'
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

const inp = 'w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#3ab690] transition-colors'
const lbl = 'block text-xs text-gray-400 mb-1'

interface Props { vendor?: any; onClose: () => void; onSaved: () => void }

export default function VendorModal({ vendor, onClose, onSaved }: Props) {
  const isEdit = !!vendor
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name:           vendor?.name           ?? '',
    address:        vendor?.address        ?? '',
    address2:       vendor?.address2       ?? '',
    country:        vendor?.country        ?? 'United States',
    state:          vendor?.state          ?? '',
    city:           vendor?.city           ?? '',
    zip:            vendor?.zip            ?? '',
    contact_name:   vendor?.contact_name   ?? '',
    email:          vendor?.email          ?? '',
    telephone:      vendor?.telephone      ?? '',
    telephone_ext:  vendor?.telephone_ext  ?? '',
    toll_free:      vendor?.toll_free      ?? '',
    fax:            vendor?.fax            ?? '',
    notes:          vendor?.notes          ?? '',
    active:         vendor?.active         ?? true,
    is_repair_shop: vendor?.is_repair_shop ?? false,
  })

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const payload: any = { ...form }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    payload.active = form.active
    payload.is_repair_shop = form.is_repair_shop
    const res = await fetch(isEdit ? `/api/vendors/${vendor.id}` : '/api/vendors', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) { onSaved(); onClose() }
    else { const d = await res.json(); setError(d.error ?? 'Error saving vendor') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d]">
          <h2 className="text-white font-semibold">{isEdit ? `Edit: ${vendor.name}` : 'New Vendor'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-white" /></button>
        </div>

        <form onSubmit={save} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className={lbl}>Name *</label>
            <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>

          {/* Address */}
          <div>
            <label className={lbl}>Address 1</label>
            <input className={inp} value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Address 2</label>
            <input className={inp} value={form.address2} onChange={e => set('address2', e.target.value)} />
          </div>

          {/* Country */}
          <div>
            <label className={lbl}>Country</label>
            <select className={inp + ' cursor-pointer'} value={form.country} onChange={e => set('country', e.target.value)}>
              <option>United States</option>
              <option>Mexico</option>
              <option>Canada</option>
              <option>Other</option>
            </select>
          </div>

          {/* State / City / Zip */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2">
              <label className={lbl}>State</label>
              <input className={inp} value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} maxLength={3} placeholder="TX" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>City</label>
              <input className={inp} value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Zip</label>
              <input className={inp} value={form.zip} onChange={e => set('zip', e.target.value)} />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Contact Name</label>
              <input className={inp} value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input className={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>

          {/* Telephone + Ext */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={lbl}>Telephone</label>
              <input className={inp} value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="(956) 000-0000" />
            </div>
            <div>
              <label className={lbl}>Ext</label>
              <input className={inp} value={form.telephone_ext} onChange={e => set('telephone_ext', e.target.value)} />
            </div>
          </div>

          {/* Toll Free + Fax */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Toll Free</label>
              <input className={inp} value={form.toll_free} onChange={e => set('toll_free', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Fax</label>
              <input className={inp} value={form.fax} onChange={e => set('fax', e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={lbl}>Notes</label>
            <textarea className={inp} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 accent-orange-500" />
              <span className="text-sm text-gray-300">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_repair_shop} onChange={e => set('is_repair_shop', e.target.checked)} className="w-4 h-4 accent-orange-500" />
              <span className="text-sm text-gray-300">Vendor is Repair Shop</span>
            </label>
          </div>

          {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">⚠️ {error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-[#30363d] text-gray-300 rounded-lg py-2.5 text-sm hover:bg-[#161b22]">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-[#3ab690] hover:bg-[#1a9d75] disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Save' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
