'use client'
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

const inp = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors'
const lbl = 'block text-xs text-gray-400 mb-1'

interface Props { item?: any; onClose: () => void; onSaved: () => void }

export default function ItemModal({ item, onClose, onSaved }: Props) {
  const isEdit = !!item
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    code:        item?.code        ?? '',
    item_type:   item?.item_type   ?? 'P',
    item:        item?.item        ?? '',
    sub_item:    item?.sub_item    ?? '',
    description: item?.description ?? '',
    charge_rate: item?.charge_rate ?? '0',
    whole_qty:   item?.whole_qty   ?? true,   // true = integer qty only
    taxable:     item?.taxable     ?? false,
    active:      item?.active      ?? true,
  })

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const payload: any = { ...form, charge_rate: parseFloat(form.charge_rate) || 0 }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    payload.whole_qty = form.whole_qty
    payload.taxable   = form.taxable
    payload.active    = form.active
    const res = await fetch(isEdit ? `/api/items/${item.id}` : '/api/items', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) { onSaved(); onClose() }
    else { const d = await res.json(); setError(d.error ?? 'Error saving item') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">{isEdit ? 'Edit Item' : 'New Item/Service'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-white" /></button>
        </div>

        <form onSubmit={save} className="px-6 py-5 space-y-4">
          {/* Code + Type + Rate */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Item Code *</label>
              <input className={inp} value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} required placeholder="102F/A66" />
            </div>
            <div>
              <label className={lbl}>Type</label>
              <select className={inp + ' cursor-pointer'} value={form.item_type} onChange={e => set('item_type', e.target.value)}>
                <option value="P">Parts</option>
                <option value="L">Labor</option>
              </select>
            </div>
            <div>
              <label className={lbl}>{form.item_type === 'L' ? 'Charge/Hr' : 'Unit Price'}</label>
              <input className={inp} type="number" step="0.01" min="0" value={form.charge_rate} onChange={e => set('charge_rate', e.target.value)} />
            </div>
          </div>

          {/* Item */}
          <div>
            <label className={lbl}>Item *</label>
            <input className={inp} value={form.item} onChange={e => set('item', e.target.value)} required placeholder="Full part number or labor name" />
          </div>

          {/* Sub-Item */}
          <div>
            <label className={lbl}>Sub-Item</label>
            <input className={inp} value={form.sub_item} onChange={e => set('sub_item', e.target.value)} placeholder="e.g. LAMP-MARKER,LOW PROFILE,AM" />
          </div>

          {/* Description */}
          <div>
            <label className={lbl}>Description</label>
            <input className={inp} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* Flags */}
          <div className="space-y-2.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.whole_qty}
                onChange={e => set('whole_qty', e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-orange-500"
              />
              <span className="text-sm text-gray-300 leading-tight">
                Whole qty only
                <span className="block text-xs text-gray-500 mt-0.5">Uncheck to allow decimal quantities</span>
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.taxable} onChange={e => set('taxable', e.target.checked)} className="w-4 h-4 accent-orange-500" />
              <span className="text-sm text-gray-300">Taxable</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 accent-orange-500" />
              <span className="text-sm text-gray-300">Active</span>
            </label>
          </div>

          {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">⚠️ {error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-800">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Save' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
