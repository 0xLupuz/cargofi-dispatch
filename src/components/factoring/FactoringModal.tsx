'use client'
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

const inp = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors'
const lbl = 'block text-xs text-gray-400 mb-1'

interface Props { company?: any; onClose: () => void; onSaved: () => void }

export default function FactoringModal({ company, onClose, onSaved }: Props) {
  const isEdit = !!company
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'info'|'contacts'|'terms'>('info')

  const [form, setForm] = useState({
    name:               company?.name               ?? '',
    address:            company?.address            ?? '',
    country:            company?.country            ?? 'United States',
    state:              company?.state              ?? '',
    city:               company?.city               ?? '',
    zip:                company?.zip                ?? '',
    primary_contact:    company?.primary_contact    ?? '',
    telephone:          company?.telephone          ?? '',
    telephone_ext:      company?.telephone_ext      ?? '',
    toll_free:          company?.toll_free          ?? '',
    fax:                company?.fax                ?? '',
    email:              company?.email              ?? '',
    secondary_contact:  company?.secondary_contact  ?? '',
    secondary_telephone:company?.secondary_telephone ?? '',
    secondary_ext:      company?.secondary_ext      ?? '',
    flat_discount:      company?.flat_discount      ?? '0',
    pay_discount_pct:   company?.pay_discount_pct   ?? '0',
    days_to_pay:        company?.days_to_pay        ?? '0',
    federal_id:         company?.federal_id         ?? '',
    internal_notes:     company?.internal_notes     ?? '',
    notes_on_invoice:   company?.notes_on_invoice   ?? '',
    active:             company?.active             ?? true,
  })

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    const payload: any = { ...form }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    payload.flat_discount = parseFloat(form.flat_discount) || 0
    payload.pay_discount_pct = parseFloat(form.pay_discount_pct) || 0
    payload.days_to_pay = parseInt(form.days_to_pay) || 0
    payload.active = form.active
    const url = isEdit ? `/api/factoring/${company.id}` : '/api/factoring'
    const res = await fetch(url, { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { onSaved(); onClose() }
    else { const e = await res.json(); setError(e.error ?? 'Error') }
    setSaving(false)
  }

  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${tab === t ? 'border-orange-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">{isEdit ? `Edit: ${company.name}` : 'New Factoring Company'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-white" /></button>
        </div>

        <div className="flex border-b border-gray-800 flex-shrink-0">
          <button className={tabCls('info')} onClick={() => setTab('info')}>Info</button>
          <button className={tabCls('contacts')} onClick={() => setTab('contacts')}>Contacts</button>
          <button className={tabCls('terms')} onClick={() => setTab('terms')}>Terms</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">

            {tab === 'info' && <>
              <div><label className={lbl}>Company Name *</label><input className={inp} value={form.name} onChange={e => set('name', e.target.value)} required /></div>
              <div><label className={lbl}>Address</label><input className={inp} value={form.address} onChange={e => set('address', e.target.value)} /></div>
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2"><label className={lbl}>Country</label><input className={inp} value={form.country} onChange={e => set('country', e.target.value)} /></div>
                <div><label className={lbl}>State</label><input className={inp} value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} maxLength={2} /></div>
                <div><label className={lbl}>Zip</label><input className={inp} value={form.zip} onChange={e => set('zip', e.target.value)} /></div>
              </div>
              <div><label className={lbl}>City</label><input className={inp} value={form.city} onChange={e => set('city', e.target.value)} /></div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span className="text-sm text-gray-300">Active</span>
              </label>
            </>}

            {tab === 'contacts' && <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Primary Contact</p>
              <div><label className={lbl}>Name</label><input className={inp} value={form.primary_contact} onChange={e => set('primary_contact', e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><label className={lbl}>Telephone *</label><input className={inp} value={form.telephone} onChange={e => set('telephone', e.target.value)} /></div>
                <div><label className={lbl}>Ext</label><input className={inp} value={form.telephone_ext} onChange={e => set('telephone_ext', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Toll Free</label><input className={inp} value={form.toll_free} onChange={e => set('toll_free', e.target.value)} /></div>
                <div><label className={lbl}>Fax</label><input className={inp} value={form.fax} onChange={e => set('fax', e.target.value)} /></div>
              </div>
              <div><label className={lbl}>Email</label><input className={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Secondary Contact</p>
              <div><label className={lbl}>Name</label><input className={inp} value={form.secondary_contact} onChange={e => set('secondary_contact', e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><label className={lbl}>Telephone</label><input className={inp} value={form.secondary_telephone} onChange={e => set('secondary_telephone', e.target.value)} /></div>
                <div><label className={lbl}>Ext</label><input className={inp} value={form.secondary_ext} onChange={e => set('secondary_ext', e.target.value)} /></div>
              </div>
            </>}

            {tab === 'terms' && <>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={lbl}>Flat Discount ($)</label><input className={inp} type="number" step="0.01" value={form.flat_discount} onChange={e => set('flat_discount', e.target.value)} /></div>
                <div><label className={lbl}>Pay Discount (%)</label><input className={inp} type="number" step="0.01" value={form.pay_discount_pct} onChange={e => set('pay_discount_pct', e.target.value)} /></div>
                <div><label className={lbl}>Days to Pay *</label><input className={inp} type="number" value={form.days_to_pay} onChange={e => set('days_to_pay', e.target.value)} /></div>
              </div>
              <div><label className={lbl}>Federal ID (EIN)</label><input className={inp} value={form.federal_id} onChange={e => set('federal_id', e.target.value)} /></div>
              <div><label className={lbl}>Internal Notes <span className="text-gray-600">(255 chars)</span></label>
                <textarea className={inp} rows={3} maxLength={255} value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)} />
              </div>
              <div><label className={lbl}>Notes on Invoice <span className="text-gray-600">(600 chars)</span></label>
                <textarea className={inp} rows={4} maxLength={600} value={form.notes_on_invoice} onChange={e => set('notes_on_invoice', e.target.value)} />
              </div>
            </>}
          </div>

          <div className="px-6 py-4 border-t border-gray-800 sticky bottom-0 bg-gray-900">
            {error && <p className="text-red-400 text-xs mb-3 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">⚠️ {error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-800">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isEdit ? 'Save Changes' : 'Add Company'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
