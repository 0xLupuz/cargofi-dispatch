'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Truck, User, DollarSign, MapPin, FileText,
  Plus, Trash2, Phone, Save, AlertTriangle, Loader2,
  Package, ChevronDown,
} from 'lucide-react'
import DocUploader from '@/components/ui/DocUploader'
import type { Load, TripStatus } from '@/types'

const LOAD_DOCS = [
  { value: 'rate_con',  label: 'Rate Con' },
  { value: 'bol',       label: 'BOL / Carta Porte' },
  { value: 'pod',       label: 'POD / Entrega' },
  { value: 'invoice',   label: 'Invoice / Factura' },
  { value: 'other',     label: 'Otro' },
]

const STATUSES: { value: TripStatus; label: string; color: string }[] = [
  { value: 'open',       label: 'Open',       color: 'bg-blue-600'    },
  { value: 'in_transit', label: 'In Transit', color: 'bg-amber-500'   },
  { value: 'delivered',  label: 'Delivered',  color: 'bg-emerald-600' },
]

const DEDUCTION_TYPES = [
  { value: 'fuel_advance', label: 'Fuel Advance' },
  { value: 'lumper',       label: 'Lumper' },
  { value: 'tolls',        label: 'Tolls' },
  { value: 'escrow',       label: 'Escrow' },
  { value: 'repair',       label: 'Repair' },
  { value: 'other',        label: 'Other' },
]

const inp = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors'
const lbl = 'block text-xs text-gray-500 mb-1'

interface Props {
  loadId: string
  onClose: () => void
  onUpdated: () => void
}

