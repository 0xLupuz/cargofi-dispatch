'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ArrowLeft, ChevronDown } from 'lucide-react'

function fmt(n: any) { return parseFloat(String(n ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function NewInvoicePage() {
  const router = useRouter()
  const [loads, setLoads]     = useState<any[]>([])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    load_id:         '',
    broker_name:     '',
    broker_mc:       '',
    broker_email:    '',
    broker_address:  '',
    rate:            '',
    fuel_surcharge:  '0',
    accessorials:    '0',
    payment_terms:   '30',
    quick_pay_pct:   '0',
    use_factoring:   false,
    issued_at:       new Date().toISOString().slice(0, 10),
    notes:           '',
  })

  useEffect(() => {
    fetch('/api/loads?status=delivered&limit=100')
      .then(r => r.json())
      .then(d => setLoads(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  function handleLoadSelect(loadId: string) {
    const load = loads.find(l => l.id === loadId)
    if (!load) { setForm(f => ({ ...f, load_id: loadId })); return }
    setForm(f => ({
      ...f,
      load_id:      loadId,
      broker_name:  load.broker_name  ?? f.broker_name,
      broker_mc:    load.broker_mc    ?? f.broker_mc,
      broker_email: load.broker_email ?? f.broker_email,
      rate:         String(load.rate  ?? f.rate),
    }))
  }

  const total = (parseFloat(form.rate) || 0) + (parseFloat(form.fuel_surcharge) || 0) + (parseFloat(form.accessorials) || 0)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.broker_name.trim()) { setError('Broker name is required'); return }
    if (!form.rate || parseFloat(form.rate) <= 0) { setError('Rate must be > 0'); return }
    setSaving(true); setError('')
    const payload = {
      ...form,
      load_id:        form.load_id       || null,
      rate:           parseFloat(form.rate),
      fuel_surcharge: parseFloat(form.fuel_surcharge) || 0,
      accessorials:   parseFloat(form.accessorials)   || 0,
      payment_terms:  parseInt(form.payment_terms)     || 30,
      quick_pay_pct:  parseFloat(form.quick_pay_pct)  || 0,
    }
    const r = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (r.ok) { const inv = await r.json(); router.push(`/invoices/${inv.id}`) }
    else { const d = await r.json(); setError(d.error ?? 'Error saving'); setSaving(false) }
  }

  const inp = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
  const label = "block text-xs text-gray-500 mb-1 font-medium"

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <FileText className="w-5 h-5 text-orange-400" />
          <h1 className="text-white font-semibold text-lg">New Invoice</h1>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {/* Link to load (optional) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Link to Load (optional)</p>
            <div className="relative">
              <select value={form.load_id} onChange={e => handleLoadSelect(e.target.value)}
                className={`${inp} appearance-none pr-8`}>
                <option value="">— No load linked —</option>
                {loads.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.load_number} · {l.broker_name} · ${fmt(l.rate)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
            {form.load_id && (
              <p className="text-xs text-orange-400/80 mt-1.5">✓ Load linked — broker info auto-filled</p>
            )}
          </div>

          {/* Bill to */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bill To</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={label}>Broker / Customer Name *</label>
                <input value={form.broker_name} onChange={e => setForm(f => ({ ...f, broker_name: e.target.value }))}
                  placeholder="e.g. CH Robinson" className={inp} />
              </div>
              <div>
                <label className={label}>MC Number</label>
                <input value={form.broker_mc} onChange={e => setForm(f => ({ ...f, broker_mc: e.target.value }))}
                  placeholder="MC-XXXXXX" className={inp} />
              </div>
              <div>
                <label className={label}>Email</label>
                <input value={form.broker_email} onChange={e => setForm(f => ({ ...f, broker_email: e.target.value }))}
                  type="email" placeholder="billing@broker.com" className={inp} />
              </div>
              <div className="col-span-2">
                <label className={label}>Address</label>
                <input value={form.broker_address} onChange={e => setForm(f => ({ ...f, broker_address: e.target.value }))}
                  placeholder="123 Main St, Chicago IL 60601" className={inp} />
              </div>
            </div>
          </div>

          {/* Amounts */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Amounts</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={label}>Rate *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                    type="number" step="0.01" min="0" placeholder="0.00" className={`${inp} pl-6`} />
                </div>
              </div>
              <div>
                <label className={label}>Fuel Surcharge</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input value={form.fuel_surcharge} onChange={e => setForm(f => ({ ...f, fuel_surcharge: e.target.value }))}
                    type="number" step="0.01" min="0" placeholder="0.00" className={`${inp} pl-6`} />
                </div>
              </div>
              <div>
                <label className={label}>Accessorials</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input value={form.accessorials} onChange={e => setForm(f => ({ ...f, accessorials: e.target.value }))}
                    type="number" step="0.01" min="0" placeholder="0.00" className={`${inp} pl-6`} />
                </div>
              </div>
            </div>
            {/* Total preview */}
            <div className="flex justify-end pt-1">
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-4 py-2 text-right">
                <p className="text-xs text-gray-500">Invoice Total</p>
                <p className="text-xl font-bold text-orange-400">${fmt(total)}</p>
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment Terms</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={label}>Terms (days)</label>
                <div className="flex gap-1.5">
                  {['30', '45', '60'].map(d => (
                    <button key={d} type="button"
                      onClick={() => setForm(f => ({ ...f, payment_terms: d }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors
                        ${form.payment_terms === d
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                          : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'}`}>
                      Net {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={label}>Quick Pay Discount %</label>
                <div className="relative">
                  <input value={form.quick_pay_pct} onChange={e => setForm(f => ({ ...f, quick_pay_pct: e.target.value }))}
                    type="number" step="0.1" min="0" max="10" placeholder="0.0" className={`${inp} pr-6`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                </div>
              </div>
              <div>
                <label className={label}>Issue Date</label>
                <input value={form.issued_at} onChange={e => setForm(f => ({ ...f, issued_at: e.target.value }))}
                  type="date" className={inp} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button type="button" onClick={() => setForm(f => ({ ...f, use_factoring: !f.use_factoring }))}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                  ${form.use_factoring ? 'bg-orange-500 border-orange-500' : 'border-gray-600'}`}>
                {form.use_factoring && <span className="text-white text-xs font-bold">✓</span>}
              </button>
              <span className="text-sm text-gray-400">Using factoring company</span>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <label className={label}>Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Any notes to include on the invoice..."
              className={`${inp} resize-none`} />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pb-6">
            <button type="button" onClick={() => router.back()}
              className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm font-medium hover:border-gray-600 hover:text-gray-300 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {saving ? 'Saving...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
