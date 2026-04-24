'use client'
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

const inp = 'w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#3ab690] transition-colors'
const lbl = 'block text-xs text-gray-400 mb-1'

const TYPES = ['Broker','Shipper','Receiver','Customer','3PL','Other']

interface Props { customer?: any; onClose: () => void; onSaved: () => void }

export default function CustomerModal({ customer, onClose, onSaved }: Props) {
  const isEdit = !!customer
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState('')

  async function handleDelete() {
    if (!confirm(`¿Eliminar cliente ${customer?.name}?`)) return
    setDeleting(true)
    const res = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' })
    if (res.ok) { onSaved(); onClose() }
    else { const d = await res.json(); setError(d.error ?? 'Error al eliminar'); setDeleting(false) }
  }
  const [tab, setTab] = useState<'main'|'billing'|'contacts'>('main')

  const [form, setForm] = useState({
    name:               customer?.name               ?? '',
    customer_type:      customer?.customer_type      ?? 'Broker',
    rfc_tax_id:         customer?.rfc_tax_id         ?? '',
    mc_number:          customer?.mc_number          ?? '',
    address1:           customer?.address1           ?? '',
    address2:           customer?.address2           ?? '',
    country:            customer?.country            ?? 'United States',
    state:              customer?.state              ?? '',
    city:               customer?.city              ?? '',
    zip:                customer?.zip               ?? '',
    same_as_mailing:    customer?.same_as_mailing    ?? true,
    billing_address1:   customer?.billing_address1   ?? '',
    billing_country:    customer?.billing_country    ?? 'United States',
    billing_state:      customer?.billing_state      ?? '',
    billing_city:       customer?.billing_city       ?? '',
    billing_zip:        customer?.billing_zip        ?? '',
    primary_contact:    customer?.primary_contact    ?? '',
    telephone:          customer?.telephone          ?? '',
    telephone_ext:      customer?.telephone_ext      ?? '',
    toll_free:          customer?.toll_free          ?? '',
    fax:                customer?.fax               ?? '',
    secondary_contact:  customer?.secondary_contact  ?? '',
    secondary_telephone:customer?.secondary_telephone ?? '',
    secondary_ext:      customer?.secondary_ext      ?? '',
    billing_email:      customer?.billing_email      ?? '',
    billing_email2:     customer?.billing_email2     ?? '',
    billing_email3:     customer?.billing_email3     ?? '',
    billing_email4:     customer?.billing_email4     ?? '',
    website:            customer?.website            ?? '',
    notes:              customer?.notes              ?? '',
    active:             customer?.active             ?? true,
  })

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    const payload: any = { ...form }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    payload.same_as_mailing = form.same_as_mailing
    payload.active = form.active
    const url = isEdit ? `/api/customers/${customer.id}` : '/api/customers'
    const res = await fetch(url, { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { onSaved(); onClose() }
    else { const e = await res.json(); setError(e.error ?? 'Error') }
    setSaving(false)
  }

  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${tab === t ? 'border-[#3ab690] text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d]">
          <h2 className="text-white font-semibold">{isEdit ? `Edit: ${customer.name}` : 'New Customer'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-white" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#21262d] flex-shrink-0">
          <button className={tabCls('main')} onClick={() => setTab('main')}>General</button>
          <button className={tabCls('billing')} onClick={() => setTab('billing')}>Billing</button>
          <button className={tabCls('contacts')} onClick={() => setTab('contacts')}>Contacts</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">

            {tab === 'main' && <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className={lbl}>Customer Name *</label><input className={inp} value={form.name} onChange={e => set('name', e.target.value)} required /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={lbl}>Type</label>
                  <select className={inp + ' cursor-pointer'} value={form.customer_type} onChange={e => set('customer_type', e.target.value)}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>RFC / TAX ID</label><input className={inp} value={form.rfc_tax_id} onChange={e => set('rfc_tax_id', e.target.value)} /></div>
                <div><label className={lbl}>MC Number</label><input className={inp} value={form.mc_number} onChange={e => set('mc_number', e.target.value)} /></div>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Mailing Address</p>
              <div><label className={lbl}>Address 1</label><input className={inp} value={form.address1} onChange={e => set('address1', e.target.value)} /></div>
              <div><label className={lbl}>Address 2</label><input className={inp} value={form.address2} onChange={e => set('address2', e.target.value)} /></div>
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
              <div><label className={lbl}>Notes</label><textarea className={inp} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
            </>}

            {tab === 'billing' && <>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.same_as_mailing} onChange={e => set('same_as_mailing', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span className="text-sm text-gray-300">Same as Mailing Address</span>
              </label>
              {!form.same_as_mailing && <>
                <div><label className={lbl}>Billing Address</label><input className={inp} value={form.billing_address1} onChange={e => set('billing_address1', e.target.value)} /></div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2"><label className={lbl}>Country</label><input className={inp} value={form.billing_country} onChange={e => set('billing_country', e.target.value)} /></div>
                  <div><label className={lbl}>State</label><input className={inp} value={form.billing_state} onChange={e => set('billing_state', e.target.value.toUpperCase())} maxLength={2} /></div>
                  <div><label className={lbl}>Zip</label><input className={inp} value={form.billing_zip} onChange={e => set('billing_zip', e.target.value)} /></div>
                </div>
                <div><label className={lbl}>City</label><input className={inp} value={form.billing_city} onChange={e => set('billing_city', e.target.value)} /></div>
              </>}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Billing Emails</p>
              {['billing_email','billing_email2','billing_email3','billing_email4'].map((k,i) => (
                <div key={k}><label className={lbl}>Billing Email {i > 0 ? i+1 : ''}</label><input className={inp} type="email" value={(form as any)[k]} onChange={e => set(k, e.target.value)} /></div>
              ))}
              <div><label className={lbl}>Website</label><input className={inp} type="url" placeholder="https://..." value={form.website} onChange={e => set('website', e.target.value)} /></div>
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Secondary Contact</p>
              <div><label className={lbl}>Name</label><input className={inp} value={form.secondary_contact} onChange={e => set('secondary_contact', e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><label className={lbl}>Telephone</label><input className={inp} value={form.secondary_telephone} onChange={e => set('secondary_telephone', e.target.value)} /></div>
                <div><label className={lbl}>Ext</label><input className={inp} value={form.secondary_ext} onChange={e => set('secondary_ext', e.target.value)} /></div>
              </div>
            </>}
          </div>

          <div className="px-6 py-4 border-t border-[#21262d] sticky bottom-0 bg-[#0d1117]">
            {error && <p className="text-red-400 text-xs mb-3 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">⚠️ {error}</p>}
            <div className="flex gap-3">
              {isEdit && (
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg px-3 py-2.5 text-sm transition-colors disabled:opacity-50">
                  {deleting ? '...' : 'Eliminar'}
                </button>
              )}
              <button type="button" onClick={onClose} className="flex-1 border border-[#30363d] text-gray-300 rounded-lg py-2.5 text-sm hover:bg-[#161b22]">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 bg-[#3ab690] hover:bg-[#1a9d75] disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isEdit ? 'Save Changes' : 'Add Customer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
