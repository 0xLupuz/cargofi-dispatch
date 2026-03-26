'use client'
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
const i = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors'
const l = 'block text-xs text-gray-400 mb-1'
interface Props { vendor?: any; onClose: () => void; onSaved: () => void }
export default function VendorModal({ vendor, onClose, onSaved }: Props) {
  const isEdit = !!vendor
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: vendor?.name ?? '', address: vendor?.address ?? '',
    city: vendor?.city ?? '', state: vendor?.state ?? '', zip: vendor?.zip ?? '',
    country: vendor?.country ?? 'United States', contact_name: vendor?.contact_name ?? '',
    telephone: vendor?.telephone ?? '', email: vendor?.email ?? '',
    notes: vendor?.notes ?? '', active: vendor?.active ?? true,
  })
  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    const payload: any = { ...form }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    payload.active = form.active
    const res = await fetch(isEdit ? `/api/vendors/${vendor.id}` : '/api/vendors', {
      method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
    if (res.ok) { onSaved(); onClose() } else { const e = await res.json(); setError(e.error ?? 'Error') }
    setSaving(false)
  }
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">{isEdit ? `Edit: ${vendor.name}` : 'New Vendor'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-white" /></button>
        </div>
        <form onSubmit={save} className="px-6 py-5 space-y-4">
          <div><label className={l}>Name *</label><input className={i} value={form.name} onChange={e => set('name', e.target.value)} required /></div>
          <div><label className={l}>Address</label><input className={i} value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2"><label className={l}>City</label><input className={i} value={form.city} onChange={e => set('city', e.target.value)} /></div>
            <div><label className={l}>State</label><input className={i} value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} maxLength={2} /></div>
            <div><label className={l}>Zip</label><input className={i} value={form.zip} onChange={e => set('zip', e.target.value)} /></div>
          </div>
          <div><label className={l}>Country</label><input className={i} value={form.country} onChange={e => set('country', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={l}>Contact Name</label><input className={i} value={form.contact_name} onChange={e => set('contact_name', e.target.value)} /></div>
            <div><label className={l}>Telephone</label><input className={i} value={form.telephone} onChange={e => set('telephone', e.target.value)} /></div>
          </div>
          <div><label className={l}>Email</label><input className={i} type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
          <div><label className={l}>Notes</label><textarea className={i} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 accent-orange-500" /><span className="text-sm text-gray-300">Active</span></label>
          {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">⚠️ {error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-800">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isEdit ? 'Save' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
