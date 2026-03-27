'use client'
import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Trash2, Loader2, ChevronDown } from 'lucide-react'

const inp = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors'
const lbl = 'block text-xs text-gray-400 mb-1'
const STATUSES = ['estimate','in_progress','delivered_complete','delivered_incomplete','cancelled']
const STATUS_LABELS: Record<string,string> = { estimate:'1 - Estimate', in_progress:'2 - In Progress', delivered_complete:'3 - Delivered - Complete', delivered_incomplete:'4 - Delivered - Incomplete', cancelled:'5 - Cancelled' }

type PartRow = { id?:string; code:string; item:string; sub_item:string; description:string; taxable:boolean; quantity:number; unit_price:number }
type LaborRow = { id?:string; code:string; item:string; sub_item:string; description:string; hours:number; unit_price:number }
const emptyPart = (): PartRow => ({ code:'', item:'', sub_item:'', description:'', taxable:false, quantity:1, unit_price:0 })
const emptyLabor = (): LaborRow => ({ code:'', item:'', sub_item:'', description:'', hours:0, unit_price:80 })

interface Props { ro?: any; onClose: () => void; onSaved: () => void }

export default function RepairOrderModal({ ro, onClose, onSaved }: Props) {
  const isEdit = !!ro
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [units, setUnits] = useState<any[]>([])
  const [trailers, setTrailers] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [itemsCatalog, setItemsCatalog] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'parts'|'history'>('parts')

  const [form, setForm] = useState({
    external_shop: ro?.external_shop ?? false,
    vendor_id: ro?.vendor_id ?? '',
    arrived_at: ro?.arrived_at ? ro.arrived_at.slice(0,16) : new Date().toISOString().slice(0,16),
    delivered_at: ro?.delivered_at ? ro.delivered_at.slice(0,16) : '',
    status: ro?.status ?? 'estimate',
    equipment_type: ro?.equipment_type ?? 'truck',
    unit_id: ro?.unit_id ?? '',
    trailer_id: ro?.trailer_id ?? '',
    odometer: ro?.odometer ?? '',
    carrier: ro?.carrier ?? 'CargoFi',
    tax_rate: ro?.tax_rate ?? '8.25',
    internal_notes: ro?.internal_notes ?? '',
    printed_notes: ro?.printed_notes ?? '',
  })
  const [parts, setParts] = useState<PartRow[]>(ro?.parts ?? [emptyPart()])
  const [labor, setLabor] = useState<LaborRow[]>(ro?.labor ?? [emptyLabor()])

  function setF(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  useEffect(() => {
    Promise.all([
      fetch('/api/units').then(r => r.json()),
      fetch('/api/trailers').then(r => r.json()),
      fetch('/api/vendors').then(r => r.json()),
      fetch('/api/items?type=P').then(r => r.json()),
    ]).then(([u, t, v, i]) => { setUnits(u); setTrailers(t); setVendors(v); setItemsCatalog(i) })
  }, [])

  // Auto-fill equipment info when unit/trailer selected
  const selectedUnit    = units.find(u => u.id === form.unit_id)
  const selectedTrailer = trailers.find(t => t.id === form.trailer_id)
  const equip = form.equipment_type === 'truck' ? selectedUnit : selectedTrailer

  // Parts totals
  const partsTotal  = parts.reduce((s,p) => s + p.quantity * p.unit_price, 0)
  const laborTotal  = labor.reduce((s,l) => s + l.hours * l.unit_price, 0)
  const taxableSub  = parts.filter(p => p.taxable).reduce((s,p) => s + p.quantity * p.unit_price, 0)
  const noTaxSub    = parts.filter(p => !p.taxable).reduce((s,p) => s + p.quantity * p.unit_price, 0) + laborTotal
  const taxRate     = parseFloat(form.tax_rate) || 0
  const taxAmt      = taxableSub * taxRate / 100
  const grandTotal  = taxableSub + noTaxSub + taxAmt

  function updatePart(i: number, k: keyof PartRow, v: any) { setParts(prev => prev.map((p,idx) => idx===i ? { ...p, [k]:v } : p)) }
  function updateLabor(i: number, k: keyof LaborRow, v: any) { setLabor(prev => prev.map((l,idx) => idx===i ? { ...l, [k]:v } : l)) }
  function removePart(i: number) { setParts(prev => prev.filter((_,idx) => idx!==i)) }
  function removeLabor(i: number) { setLabor(prev => prev.filter((_,idx) => idx!==i)) }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    const payload: any = {
      ...form,
      vendor_id:   form.vendor_id   || null,
      unit_id:     form.equipment_type === 'truck'    ? (form.unit_id    || null) : null,
      trailer_id:  form.equipment_type === 'trailer'  ? (form.trailer_id || null) : null,
      odometer:    form.odometer ? parseInt(String(form.odometer)) : null,
      arrived_at:  form.arrived_at  || null,
      delivered_at:form.delivered_at || null,
      tax_rate:    parseFloat(form.tax_rate) || 8.25,
      parts: parts.filter(p => p.code || p.description),
      labor: labor.filter(l => l.description || l.hours > 0),
    }
    const url = isEdit ? `/api/repair-orders/${ro.id}` : '/api/repair-orders'
    const res = await fetch(url, { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) { onSaved(); onClose() } else { const e = await res.json(); setError(e.error ?? 'Error saving RO') }
    setSaving(false)
  }

  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab===t ? 'border-orange-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`
  const cellInp = 'w-full bg-transparent border-0 text-white text-xs placeholder-gray-600 focus:outline-none focus:bg-gray-800 rounded px-1 py-0.5'

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-5xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-white font-semibold">{isEdit ? `Repair Order #${ro.ro_number}` : 'New Repair Order'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-white" /></button>
        </div>

        <form onSubmit={save} className="flex-1 overflow-y-auto">
          {/* TOP PANELS: JOB + EQUIPMENT */}
          <div className="grid grid-cols-2 gap-0 border-b border-gray-800">
            {/* JOB */}
            <div className="p-5 border-r border-gray-800 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Job</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>RO #</label>
                  <input className={inp + ' opacity-50 cursor-not-allowed'} value={isEdit ? ro.ro_number : 'Auto-generated'} readOnly />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.external_shop} onChange={e => setF('external_shop', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-300">External Shop</span>
                  </label>
                </div>
              </div>
              {form.external_shop && (
                <div>
                  <label className={lbl}>Vendor</label>
                  <select className={inp + ' cursor-pointer'} value={form.vendor_id} onChange={e => setF('vendor_id', e.target.value)}>
                    <option value="">— Select vendor —</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={lbl}>Arrived</label><input className={inp} type="datetime-local" value={form.arrived_at} onChange={e => setF('arrived_at', e.target.value)} /></div>
                <div><label className={lbl}>Delivered</label><input className={inp} type="datetime-local" value={form.delivered_at} onChange={e => setF('delivered_at', e.target.value)} /></div>
              </div>
              <div>
                <label className={lbl}>Status</label>
                <select className={inp + ' cursor-pointer'} value={form.status} onChange={e => setF('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
            </div>

            {/* EQUIPMENT */}
            <div className="p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipment</p>
              <div className="flex gap-2">
                {['truck','trailer'].map(t => (
                  <button key={t} type="button" onClick={() => setF('equipment_type', t)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${form.equipment_type===t ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>{t}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={lbl}>Work on</label>
                  <select className={inp + ' cursor-pointer'} value={form.equipment_type==='truck' ? form.unit_id : form.trailer_id} onChange={e => setF(form.equipment_type==='truck' ? 'unit_id' : 'trailer_id', e.target.value)}>
                    <option value="">— Select —</option>
                    {(form.equipment_type==='truck' ? units : trailers).map((eq:any) => <option key={eq.id} value={eq.id}>{eq.unit_number ?? eq.trailer_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Odometer</label>
                  <input className={inp} type="number" placeholder="150000" value={form.odometer} onChange={e => setF('odometer', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={lbl}>Carrier</label>
                <input className={inp} value={form.carrier} onChange={e => setF('carrier', e.target.value)} placeholder="CargoFi" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><label className={lbl}>Make</label><input className={inp + ' opacity-60'} value={equip?.make ?? ''} readOnly /></div>
                <div><label className={lbl}>Model</label><input className={inp + ' opacity-60'} value={equip?.model ?? ''} readOnly /></div>
                <div><label className={lbl}>Year</label><input className={inp + ' opacity-60'} value={equip?.year ?? ''} readOnly /></div>
                <div><label className={lbl}>VIN</label><input className={inp + ' opacity-60 text-xs'} value={equip?.vin ?? ''} readOnly /></div>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="flex border-b border-gray-800 flex-shrink-0">
            <button type="button" className={tabCls('parts')} onClick={() => setActiveTab('parts')}>Parts & Labor</button>
            <button type="button" className={tabCls('history')} onClick={() => setActiveTab('history')}>Status History</button>
          </div>

          {activeTab === 'parts' && (
            <div className="p-5 space-y-4">
              {/* PARTS */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Parts</p>
                  <button type="button" onClick={() => setParts(p => [...p, emptyPart()])} className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"><Plus className="w-3.5 h-3.5" /> Add Row</button>
                </div>
                <div className="rounded-lg border border-gray-800 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-800/60">
                      <tr>{['Code','Item','Sub-Item','Description','Tax','Qty','Unit $','Amount',''].map(h => <th key={h} className="text-left text-gray-500 font-medium px-2 py-2">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {parts.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-800/30">
                          <td className="px-1 py-1 w-20"><input className={cellInp} value={p.code} onChange={e => updatePart(i,'code',e.target.value)} placeholder="CODE" /></td>
                          <td className="px-1 py-1 w-32"><input className={cellInp} value={p.item} onChange={e => updatePart(i,'item',e.target.value)} placeholder="Item" /></td>
                          <td className="px-1 py-1 w-28"><input className={cellInp} value={p.sub_item} onChange={e => updatePart(i,'sub_item',e.target.value)} placeholder="Sub-item" /></td>
                          <td className="px-1 py-1"><input className={cellInp} value={p.description} onChange={e => updatePart(i,'description',e.target.value)} placeholder="Description" /></td>
                          <td className="px-2 py-1 w-8 text-center"><input type="checkbox" checked={p.taxable} onChange={e => updatePart(i,'taxable',e.target.checked)} className="w-3 h-3 accent-orange-500" /></td>
                          <td className="px-1 py-1 w-16"><input className={cellInp + ' text-right'} type="number" step="0.001" value={p.quantity} onChange={e => updatePart(i,'quantity',parseFloat(e.target.value)||0)} /></td>
                          <td className="px-1 py-1 w-20"><input className={cellInp + ' text-right'} type="number" step="0.01" value={p.unit_price} onChange={e => updatePart(i,'unit_price',parseFloat(e.target.value)||0)} /></td>
                          <td className="px-2 py-1 w-20 text-right text-gray-300 font-medium">${(p.quantity*p.unit_price).toFixed(2)}</td>
                          <td className="px-1 py-1 w-6"><button type="button" onClick={() => removePart(i)} className="text-gray-700 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-800/40 border-t border-gray-700">
                      <tr><td colSpan={7} className="px-3 py-2 text-xs text-gray-400 text-right font-semibold">Parts Total:</td><td className="px-2 py-2 text-right text-white font-bold">${partsTotal.toFixed(2)}</td><td /></tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* LABOR */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Labor</p>
                  <button type="button" onClick={() => setLabor(l => [...l, emptyLabor()])} className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"><Plus className="w-3.5 h-3.5" /> Add Row</button>
                </div>
                <div className="rounded-lg border border-gray-800 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-800/60">
                      <tr>{['Code','Item','Sub-Item','Description','Hours','$/Hr','Amount',''].map(h => <th key={h} className="text-left text-gray-500 font-medium px-2 py-2">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {labor.map((l, i) => (
                        <tr key={i} className="hover:bg-gray-800/30">
                          <td className="px-1 py-1 w-20"><input className={cellInp} value={l.code} onChange={e => updateLabor(i,'code',e.target.value)} placeholder="CODE" /></td>
                          <td className="px-1 py-1 w-32"><input className={cellInp} value={l.item} onChange={e => updateLabor(i,'item',e.target.value)} placeholder="Item" /></td>
                          <td className="px-1 py-1 w-28"><input className={cellInp} value={l.sub_item} onChange={e => updateLabor(i,'sub_item',e.target.value)} placeholder="Sub-item" /></td>
                          <td className="px-1 py-1"><input className={cellInp} value={l.description} onChange={e => updateLabor(i,'description',e.target.value)} placeholder="Description" /></td>
                          <td className="px-1 py-1 w-16"><input className={cellInp + ' text-right'} type="number" step="0.25" value={l.hours} onChange={e => updateLabor(i,'hours',parseFloat(e.target.value)||0)} /></td>
                          <td className="px-1 py-1 w-20"><input className={cellInp + ' text-right'} type="number" step="0.01" value={l.unit_price} onChange={e => updateLabor(i,'unit_price',parseFloat(e.target.value)||0)} /></td>
                          <td className="px-2 py-1 w-20 text-right text-gray-300 font-medium">${(l.hours*l.unit_price).toFixed(2)}</td>
                          <td className="px-1 py-1 w-6"><button type="button" onClick={() => removeLabor(i)} className="text-gray-700 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-800/40 border-t border-gray-700">
                      <tr><td colSpan={6} className="px-3 py-2 text-xs text-gray-400 text-right font-semibold">Labor Total:</td><td className="px-2 py-2 text-right text-white font-bold">${laborTotal.toFixed(2)}</td><td /></tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* TOTALS */}
              <div className="flex justify-end">
                <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 w-72 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400"><span>Subtotal Taxable</span><span>${taxableSub.toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Subtotal No Taxable</span><span>${noTaxSub.toFixed(2)}</span></div>
                  <div className="flex justify-between items-center text-gray-400">
                    <span>Tax</span>
                    <div className="flex items-center gap-1">
                      <input className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-right text-white" type="number" step="0.01" value={form.tax_rate} onChange={e => setF('tax_rate', e.target.value)} />
                      <span className="text-xs">%</span>
                      <span className="ml-2">${taxAmt.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-gray-600 pt-2">
                    <span className="text-white">Total</span>
                    <span className="text-emerald-400">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-5 text-gray-600 text-sm text-center py-16">Status history — coming soon</div>
          )}

          {/* NOTES */}
          <div className="grid grid-cols-2 gap-4 px-5 pb-5 border-t border-gray-800 pt-4">
            <div>
              <label className={lbl}>Internal Notes <span className="text-gray-700">(1600 chars)</span></label>
              <textarea className={inp} rows={3} maxLength={1600} value={form.internal_notes} onChange={e => setF('internal_notes', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Printed Notes <span className="text-gray-700">(1600 chars)</span></label>
              <textarea className={inp} rows={3} maxLength={1600} value={form.printed_notes} onChange={e => setF('printed_notes', e.target.value)} />
            </div>
          </div>

          {/* FOOTER */}
          <div className="px-6 py-4 border-t border-gray-800 bg-gray-900 sticky bottom-0">
            {error && <p className="text-red-400 text-xs mb-3 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">⚠️ {error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-800">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : isEdit ? 'Save Changes' : 'Create Repair Order'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
