'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Upload, FileText, AlertTriangle, AlertCircle, Info,
  Loader2, X, CheckCircle, ArrowRight,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Field, inputCls, selectCls } from '@/components/ui/Field'
import type { OwnerOperator, Driver } from '@/types'

interface ParsedDoc {
  doc_type: string
  extracted: Record<string, any>
  missing: { field: string; severity: 'critical' | 'warning' | 'info'; message: string }[]
  raw_text_summary: string
}

interface Props {
  onClose: () => void
  onLoadCreated: () => void
}

const SEV = {
  critical: { icon: AlertCircle, cls: 'text-red-400 bg-red-400/10 border-red-400/20' },
  warning:  { icon: AlertTriangle, cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  info:     { icon: Info, cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
}

// Fuzzy match: does extracted name contain any word from db name (or vice versa)?
function fuzzyMatch(extracted: string, dbName: string): boolean {
  if (!extracted || !dbName) return false
  const a = extracted.toLowerCase()
  const b = dbName.toLowerCase()
  return a.includes(b) || b.includes(a) ||
    b.split(' ').some(w => w.length > 2 && a.includes(w))
}

export default function DocumentParser({ onClose, onLoadCreated }: Props) {
  const [step, setStep] = useState<'upload' | 'parsing' | 'confirm'>('upload')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<ParsedDoc | null>(null)
  const [oos, setOOs] = useState<OwnerOperator[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [creating, setCreating] = useState(false)

  // Form state — pre-filled after parse
  const [form, setForm] = useState({
    load_number: '', owner_operator_id: '', driver_id: '',
    broker_name: '', broker_mc: '', rate: '', dispatch_fee_pct: '13',
    factoring_fee_pct: '0', commodity: '', weight_lbs: '',
    pickup_date: '', delivery_date: '', bol_number: '',
    crossing_point: '', origin_city: '', origin_state: '',
    dest_city: '', dest_state: '', dest_address: '', trailer_number: '',
    work_order_number: '', total_miles: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/owner-operators').then(r => r.json()),
      fetch('/api/drivers').then(r => r.json()),
    ]).then(([o, d]) => { setOOs(o); setDrivers(d) })
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const parseFile = useCallback(async (file: File) => {
    setStep('parsing')
    setError('')
    setFileName(file.name)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/parse-document', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data: ParsedDoc = await res.json()
      setResult(data)

      // Pre-fill form from extracted data
      const e = data.extracted
      const matchedDriver = drivers.find(d => fuzzyMatch(e.driver_name ?? '', d.name))
      const matchedOO = matchedDriver?.owner_operator_id
        ? oos.find(o => o.id === matchedDriver.owner_operator_id)
        : oos.find(o => fuzzyMatch(e.carrier_name ?? '', o.name) || fuzzyMatch(e.carrier_name ?? '', o.company_name ?? ''))

      // For DX: delivery_appointment is "YYYY-MM-DDTHH:MM" — use date part as delivery_date
      const deliveryDate = e.delivery_appointment
        ? e.delivery_appointment.split('T')[0]
        : (e.delivery_date ?? '')

      setForm(f => ({
        ...f,
        load_number:       e.load_number ?? e.bol_number ?? '',
        work_order_number: e.work_order_number ?? '',
        broker_name:       e.broker_name ?? e.consignee_name ?? '',
        broker_mc:         e.broker_mc ?? '',
        commodity:         e.commodity ?? '',
        weight_lbs:        e.weight_lbs ? String(e.weight_lbs) : '',
        pickup_date:       e.pickup_date ?? '',
        delivery_date:     deliveryDate,
        bol_number:        e.bol_number ?? e.pedimento ?? '',
        origin_city:       e.origin_city ?? '',
        origin_state:      e.origin_state ?? '',
        dest_facility:     e.dest_facility ?? '',
        dest_city:         e.dest_city ?? '',
        dest_state:        e.dest_state ?? '',
        dest_address:      e.dest_address ?? '',
        trailer_number:    e.trailer_number ?? '',
        total_miles:       e.total_miles ? String(Math.round(e.total_miles)) : '',
        rate:              e.rate ? String(e.rate) : '',
        owner_operator_id: matchedOO?.id ?? '',
        driver_id:         matchedDriver?.id ?? '',
        dispatch_fee_pct:  matchedOO ? String(matchedOO.dispatch_fee_pct) : '13',
      }))

      setStep('confirm')
    } catch (e: any) {
      setError(e.message)
      setStep('upload')
    }
  }, [drivers, oos])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  async function handleCreate(ev: React.FormEvent) {
    ev.preventDefault()
    setCreating(true)

    const loadPayload = {
      load_number: form.load_number || `CF-${Date.now().toString().slice(-5)}`,
      owner_operator_id: form.owner_operator_id,
      driver_id: form.driver_id,
      broker_name: form.broker_name,
      broker_mc: form.broker_mc || null,
      rate: parseFloat(form.rate) || 0,
      dispatch_fee_pct: parseFloat(form.dispatch_fee_pct),
      factoring_fee_pct: parseFloat(form.factoring_fee_pct) || 0,
      commodity: form.commodity || null,
      weight_lbs: form.weight_lbs ? parseFloat(form.weight_lbs) : null,
      pickup_date: form.pickup_date || null,
      delivery_date: form.delivery_date || null,
      bol_number: form.bol_number || null,
      crossing_point: form.crossing_point || null,
      work_order_number: form.work_order_number || null,
      total_miles: form.total_miles ? parseInt(form.total_miles) : null,
      trip_status: 'open',
      raw_rate_con_text: result?.raw_text_summary ?? null,
    }

    const res = await fetch('/api/loads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loadPayload),
    })

    if (res.ok) {
      const load = await res.json()

      // Create stops
      const stops = []
      if (form.origin_city) stops.push({
        stop_type: 'pickup', sequence: 1,
        city: form.origin_city, state: form.origin_state, country: 'MX',
        facility_name: 'DX RANCH – NUEVO LAREDO',
      })
      if (form.dest_city) stops.push({
        stop_type: 'delivery', sequence: 2,
        city: form.dest_city, state: form.dest_state, country: 'US',
        address: (form as any).dest_address || null,
        facility_name: (form as any).dest_facility || null,
      })
      if (stops.length) {
        await fetch('/api/stops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ load_id: load.id, stops }),
        })
      }

      onLoadCreated()
    } else {
      const err = await res.json()
      setError(err.error ?? 'Error creating load')
    }
    setCreating(false)
  }

  const inp = inputCls
  const lbl = 'block text-xs text-gray-400 mb-1'
  const missing = result?.missing ?? []
  const criticals = missing.filter(m => m.severity === 'critical')

  return (
    <Modal title="Parse Document → Create Load" onClose={onClose} width="max-w-2xl">

      {/* STEP 1 — Upload */}
      {step === 'upload' && (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('doc-file')?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
              ${dragging ? 'border-orange-500 bg-orange-500/5' : 'border-gray-700 hover:border-gray-500'}`}
          >
            <Upload className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">Drop BOL, Rate Con, or POD here</p>
            <p className="text-gray-500 text-sm">PDF · JPG · PNG — Claude AI extrae todo automáticamente</p>
            <input id="doc-file" type="file" className="hidden"
              accept=".pdf,image/jpeg,image/png,image/webp" onChange={handleInput} />
          </div>
          {error && <p className="text-red-400 text-sm text-center mt-3">⚠️ {error}</p>}
        </div>
      )}

      {/* STEP 2 — Parsing */}
      {step === 'parsing' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
          <div className="text-center">
            <p className="text-white font-medium">Leyendo documento con Claude AI...</p>
            <p className="text-gray-500 text-sm mt-1">{fileName}</p>
          </div>
        </div>
      )}

      {/* STEP 3 — Confirm & Create */}
      {step === 'confirm' && result && (
        <form onSubmit={handleCreate} className="space-y-5">
          {/* DX Assignment banner */}
          {result.doc_type === 'dx_assignment' && (
            <div className="flex items-start gap-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2.5 text-xs text-blue-300">
              <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-blue-200">DX Xpress — Asignación de viaje detectada</span>
                <span className="ml-2 text-blue-400">Rate no incluido en el doc — ingresar manualmente (pago semanal DX)</span>
              </div>
            </div>
          )}

          {/* Alerts */}
          {missing.length > 0 && (
            <div className="space-y-1.5">
              {missing.map((m, i) => {
                const cfg = SEV[m.severity]
                return (
                  <div key={i} className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-xs ${cfg.cls}`}>
                    <cfg.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span><b>{m.field}:</b> {m.message}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* OO + Driver */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Owner Operator *
                {form.owner_operator_id && <span className="ml-1 text-green-400">✓ auto-matched</span>}
              </label>
              <select className={selectCls} value={form.owner_operator_id}
                onChange={e => {
                  const oo = oos.find(o => o.id === e.target.value)
                  set('owner_operator_id', e.target.value)
                  if (oo) set('dispatch_fee_pct', String(oo.dispatch_fee_pct))
                }} required>
                <option value="">Select OO...</option>
                {oos.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Driver *
                {form.driver_id && <span className="ml-1 text-green-400">✓ auto-matched</span>}
                {result.extracted.driver_name && !form.driver_id &&
                  <span className="ml-1 text-yellow-400">— "{result.extracted.driver_name}" no encontrado</span>}
              </label>
              <select className={selectCls} value={form.driver_id}
                onChange={e => set('driver_id', e.target.value)} required>
                <option value="">Select Driver...</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          {/* Load # + Broker */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Load # (auto)</label>
              <input className={inp} value={form.load_number}
                onChange={e => set('load_number', e.target.value)} placeholder="CF-001" />
            </div>
            <div>
              <label className={lbl}>Broker / Customer *</label>
              <input className={inp} value={form.broker_name}
                onChange={e => set('broker_name', e.target.value)} required />
            </div>
          </div>

          {/* Folio / WO# + Total Miles + Trailer */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>
                Folio / WO #{form.work_order_number && <span className="ml-1 text-green-400">✓</span>}
              </label>
              <input className={inp} value={form.work_order_number}
                onChange={e => set('work_order_number', e.target.value)} placeholder="1126732" />
            </div>
            <div>
              <label className={lbl}>
                Total Miles{form.total_miles && <span className="ml-1 text-green-400">✓</span>}
              </label>
              <input className={inp} type="number" value={form.total_miles}
                onChange={e => set('total_miles', e.target.value)} placeholder="1385" />
            </div>
            <div>
              <label className={lbl}>
                Trailer #{form.trailer_number && <span className="ml-1 text-green-400">✓</span>}
              </label>
              <input className={inp} value={form.trailer_number}
                onChange={e => set('trailer_number', e.target.value)} placeholder="FR432" />
            </div>
          </div>

          {/* Rate + Fees */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>
                Rate (USD) *
                {!form.rate && <span className="ml-1 text-red-400">⚠ falta</span>}
              </label>
              <input className={`${inp} ${!form.rate ? 'border-red-500/50 focus:border-red-500' : ''}`}
                type="number" placeholder="5650" value={form.rate}
                onChange={e => set('rate', e.target.value)} required />
            </div>
            <div>
              <label className={lbl}>Dispatch %</label>
              <input className={inp} type="number" step="0.5" value={form.dispatch_fee_pct}
                onChange={e => set('dispatch_fee_pct', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Factoring %</label>
              <input className={inp} type="number" step="0.1" value={form.factoring_fee_pct}
                onChange={e => set('factoring_fee_pct', e.target.value)} />
            </div>
          </div>

          {/* Fee preview */}
          {form.rate && (
            <div className="bg-gray-800/50 rounded-lg p-3 text-xs grid grid-cols-3 gap-4">
              {(() => {
                const r = parseFloat(form.rate) || 0
                const df = r * parseFloat(form.dispatch_fee_pct) / 100
                const ff = r * parseFloat(form.factoring_fee_pct) / 100
                return (
                  <>
                    <div className="text-center">
                      <p className="text-gray-500">CargoFi fee</p>
                      <p className="text-orange-400 font-semibold text-base">${df.toFixed(0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">OO neto</p>
                      <p className="text-green-400 font-semibold text-base">${(r - df - ff).toFixed(0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">Rate bruto</p>
                      <p className="text-white font-semibold text-base">${r.toLocaleString()}</p>
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* Route */}
          <div className="grid grid-cols-4 gap-2">
            <input className={inp} placeholder="Origin city" value={form.origin_city}
              onChange={e => set('origin_city', e.target.value)} />
            <input className={inp} placeholder="MX" maxLength={2} value={form.origin_state}
              onChange={e => set('origin_state', e.target.value.toUpperCase())} />
            <input className={inp} placeholder="Dest city" value={form.dest_city}
              onChange={e => set('dest_city', e.target.value)} />
            <input className={inp} placeholder="MI" maxLength={2} value={form.dest_state}
              onChange={e => set('dest_state', e.target.value.toUpperCase())} />
          </div>

          {/* Dates + BOL */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Pickup Date</label>
              <input className={inp} type="date" value={form.pickup_date}
                onChange={e => set('pickup_date', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Delivery Date</label>
              <input className={inp} type="date" value={form.delivery_date}
                onChange={e => set('delivery_date', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>BOL / Pedimento</label>
              <input className={inp} value={form.bol_number}
                onChange={e => set('bol_number', e.target.value)} />
            </div>
          </div>

          {/* Commodity + Crossing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Commodity</label>
              <input className={inp} value={form.commodity}
                onChange={e => set('commodity', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Crossing Point</label>
              <input className={inp} placeholder="Laredo/Nuevo Laredo" value={form.crossing_point}
                onChange={e => set('crossing_point', e.target.value)} />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">⚠️ {error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setStep('upload'); setResult(null) }}
              className="border border-gray-700 text-gray-300 rounded-lg px-4 py-2.5 text-sm hover:bg-gray-800 transition-colors">
              ← Volver
            </button>
            <button type="submit" disabled={creating}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
              {creating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando load...</>
                : <><CheckCircle className="w-4 h-4" /> Crear Load</>
              }
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
