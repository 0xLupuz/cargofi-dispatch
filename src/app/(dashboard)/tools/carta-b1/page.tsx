'use client'

import { useState, useEffect } from 'react'
import { Printer, RotateCcw } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface FormState {
  dateISO: string
  // Body
  driverName: string
  customerName: string
  locationName: string
  address: string
  city: string
  state: string
  zip: string
  // Signature block (company settings)
  signatoryName: string
  signatoryTitle: string
  company: string
  companyLine2: string
  companyCity: string
  cell: string
  office: string
  officeExt: string
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function fmtDateEN(iso: string): string {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  const yy = iso.split('-')[0].slice(2) // 2-digit year optional, use full
  return `${m}/${d}/${iso.split('-')[0]}`
}

const DEFAULTS: FormState = {
  dateISO:        today(),
  driverName:     '',
  customerName:   '',
  locationName:   '',
  address:        '',
  city:           '',
  state:          '',
  zip:            '',
  signatoryName:  'Luis Arturo Hernandez Felix',
  signatoryTitle: 'Owner / CEO',
  company:        'CARGOFI LLC',
  companyLine2:   '5900 Balcones Drive STE 100',
  companyCity:    'Austin TX 78731',
  cell:           '',
  office:         '',
  officeExt:      '',
}

// ── Input helper ───────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, placeholder = '', type = 'text', className = '',
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; className?: string
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-gray-800 border border-gray-700 rounded-md px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
      />
    </label>
  )
}

// ── Section divider ────────────────────────────────────────────────────────────
function Section({ title }: { title: string }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 border-t border-gray-800 pt-3 mt-1">
      {title}
    </p>
  )
}