export default function LoadDrawer({ loadId, onClose, onUpdated }: Props) {
  const [load, setLoad] = useState<Load | null>(null)
  const [tab, setTab] = useState<'info' | 'financials' | 'documents'>('info')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)

  // Editable fields
  const [form, setForm] = useState<Record<string, any>>({})
  const [deductions, setDeductions] = useState<any[]>([])
  const [loadDrivers, setLoadDrivers] = useState<any[]>([])
  const [allDrivers, setAllDrivers] = useState<any[]>([])
  const [newDed, setNewDed] = useState({ description: '', amount: '', type: 'fuel_advance' })
  const [addingDed, setAddingDed] = useState(false)
  const [addingDriver, setAddingDriver] = useState(false)
  const [newDriver, setNewDriver] = useState({ driver_id: '', miles: '', rate_per_mile: '' })

  const setF = (k: string, v: any) => { setForm(f => ({ ...f, [k]: v })); setDirty(true) }

  const fetchLoad = useCallback(async () => {
    const res = await fetch(`/api/loads/${loadId}`)
    if (res.ok) {
      const data = await res.json()
      setLoad(data)
      setForm({
        load_number: data.load_number ?? '',
        work_order_number: data.work_order_number ?? '',
        trip_status: data.trip_status ?? 'open',
        broker_name: data.broker_name ?? '',
        broker_mc: data.broker_mc ?? '',
        broker_email: data.broker_email ?? '',
        broker_phone: data.broker_phone ?? '',
        rate: data.rate ?? '',
        dispatch_fee_pct: data.dispatch_fee_pct ?? 13,
        factoring_fee_pct: data.factoring_fee_pct ?? 0,
        commodity: data.commodity ?? '',
        weight_lbs: data.weight_lbs ?? '',
        pickup_date: data.pickup_date ?? '',
        delivery_date: data.delivery_date ?? '',
        bol_number: data.bol_number ?? '',
        po_number: data.po_number ?? '',
        crossing_point: data.crossing_point ?? '',
        mx_carrier: data.mx_carrier ?? '',
        total_miles: data.total_miles ?? '',
        fuel_cost: data.fuel_cost ?? '',
      })
      setDeductions(data.deductions ?? [])
      setLoadDrivers((data.load_drivers ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order))
      setDirty(false)
    }
  }, [loadId])

  useEffect(() => { fetchLoad() }, [fetchLoad])
  useEffect(() => {
    fetch('/api/drivers').then(r => r.json()).then(d => setAllDrivers(Array.isArray(d) ? d : []))
  }, [])

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function handleSave() {
    setSaving(true); setError('')
    const payload: Record<string, any> = { ...form }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    payload.rate = parseFloat(payload.rate) || 0
    payload.dispatch_fee_pct = parseFloat(payload.dispatch_fee_pct) || 0
    payload.factoring_fee_pct = parseFloat(payload.factoring_fee_pct) || 0
    payload.total_miles = payload.total_miles ? parseInt(payload.total_miles) : null
    payload.fuel_cost = payload.fuel_cost ? parseFloat(payload.fuel_cost) : null

    try {
      const res = await fetch(`/api/loads/${loadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) { setDirty(false); onUpdated(); await fetchLoad() }
      else { const e = await res.json(); setError(e.error ?? 'Error al guardar') }
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  async function handleDelete() {
    const ok = confirm(`⚠️ ELIMINAR LOAD #${load?.load_number}\n\nEsto borrará el load y todos sus datos.\nEsta acción es IRREVERSIBLE.\n\n¿Continuar?`)
    if (!ok) return
    setDeleting(true)
    const res = await fetch(`/api/loads/${loadId}`, { method: 'DELETE' })
    if (res.ok) { onUpdated(); onClose() }
    setDeleting(false)
  }

  async function addDeduction() {
    if (!newDed.description || !newDed.amount) return
    const res = await fetch('/api/deductions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        load_id: loadId,
        description: newDed.description,
        amount: parseFloat(newDed.amount),
        type: newDed.type,
      }),
    })
    if (res.ok) {
      const ded = await res.json()
      setDeductions(prev => [...prev, ded])
      setNewDed({ description: '', amount: '', type: 'fuel_advance' })
      setAddingDed(false)
    }
  }

  async function removeDeduction(id: string) {
    await fetch(`/api/deductions/${id}`, { method: 'DELETE' })
    setDeductions(prev => prev.filter(d => d.id !== id))
  }

  async function addDriver() {
    if (!newDriver.miles || !newDriver.rate_per_mile) return
    const driverObj = allDrivers.find(d => d.id === newDriver.driver_id)
    const payload = {
      load_id: loadId,
      driver_id: newDriver.driver_id || null,
      driver_name: driverObj ? (driverObj.name ?? 'Driver') : 'Driver',
      miles: parseInt(newDriver.miles),
      rate_per_mile: parseFloat(newDriver.rate_per_mile),
      sort_order: loadDrivers.length,
    }
    const res = await fetch('/api/load-drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const row = await res.json()
      setLoadDrivers(prev => [...prev, row])
      setNewDriver({ driver_id: '', miles: '', rate_per_mile: '' })
      setAddingDriver(false)
    }
  }

  async function removeDriver(id: string) {
    await fetch(`/api/load-drivers/${id}`, { method: 'DELETE' })
    setLoadDrivers(prev => prev.filter(d => d.id !== id))
  }

  // Financial calculations
  const rate = parseFloat(String(form.rate)) || 0
  const dispatchPct = parseFloat(String(form.dispatch_fee_pct)) || 0
  const factoringPct = parseFloat(String(form.factoring_fee_pct)) || 0
  const dispatchFee = rate * dispatchPct / 100
  const factoringFee = rate * factoringPct / 100
  const totalDeductions = deductions.reduce((s, d) => s + Number(d.amount), 0)
  const totalDriverPay = loadDrivers.reduce((s, d) => s + Number(d.total_pay || 0), 0)
  const fuelCost = parseFloat(String(form.fuel_cost)) || 0
  const ooNet = rate - dispatchFee - factoringFee - totalDriverPay - fuelCost - totalDeductions

  const currentStatus = STATUSES.find(s => s.value === form.trip_status)
  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${tab === t ? 'border-orange-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`

  if (!load) {
    return (
      <div className="fixed inset-0 bg-black/60 z-40 flex justify-end" onClick={onClose}>
        <div className="w-full max-w-xl bg-gray-900 h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-gray-900 h-full flex flex-col border-l border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="text-white font-bold">#{load.load_number}</h2>
              <p className="text-xs text-gray-500">{load.broker_name}</p>
            </div>
            {/* Trip status selector */}
            <div className="relative">
              <select
                value={form.trip_status}
                onChange={e => setF('trip_status', e.target.value)}
                className={`text-xs font-medium rounded-full px-3 py-1 border-0 cursor-pointer appearance-none pr-6 ${currentStatus?.color ?? 'bg-gray-600'} text-white`}
              >
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-white/60 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 flex-shrink-0">
          <button className={tabCls('info')} onClick={() => setTab('info')}>Información</button>
          <button className={tabCls('financials')} onClick={() => setTab('financials')}>Financiero</button>
          <button className={tabCls('documents')} onClick={() => setTab('documents')}>Documentos</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── INFO TAB ── */}
          {tab === 'info' && (
            <>
              {/* Parties */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Truck className="w-3.5 h-3.5 text-orange-400" />
                    <p className="text-xs text-gray-400 font-medium">Owner Operator</p>
                  </div>
                  <p className="text-sm text-white font-medium">{load.owner_operator?.name ?? '—'}</p>
                  {load.owner_operator?.phone_whatsapp && (
                    <a href={`https://wa.me/${load.owner_operator.phone_whatsapp.replace(/\D/g,'')}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 mt-1">
                      <Phone className="w-3 h-3" />
                      {load.owner_operator.phone_whatsapp}
                    </a>
                  )}
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <p className="text-xs text-gray-400 font-medium">Driver</p>
                  </div>
                  <p className="text-sm text-white font-medium">{load.driver?.name ?? '—'}</p>
                  {load.driver?.phone_whatsapp && (
                    <a href={`https://wa.me/${load.driver.phone_whatsapp.replace(/\D/g,'')}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 mt-1">
                      <Phone className="w-3 h-3" />
                      {load.driver.phone_whatsapp}
                    </a>
                  )}
                </div>
              </div>

              {/* Load # (read-only) + WO# + Broker */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Load # <span className="text-gray-700">(auto)</span></label>
                  <input className={inp + ' opacity-50 cursor-not-allowed'} value={form.load_number} readOnly />
                </div>
                <div>
                  <label className={lbl}>Work Order # <span className="text-gray-600">(broker ref)</span></label>
                  <input className={inp} value={form.work_order_number} onChange={e => setF('work_order_number', e.target.value)} placeholder="WO-12345" />
                </div>
              </div>
              <div>
                <label className={lbl}>Broker / Customer</label>
                <input className={inp} value={form.broker_name} onChange={e => setF('broker_name', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Broker MC</label>
                  <input className={inp} value={form.broker_mc} onChange={e => setF('broker_mc', e.target.value)} placeholder="MC123456" />
                </div>
                <div>
                  <label className={lbl}>Broker Email</label>
                  <input className={inp} value={form.broker_email} onChange={e => setF('broker_email', e.target.value)} />
                </div>
              </div>

              {/* Route */}
              {load.stops && load.stops.length > 0 && (
                <div>
                  <label className={lbl}>Ruta</label>
                  <div className="space-y-2">
                    {[...load.stops].sort((a,b) => a.sequence - b.sequence).map(stop => (
                      <div key={stop.id} className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
                        <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${stop.stop_type === 'pickup' ? 'text-green-400' : 'text-red-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 capitalize">{stop.stop_type}</p>
                          <p className="text-sm text-white truncate">{stop.city}, {stop.state} {stop.country !== 'US' ? `(${stop.country})` : ''}</p>
                        </div>
                        {stop.appointment_at && (
                          <p className="text-xs text-gray-500">{new Date(stop.appointment_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Pickup Date</label>
                  <input className={inp} type="date" value={form.pickup_date} onChange={e => setF('pickup_date', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Delivery Date</label>
                  <input className={inp} type="date" value={form.delivery_date} onChange={e => setF('delivery_date', e.target.value)} />
                </div>
              </div>

              {/* Cargo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Commodity</label>
                  <input className={inp} value={form.commodity} onChange={e => setF('commodity', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Weight (lbs)</label>
                  <input className={inp} type="number" value={form.weight_lbs} onChange={e => setF('weight_lbs', e.target.value)} />
                </div>
              </div>

              {/* Docs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>BOL #</label>
                  <input className={inp} value={form.bol_number} onChange={e => setF('bol_number', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>PO #</label>
                  <input className={inp} value={form.po_number} onChange={e => setF('po_number', e.target.value)} />
                </div>
              </div>

              {/* Cross-border */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Crossing Point</label>
                  <input className={inp} value={form.crossing_point} onChange={e => setF('crossing_point', e.target.value)} placeholder="Laredo/Nuevo Laredo" />
                </div>
                <div>
                  <label className={lbl}>Carrier MX (permiso SCT)</label>
                  <input className={inp} value={form.mx_carrier} onChange={e => setF('mx_carrier', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* ── FINANCIALS TAB ── */}
          {tab === 'financials' && (
            <>
              {/* Rate + Fees */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={lbl}>Rate (USD)</label>
                  <input className={inp} type="number" value={form.rate} onChange={e => setF('rate', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Dispatch %</label>
                  <input className={inp} type="number" step="0.5" value={form.dispatch_fee_pct} onChange={e => setF('dispatch_fee_pct', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Factoring %</label>
                  <input className={inp} type="number" step="0.1" value={form.factoring_fee_pct} onChange={e => setF('factoring_fee_pct', e.target.value)} placeholder="0" />
                </div>
              </div>

              {/* Miles + Fuel */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Total Miles</label>
                  <input className={inp} type="number" placeholder="1,200" value={form.total_miles} onChange={e => setF('total_miles', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Fuel Cost (USD)</label>
                  <input className={inp} type="number" step="0.01" placeholder="0.00" value={form.fuel_cost} onChange={e => setF('fuel_cost', e.target.value)} />
                </div>
              </div>

              {/* Drivers section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                    Driver Pay <span className="text-gray-600 normal-case">({loadDrivers.length} driver{loadDrivers.length !== 1 ? 's' : ''})</span>
                  </p>
                  <button onClick={() => setAddingDriver(!addingDriver)}
                    className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Driver
                  </button>
                </div>

                {addingDriver && (
                  <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 mb-2 border border-gray-700">
                    <select className={inp + ' text-xs'} value={newDriver.driver_id}
                      onChange={e => setNewDriver(n => ({ ...n, driver_id: e.target.value }))}>
                      <option value="">— Select driver (optional) —</option>
                      {allDrivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input className={inp + ' text-xs'} type="number" placeholder="Miles" value={newDriver.miles}
                        onChange={e => setNewDriver(n => ({ ...n, miles: e.target.value }))} />
                      <input className={inp + ' text-xs'} type="number" step="0.01" placeholder="$/mile (e.g. 0.38)"
                        value={newDriver.rate_per_mile}
                        onChange={e => setNewDriver(n => ({ ...n, rate_per_mile: e.target.value }))} />
                    </div>
                    {newDriver.miles && newDriver.rate_per_mile && (
                      <p className="text-xs text-emerald-400">
                        Pay: ${(parseInt(newDriver.miles) * parseFloat(newDriver.rate_per_mile)).toFixed(2)}
                        <span className="text-gray-500 ml-1">({newDriver.miles} mi × ${newDriver.rate_per_mile}/mi)</span>
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setAddingDriver(false)}
                        className="flex-1 border border-gray-600 text-gray-400 rounded-lg py-1.5 text-xs hover:bg-gray-700 transition-colors">Cancel</button>
                      <button onClick={addDriver}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-1.5 text-xs transition-colors">Add</button>
                    </div>
                  </div>
                )}

                {loadDrivers.length === 0 && !addingDriver && (
                  <p className="text-xs text-gray-600">Sin drivers asignados. Agrega para calcular driver pay.</p>
                )}
                <div className="space-y-1.5">
                  {loadDrivers.map(d => (
                    <div key={d.id} className="flex items-center justify-between bg-gray-800/40 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm text-white">{d.driver_name || (d.driver?.name ?? '')}</p>
                        <p className="text-xs text-gray-500">{d.miles} mi × ${Number(d.rate_per_mile).toFixed(2)}/mi</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-red-400 text-sm font-medium">-${Number(d.total_pay).toFixed(2)}</span>
                        <button onClick={() => removeDriver(d.id)}
                          className="text-gray-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settlement preview */}
              <div className="bg-gray-800/60 rounded-xl p-4 space-y-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Settlement Preview</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Gross Rate</span>
                  <span className="text-white font-medium">${rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Dispatch Fee ({dispatchPct}%)</span>
                  <span className="text-orange-400">-${dispatchFee.toFixed(2)}</span>
                </div>
                {factoringFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Factoring ({factoringPct}%)</span>
                    <span className="text-red-400">-${factoringFee.toFixed(2)}</span>
                  </div>
                )}
                {loadDrivers.map(d => (
                  <div key={d.id} className="flex justify-between text-sm">
                    <span className="text-gray-400">Driver: {d.driver_name}</span>
                    <span className="text-red-400">-${Number(d.total_pay).toFixed(2)}</span>
                  </div>
                ))}
                {fuelCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Fuel</span>
                    <span className="text-red-400">-${fuelCost.toFixed(2)}</span>
                  </div>
                )}
                {deductions.map(d => (
                  <div key={d.id} className="flex justify-between text-sm">
                    <span className="text-gray-400">{d.description}</span>
                    <span className="text-red-400">-${Number(d.amount).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-600 pt-2 mt-2 flex justify-between">
                  <span className="text-white font-semibold">OO Net</span>
                  <span className={`font-bold text-lg ${ooNet >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${ooNet.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Deductions ({deductions.length})</p>
                  <button onClick={() => setAddingDed(!addingDed)}
                    className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {addingDed && (
                  <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 mb-2 border border-gray-700">
                    <div className="grid grid-cols-2 gap-2">
                      <select className={inp + ' text-xs'} value={newDed.type}
                        onChange={e => setNewDed(n => ({ ...n, type: e.target.value }))}>
                        {DEDUCTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <input className={inp + ' text-xs'} type="number" placeholder="Amount $"
                        value={newDed.amount} onChange={e => setNewDed(n => ({ ...n, amount: e.target.value }))} />
                    </div>
                    <input className={inp + ' text-xs'} placeholder="Description"
                      value={newDed.description} onChange={e => setNewDed(n => ({ ...n, description: e.target.value }))} />
                    <div className="flex gap-2">
                      <button onClick={() => setAddingDed(false)}
                        className="flex-1 border border-gray-600 text-gray-400 rounded-lg py-1.5 text-xs hover:bg-gray-700 transition-colors">Cancel</button>
                      <button onClick={addDeduction}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-1.5 text-xs transition-colors">Add</button>
                    </div>
                  </div>
                )}

                {deductions.length === 0 && !addingDed && (
                  <p className="text-xs text-gray-600">Sin deductions. Agrega fuel advance, lumper, etc.</p>
                )}
                <div className="space-y-1.5">
                  {deductions.map(d => (
                    <div key={d.id} className="flex items-center justify-between bg-gray-800/40 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm text-white">{d.description}</p>
                        <p className="text-xs text-gray-500 capitalize">{d.type.replace('_',' ')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-red-400 text-sm font-medium">-${Number(d.amount).toFixed(2)}</span>
                        <button onClick={() => removeDeduction(d.id)}
                          className="text-gray-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── DOCUMENTS TAB ── */}
          {tab === 'documents' && (
            <DocUploader entityType="load" entityId={loadId} categories={LOAD_DOCS} />
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-gray-800 space-y-2">
          {error && (
            <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">⚠️ {error}</p>
          )}
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={deleting}
              className="border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg px-3 py-2.5 text-xs transition-colors disabled:opacity-50">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            <button onClick={onClose}
              className="flex-1 border border-gray-700 text-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-800 transition-colors">
              Cerrar
            </button>
            <button onClick={handleSave} disabled={saving || !dirty}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Guardando...' : dirty ? 'Guardar cambios' : 'Sin cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
