'use client'
import { useState, useEffect, useRef } from 'react'
import { Settings, Building2, FileText, Truck, CheckCircle, Loader2, Image, Globe } from 'lucide-react'

const inp  = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors'
const lbl  = 'block text-xs text-gray-500 mb-1 font-medium'
const card = 'bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4'

function Section({ icon: Icon, color, title, children }: { icon: any; color: string; title: string; children: React.ReactNode }) {
  return (
    <div className={card}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="border-t border-gray-800 pt-4 space-y-4">
        {children}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [form, setForm] = useState<Record<string, any>>({})
  const [loading, setLoading]  = useState(true)
  const [saving, setSaving]    = useState(false)
  const [saved, setSaved]      = useState(false)
  const [error, setError]      = useState('')
  const [logoPreview, setLogoPreview] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { setForm(d ?? {}); setLogoPreview(d?.logo_url ?? ''); setLoading(false) })
  }, [])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const url = ev.target?.result as string
      setLogoPreview(url)
      set('logo_url', url)
    }
    reader.readAsDataURL(file)
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    const r = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else { const d = await r.json(); setError(d.error ?? 'Error saving') }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-500 px-6 py-12 text-sm">
      <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" /> Loading...
    </div>
  )

  return (
    <div className="h-full overflow-auto px-6 py-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-orange-400" />
          <h1 className="text-white font-semibold text-lg">Settings</h1>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <div className="space-y-5 pb-10">

        {/* ── COMPANY PROFILE ── */}
        <Section icon={Building2} color="text-orange-400" title="Company Profile">
          {/* Logo */}
          <div>
            <label className={lbl}>Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center bg-gray-800 overflow-hidden flex-shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                  : <Image className="w-7 h-7 text-gray-600" />}
              </div>
              <div className="flex-1 space-y-2">
                <button onClick={() => fileRef.current?.click()}
                  className="text-sm border border-gray-700 text-gray-300 hover:border-orange-500 hover:text-orange-400 rounded-lg px-4 py-2 transition-colors w-full">
                  Upload Logo
                </button>
                <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleLogoFile} />
                <input value={form.logo_url?.startsWith('data:') ? '' : (form.logo_url ?? '')}
                  onChange={e => { set('logo_url', e.target.value); setLogoPreview(e.target.value) }}
                  placeholder="Or paste image URL..."
                  className={inp + ' text-xs'} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className={lbl}>Company Name</label>
              <input value={form.name ?? ''} onChange={e => set('name', e.target.value)}
                placeholder="CargoFi Transport LLC" className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Phone</label>
              <input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)}
                placeholder="+1 (555) 000-0000" className={inp} />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input value={form.email ?? ''} onChange={e => set('email', e.target.value)}
                type="email" placeholder="dispatch@cargofi.io" className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>Address</label>
            <input value={form.address ?? ''} onChange={e => set('address', e.target.value)}
              placeholder="5900 Balcones Drive STE 100" className={inp} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>City</label>
              <input value={form.city ?? ''} onChange={e => set('city', e.target.value)}
                placeholder="Austin" className={inp} />
            </div>
            <div>
              <label className={lbl}>State</label>
              <input value={form.state ?? ''} onChange={e => set('state', e.target.value)}
                placeholder="TX" maxLength={2} className={`${inp} uppercase`} />
            </div>
            <div>
              <label className={lbl}>ZIP</label>
              <input value={form.zip ?? ''} onChange={e => set('zip', e.target.value)}
                placeholder="78731" className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Country</label>
              <input value={form.country ?? 'United States'} onChange={e => set('country', e.target.value)}
                className={inp} />
            </div>
            <div>
              <label className={lbl}>Website</label>
              <input value={form.website ?? ''} onChange={e => set('website', e.target.value)}
                placeholder="https://cargofi.io" className={inp} />
            </div>
          </div>
        </Section>

        {/* ── CARRIER INFO ── */}
        <Section icon={Truck} color="text-blue-400" title="Carrier Info">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>DOT Number</label>
              <input value={form.dot_number ?? ''} onChange={e => set('dot_number', e.target.value)}
                placeholder="1234567" className={inp} />
            </div>
            <div>
              <label className={lbl}>MC Number</label>
              <input value={form.mc_number ?? ''} onChange={e => set('mc_number', e.target.value)}
                placeholder="MC-XXXXXX" className={inp} />
            </div>
            <div>
              <label className={lbl}>SCAC Code</label>
              <input value={form.scac_code ?? ''} onChange={e => set('scac_code', e.target.value.toUpperCase())}
                placeholder="CFIO" maxLength={4} className={`${inp} uppercase`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Default Dispatch Fee %</label>
              <div className="relative">
                <input value={form.default_dispatch_fee_pct ?? 13} onChange={e => set('default_dispatch_fee_pct', e.target.value)}
                  type="number" step="0.5" min="0" max="30" className={`${inp} pr-6`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Applied by default to new OOs</p>
            </div>
            <div>
              <label className={lbl}>Timezone</label>
              <select value={form.timezone ?? 'America/Chicago'} onChange={e => set('timezone', e.target.value)}
                className={inp}>
                <option value="America/New_York">Eastern (ET)</option>
                <option value="America/Chicago">Central (CT)</option>
                <option value="America/Denver">Mountain (MT)</option>
                <option value="America/Los_Angeles">Pacific (PT)</option>
                <option value="America/Mexico_City">Mexico City (CST)</option>
              </select>
            </div>
          </div>
        </Section>

        {/* ── INVOICE DEFAULTS ── */}
        <Section icon={FileText} color="text-emerald-400" title="Invoice Defaults">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Invoice Prefix</label>
              <div className="relative">
                <input value={form.invoice_prefix ?? 'INV'} onChange={e => set('invoice_prefix', e.target.value.toUpperCase())}
                  maxLength={6} placeholder="INV" className={`${inp} uppercase`} />
              </div>
              <p className="text-xs text-gray-600 mt-1">e.g. INV-0001, CF-0001</p>
            </div>
            <div>
              <label className={lbl}>Default Payment Terms</label>
              <div className="flex gap-1.5">
                {[30, 45, 60].map(d => (
                  <button key={d} type="button"
                    onClick={() => set('default_payment_terms', d)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors
                      ${(form.default_payment_terms ?? 30) === d
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'}`}>
                    Net {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className={lbl}>Invoice Footer Text</label>
            <textarea value={form.invoice_footer ?? ''} onChange={e => set('invoice_footer', e.target.value)}
              rows={2} placeholder="Thank you for your business. Payment is due within the agreed terms."
              className={`${inp} resize-none`} />
          </div>
        </Section>

        {/* ── PDF PREVIEW ── */}
        {(form.name || form.address || form.dot_number) && (
          <div className="bg-white rounded-xl p-5 text-gray-900">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">PDF Header Preview</p>
            <div className="flex items-start gap-4 border-b border-gray-200 pb-4">
              {logoPreview && (
                <img src={logoPreview} alt="Logo" className="h-12 w-auto object-contain" />
              )}
              <div className="flex-1">
                <p className="font-bold text-lg text-gray-900">{form.name || 'Company Name'}</p>
                {form.address && <p className="text-sm text-gray-600">{form.address}{form.city ? `, ${form.city}` : ''}{form.state ? `, ${form.state}` : ''} {form.zip ?? ''}</p>}
                <div className="flex gap-4 mt-1">
                  {form.phone && <p className="text-xs text-gray-500">{form.phone}</p>}
                  {form.email && <p className="text-xs text-gray-500">{form.email}</p>}
                </div>
                <div className="flex gap-4 mt-0.5">
                  {form.dot_number && <p className="text-xs text-gray-500">DOT: {form.dot_number}</p>}
                  {form.mc_number  && <p className="text-xs text-gray-500">{form.mc_number}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save button (bottom) */}
        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  )
}