// ── Letter preview ─────────────────────────────────────────────────────────────
function LetterPreview({ f }: { f: FormState }) {
  const hasAddress = f.address || f.city || f.state || f.zip
  const hasContact = f.cell || f.office

  return (
    <div
      className="print-area bg-white text-gray-900 p-12 font-sans text-sm leading-relaxed"
      style={{ minHeight: '11in', width: '8.5in', maxWidth: '100%' }}
    >
      {/* Header row */}
      <div className="flex justify-between items-start mb-10">
        <span className="text-xs whitespace-pre-wrap">{f.company}</span>
        <span className="text-xs font-semibold">{fmtDateEN(f.dateISO)}</span>
      </div>

      {/* Salutation */}
      <p className="mb-4 font-medium">To whom it may concern,</p>

      {/* Body */}
      <p className="mb-8 leading-relaxed">
        Through this letter we would like to confirm that our driver{' '}
        <span className="font-bold uppercase">{f.driverName || '________________________'}</span>{' '}
        will be making frequent deliveries to our customer{' '}
        <span className="font-bold uppercase">{f.customerName || '________________________'}</span>{' '}
        at the address mentioned below.
      </p>

      {/* Delivery address block */}
      <div className="mb-10 font-bold uppercase text-sm space-y-0.5 ml-8">
        {f.locationName && <p>{f.locationName}</p>}
        {f.address && <p>{f.address}</p>}
        {hasAddress && (
          <p>
            {[f.city, f.state].filter(Boolean).join(', ')}
            {f.zip ? ` ${f.zip}` : ''}
          </p>
        )}
        {!f.locationName && !f.address && !hasAddress && (
          <p className="text-gray-400 font-normal italic">Ingresa la dirección de entrega</p>
        )}
      </div>

      {/* Closing */}
      <p className="mb-12 leading-relaxed">
        If you have any questions or concerns, please feel free to contact us at the mentioned
        number below, thanks in advance
      </p>

      {/* Signature block */}
      <div className="space-y-0.5 text-sm">
        <div className="border-b border-gray-300 w-56 mb-3" />
        <p className="font-semibold">{f.signatoryName || '________________________'}</p>
        {f.signatoryTitle && <p className="text-gray-600">{f.signatoryTitle}</p>}
        {f.company && <p className="font-bold uppercase mt-1">{f.company}</p>}
        {f.companyLine2 && <p className="text-xs">{f.companyLine2}</p>}
        {f.companyCity && <p className="text-xs">{f.companyCity}</p>}
        {hasContact && (
          <div className="mt-2 space-y-0.5 text-xs">
            {f.cell && (
              <p>
                <span className="font-bold">CELL:</span> {f.cell}
              </p>
            )}
            {f.office && (
              <p>
                <span className="font-bold">OFFICE:</span> {f.office}
                {f.officeExt ? ` ext. ${f.officeExt}` : ''}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function CartaB1Page() {
  const [form, setForm] = useState<FormState>(DEFAULTS)
  const [drivers, setDrivers] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/drivers').then(r => r.json()),
      fetch('/api/customers').then(r => r.json()),
    ]).then(([d, c]) => {
      setDrivers(Array.isArray(d) ? d : [])
      setCustomers(Array.isArray(c) ? c : [])
    }).catch(() => {})
  }, [])

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleDriverSelect(id: string) {
    const driver = drivers.find((d: any) => d.id === id)
    if (driver) set('driverName', driver.name.toUpperCase())
  }

  function handleCustomerSelect(id: string) {
    const customer = customers.find((c: any) => c.id === id)
    if (!customer) return
    setForm(f => ({
      ...f,
      customerName: customer.name.toUpperCase(),
      address:      (customer.address || '').toUpperCase(),
      city:         (customer.city || '').toUpperCase(),
      state:        (customer.state || '').toUpperCase(),
      zip:          customer.zip || '',
    }))
  }

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100vw !important; height: auto !important;
            padding: 1in !important;
            margin: 0 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 11pt !important;
            color: black !important;
            background: white !important;
          }
          @page { size: letter; margin: 0; }
        }
      `}</style>

      <div className="flex h-full">
        {/* ── Left: Form ─────────────────────────────────────────────────────── */}
        <div className="no-print w-72 xl:w-80 flex-shrink-0 flex flex-col bg-gray-950 border-r border-gray-800 overflow-y-auto">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-800">
            <h1 className="text-sm font-bold text-white">Carta de Permisos B1</h1>
            <p className="text-xs text-gray-500">Authorization letter for border crossing</p>
          </div>

          <div className="flex-1 px-4 py-4 space-y-3">
            {/* Date */}
            <Field
              label="Date"
              type="date"
              value={form.dateISO}
              onChange={v => set('dateISO', v)}
            />

            <Section title="Driver" />

            {/* Driver selector */}
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Select from drivers
              </span>
              <select
                onChange={e => handleDriverSelect(e.target.value)}
                defaultValue=""
                className="bg-gray-800 border border-gray-700 rounded-md px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                <option value="">— select driver —</option>
                {drivers.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>

            <Field
              label="Driver name (editable)"
              value={form.driverName}
              onChange={v => set('driverName', v.toUpperCase())}
              placeholder="JUAN SIXTO CERVANTES"
            />

            <Section title="Customer / Destination" />

            {/* Customer selector */}
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Select from customers
              </span>
              <select
                onChange={e => handleCustomerSelect(e.target.value)}
                defaultValue=""
                className="bg-gray-800 border border-gray-700 rounded-md px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                <option value="">— select customer —</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            <Field
              label="Customer name (editable)"
              value={form.customerName}
              onChange={v => set('customerName', v.toUpperCase())}
              placeholder="TUPY MEXICO SALTILLO"
            />

            <Field
              label="Location / Facility name"
              value={form.locationName}
              onChange={v => set('locationName', v.toUpperCase())}
              placeholder="ej. HUNTER EXPRESS YARD"
            />

            <Field
              label="Street address"
              value={form.address}
              onChange={v => set('address', v.toUpperCase())}
              placeholder="ej. 28375 BEVERLY ROAD"
            />

            <div className="flex gap-2">
              <Field
                label="City"
                value={form.city}
                onChange={v => set('city', v.toUpperCase())}
                placeholder="ROMULUS"
                className="flex-1"
              />
              <Field
                label="State"
                value={form.state}
                onChange={v => set('state', v.toUpperCase())}
                placeholder="MI"
                className="w-16"
              />
              <Field
                label="ZIP"
                value={form.zip}
                onChange={v => set('zip', v)}
                placeholder="48174"
                className="w-20"
              />
            </div>

            <Section title="Signature / Company" />

            <Field
              label="Signatory name"
              value={form.signatoryName}
              onChange={v => set('signatoryName', v)}
              placeholder="Full name"
            />

            <Field
              label="Title"
              value={form.signatoryTitle}
              onChange={v => set('signatoryTitle', v)}
              placeholder="Owner / CEO"
            />

            <Field
              label="Company"
              value={form.company}
              onChange={v => set('company', v)}
              placeholder="CARGOFI LLC"
            />

            <Field
              label="Address line 2"
              value={form.companyLine2}
              onChange={v => set('companyLine2', v)}
              placeholder="Street address"
            />

            <Field
              label="City / State / ZIP"
              value={form.companyCity}
              onChange={v => set('companyCity', v)}
              placeholder="Laredo TX 78045"
            />

            <div className="flex gap-2">
              <Field
                label="Cell"
                value={form.cell}
                onChange={v => set('cell', v)}
                placeholder="(956) 000-0000"
                className="flex-1"
              />
            </div>

            <div className="flex gap-2">
              <Field
                label="Office"
                value={form.office}
                onChange={v => set('office', v)}
                placeholder="(956) 000-0000"
                className="flex-1"
              />
              <Field
                label="Ext"
                value={form.officeExt}
                onChange={v => set('officeExt', v)}
                placeholder="2"
                className="w-16"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-4 py-3 border-t border-gray-800 space-y-2">
            <button
              onClick={() => window.print()}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={() => setForm(DEFAULTS)}
              className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-white text-sm py-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear fields
            </button>
          </div>
        </div>

        {/* ── Right: Preview ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-gray-900 p-6">
          <div className="no-print flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-sm">Preview</h2>
              <p className="text-gray-500 text-xs">How the letter will look when printed</p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>

          <div className="overflow-x-auto">
            <LetterPreview f={form} />
          </div>
        </div>
      </div>
    </>
  )
}
