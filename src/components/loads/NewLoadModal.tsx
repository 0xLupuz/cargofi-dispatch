'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import type { OwnerOperator, Driver } from '@/types'

interface Props {
  onClose: () => void
  onCreated: (load: any) => void
}

export default function NewLoadModal({ onClose, onCreated }: Props) {
  const [oos, setOOs] = useState<OwnerOperator[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    work_order_number: '',   // Client/broker's reference # (optional)
    owner_operator_id: '',
    driver_id: '',
    broker_name: '',
    broker_mc: '',
    broker_email: '',
    rate: '',
    dispatch_fee_pct: '13',
    factoring_fee_pct: '0',
    commodity: '',
    pickup_date: '',
    delivery_date: '',
    bol_number: '',
    crossing_point: '',
    // stops
    origin_city: '', origin_state: '',
    dest_city: '', dest_state: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/owner-operators').then(r => r.json()),
      fetch('/api/drivers').then(r => r.json()),
    ]).then(([ooData, driverData]) => {
      setOOs(ooData)
      setDrivers(driverData)
    })
  }, [])

  // Auto-fill dispatch fee when OO is selected
  useEffect(() => {
    const oo = oos.find(o => o.id === form.owner_operator_id)
    if (oo) setForm(f => ({ ...f, dispatch_fee_pct: String(oo.dispatch_fee_pct) }))
  }, [form.owner_operator_id, oos])

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload: any = {
      work_order_number: form.work_order_number || null,  // client's ref # (optional)
      owner_operator_id: form.owner_operator_id,
      driver_id: form.driver_id,
      broker_name: form.broker_name,
      broker_mc: form.broker_mc || null,
      broker_email: form.broker_email || null,
      rate: parseFloat(form.rate),
      dispatch_fee_pct: parseFloat(form.dispatch_fee_pct),
      factoring_fee_pct: parseFloat(form.factoring_fee_pct) || 0,
      commodity: form.commodity || null,
      pickup_date: form.pickup_date || null,
      delivery_date: form.delivery_date || null,
      bol_number: form.bol_number || null,
      crossing_point: form.crossing_point || null,
      trip_status: 'open',  // always starts as Open
    }

    const res = await fetch('/api/loads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const newLoad = await res.json()

      // Add stops if provided
      if (form.origin_city && form.dest_city) {
        await fetch('/api/stops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            load_id: newLoad.id,
            stops: [
              { stop_type: 'pickup', sequence: 1, city: form.origin_city, state: form.origin_state, country: 'US' },
              { stop_type: 'delivery', sequence: 2, city: form.dest_city, state: form.dest_state, country: 'MX' },
            ]
          }),
        })
      }

      onCreated(newLoad)
    }
    setLoading(false)
  }

  const input = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
  const label = "block text-xs text-gray-400 mb-1"

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">New Load</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Load # auto-generated + WO # + Broker */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Work Order # <span className="text-gray-600">(broker ref)</span></label>
              <input className={input} placeholder="WO-12345, TQL-98765..." value={form.work_order_number}
                onChange={e => set('work_order_number', e.target.value)} />
              <p className="text-[10px] text-gray-600 mt-1">Load # CF-XXXX se genera automáticamente</p>
            </div>
            <div>
              <label className={label}>Broker / Customer *</label>
              <input className={input} placeholder="Echo Global, TQL..." value={form.broker_name}
                onChange={e => set('broker_name', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Broker MC</label>
              <input className={input} placeholder="MC123456" value={form.broker_mc}
                onChange={e => set('broker_mc', e.target.value)} />
            </div>
            <div>
              <label className={label}>Broker Email</label>
              <input className={input} type="email" placeholder="dispatch@broker.com" value={form.broker_email}
                onChange={e => set('broker_email', e.target.value)} />
            </div>
          </div>

          {/* OO + Driver */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Owner Operator *</label>
              <select className={input} value={form.owner_operator_id}
                onChange={e => set('owner_operator_id', e.target.value)} required>
                <option value="">Select OO...</option>
                {oos.map(oo => (
                  <option key={oo.id} value={oo.id}>{oo.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Driver *</label>
              <select className={input} value={form.driver_id}
                onChange={e => set('driver_id', e.target.value)} required>
                <option value="">Select Driver...</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rate + Fees */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={label}>Rate (USD) *</label>
              <input className={input} type="number" placeholder="5650" value={form.rate}
                onChange={e => set('rate', e.target.value)} required />
            </div>
            <div>
              <label className={label}>Dispatch Fee %</label>
              <input className={input} type="number" step="0.5" value={form.dispatch_fee_pct}
                onChange={e => set('dispatch_fee_pct', e.target.value)} />
            </div>
            <div>
              <label className={label}>Factoring Fee %</label>
              <input className={input} type="number" step="0.1" value={form.factoring_fee_pct}
                onChange={e => set('factoring_fee_pct', e.target.value)} />
            </div>
          </div>

          {/* Fee preview */}
          {form.rate && (
            <div className="bg-gray-800/50 rounded-lg p-3 text-xs space-y-1">
              {(() => {
                const rate = parseFloat(form.rate) || 0
                const dispatchFee = rate * parseFloat(form.dispatch_fee_pct) / 100
                const factoringFee = rate * parseFloat(form.factoring_fee_pct) / 100
                const ooGross = rate - factoringFee
                const ooNet = ooGross - dispatchFee
                return (
                  <>
                    <div className="flex justify-between text-gray-400">
                      <span>Gross rate</span><span className="text-white">${rate.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Dispatch fee ({form.dispatch_fee_pct}%)</span>
                      <span className="text-orange-400">-${dispatchFee.toFixed(2)}</span>
                    </div>
                    {factoringFee > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Factoring fee ({form.factoring_fee_pct}%)</span>
                        <span className="text-red-400">-${factoringFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t border-gray-700 pt-1 mt-1">
                      <span className="text-gray-300">OO Net (before deductions)</span>
                      <span className="text-green-400">${ooNet.toFixed(2)}</span>
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* Route */}
          <div>
            <label className={label}>Route</label>
            <div className="grid grid-cols-4 gap-2">
              <input className={input} placeholder="Origin city" value={form.origin_city}
                onChange={e => set('origin_city', e.target.value)} />
              <input className={input} placeholder="TX" maxLength={2} value={form.origin_state}
                onChange={e => set('origin_state', e.target.value.toUpperCase())} />
              <input className={input} placeholder="Dest city" value={form.dest_city}
                onChange={e => set('dest_city', e.target.value)} />
              <input className={input} placeholder="MI" maxLength={2} value={form.dest_state}
                onChange={e => set('dest_state', e.target.value.toUpperCase())} />
            </div>
          </div>

          {/* Dates + BOL */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={label}>Pickup Date</label>
              <input className={input} type="date" value={form.pickup_date}
                onChange={e => set('pickup_date', e.target.value)} />
            </div>
            <div>
              <label className={label}>Delivery Date</label>
              <input className={input} type="date" value={form.delivery_date}
                onChange={e => set('delivery_date', e.target.value)} />
            </div>
            <div>
              <label className={label}>BOL #</label>
              <input className={input} placeholder="BOL12345" value={form.bol_number}
                onChange={e => set('bol_number', e.target.value)} />
            </div>
          </div>

          {/* Commodity + Crossing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Commodity</label>
              <input className={input} placeholder="Auto parts, Electronics..." value={form.commodity}
                onChange={e => set('commodity', e.target.value)} />
            </div>
            <div>
              <label className={label}>Crossing Point</label>
              <input className={input} placeholder="Laredo/Nuevo Laredo" value={form.crossing_point}
                onChange={e => set('crossing_point', e.target.value)} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-700 text-gray-300 rounded-lg py-2.5 text-sm hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
              {loading ? 'Creating...' : 'Create Load'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
