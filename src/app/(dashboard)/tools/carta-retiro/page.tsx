'use client'

import { useState, useEffect } from 'react'
import { Printer, RotateCcw, Plus, Trash2 } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface FormState {
  dateISO: string
  senderAddress: string
  location: string
  trailerNumber: string
  clientName: string
  bodegaDestino: string
  direccion: string
  transfer: string
  drivers: string[]
  unit: string
  opsName: string
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function fmtDateES(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const DEFAULTS: FormState = {
  dateISO:       today(),
  senderAddress: 'CargoFi LLC – 5900 Balcones Drive STE 100, Austin TX 78731',
  location:      '',
  trailerNumber: '',
  clientName:    '',
  bodegaDestino: '',
  direccion:     '',
  transfer:      'CARGOFI',
  drivers:       [''],
  unit:          '',
  opsName:       'Luis Arturo Hernandez Felix',
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

// ── Letter preview ─────────────────────────────────────────────────────────────
function LetterPreview({ f }: { f: FormState }) {
  const activeDrv = f.drivers.filter(Boolean)
  const plural = activeDrv.length > 1

  return (
    <div
      className="print-area bg-white text-gray-900 p-12 font-mono text-sm leading-relaxed"
      style={{ minHeight: '11in', width: '8.5in', maxWidth: '100%' }}
    >
      {/* Header row */}
      <div className="flex justify-between items-start mb-8">
        <span className="text-xs whitespace-pre-wrap">{f.senderAddress}</span>
        <span className="text-xs font-semibold">{fmtDateES(f.dateISO)}</span>
      </div>

      {/* Body */}
      <p className="mb-6 text-sm">
        Por este medio solicito de manera más atenta retirar una caja que se encuentra en:
      </p>

      {f.location && (
        <p className="font-bold uppercase mb-6">{f.location}</p>
      )}

      {/* Fields */}
      <div className="space-y-2 uppercase text-sm mb-8">
        <div className="flex gap-2">
          <span className="font-bold w-36 flex-shrink-0">REMOLQUE:</span>
          <span>{f.trailerNumber || '___________'}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-bold w-36 flex-shrink-0">CLIENTE:</span>
          <span>{f.clientName || '___________'}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-bold w-36 flex-shrink-0">BODEGA DESTINO:</span>
          <span>{f.bodegaDestino || '___________'}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-bold w-36 flex-shrink-0">DIRECCION:</span>
          <span>{f.direccion || '___________'}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-bold w-36 flex-shrink-0">TRANSFER:</span>
          <span>{f.transfer}</span>
        </div>

        {/* Operadores — singular or plural */}
        {activeDrv.length === 0 && (
          <div className="flex gap-2">
            <span className="font-bold w-36 flex-shrink-0">OPERADOR:</span>
            <span>___________</span>
          </div>
        )}
        {activeDrv.map((name, i) => (
          <div key={i} className="flex gap-2">
            <span className={`font-bold w-36 flex-shrink-0 ${i > 0 ? 'invisible' : ''}`}>
              {plural ? 'OPERADORES:' : 'OPERADOR:'}
            </span>
            <span>{name}</span>
          </div>
        ))}

        <div className="flex gap-2">
          <span className="font-bold w-36 flex-shrink-0">UNIDAD:</span>
          <span>{f.unit || '___________'}</span>
        </div>
        <div className="flex gap-2 mt-2">
          <span className="font-bold w-36 flex-shrink-0">OPERACIONES:</span>
          <span className="uppercase">{f.opsName}</span>
        </div>
      </div>

      {/* Signature */}
      <div className="mt-12 space-y-1">
        <p className="text-sm">
          <span className="font-bold">FIRMA</span>{' '}
          <span className="uppercase">{f.opsName}</span>
        </p>
        <div className="border-b border-gray-400 w-48 mt-6" />
        <p className="text-xs uppercase text-gray-600 mt-1">{f.opsName}</p>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function CartaRetiroPage() {
  const [form, setForm] = useState<FormState>(DEFAULTS)
  const [loads, setLoads] = useState<any[]>([])
  const [selectedLoad, setSelectedLoad] = useState('')
  const [loadFetching, setLoadFetching] = useState(false)

  useEffect(() => {
    fetch('/api/loads?history=1')
      .then(r => r.json())
      .then(d => setLoads(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  async function handleLoadSelect(id: string) {
    setSelectedLoad(id)
    if (!id) return
    setLoadFetching(true)
    try {
      const res = await fetch(`/api/loads/${id}`)
      const load = await res.json()

      const pickup   = load.stops?.find((s: any) => s.stop_type === 'pickup')
      const delivery = load.stops?.find((s: any) => s.stop_type === 'delivery')

      const driverNames: string[] = load.load_drivers?.length
        ? [...load.load_drivers]
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((d: any) => d.driver_name.toUpperCase())
        : load.driver?.name
        ? [load.driver.name.toUpperCase()]
        : ['']

      const dest = delivery
        ? `${(delivery.city ?? '').toUpperCase()}, ${(delivery.state ?? '').toUpperCase()}`
        : ''

      setForm(f => ({
        ...f,
        location:      (pickup?.facility_name ?? '').toUpperCase(),
        clientName:    (load.broker_name ?? '').toUpperCase(),
        bodegaDestino: dest,
        direccion:     (delivery?.address ?? '').toUpperCase(),
        drivers:       driverNames.length ? driverNames : [''],
        unit:          (load.unit?.unit_number ?? '').toUpperCase(),
      }))
    } finally {
      setLoadFetching(false)
    }
  }

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function setDriver(idx: number, value: string) {
    setForm(f => {
      const d = [...f.drivers]
      d[idx] = value.toUpperCase()
      return { ...f, drivers: d }
    })
  }

  function addDriver() {
    setForm(f => ({ ...f, drivers: [...f.drivers, ''] }))
  }

  function removeDriver(idx: number) {
    setForm(f => ({ ...f, drivers: f.drivers.filter((_, i) => i !== idx) }))
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
            font-family: 'Courier New', Courier, monospace !important;
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
            <h1 className="text-sm font-bold text-white">Carta de Retiro</h1>
            <p className="text-xs text-gray-500">Solicitud de retiro de caja</p>
          </div>

          <div className="flex-1 px-4 py-4 space-y-3">
            {/* Pre-fill from load */}
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Pre-fill desde Load {loadFetching && <span className="text-orange-400">cargando…</span>}
              </span>
              <select
                value={selectedLoad}
                onChange={e => handleLoadSelect(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-md px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                <option value="">— seleccionar load —</option>
                {loads.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.load_number} {l.broker_name ? `· ${l.broker_name}` : ''}
                  </option>
                ))}
              </select>
            </label>

            {/* Date */}
            <Field
              label="Fecha"
              type="date"
              value={form.dateISO}
              onChange={v => set('dateISO', v)}
            />

            {/* Sender address */}
            <Field
              label="Dirección remitente"
              value={form.senderAddress}
              onChange={v => set('senderAddress', v)}
              placeholder="Dirección de la empresa"
            />

            {/* Location */}
            <Field
              label="Ubicación del remolque (yard/terminal)"
              value={form.location}
              onChange={v => set('location', v.toUpperCase())}
              placeholder="ej. HUNTER EXPRESS NUEVO LAREDO"
            />

            {/* Trailer */}
            <Field
              label="Remolque #"
              value={form.trailerNumber}
              onChange={v => set('trailerNumber', v.toUpperCase())}
              placeholder="ej. H53220"
            />

            {/* Client */}
            <Field
              label="Cliente"
              value={form.clientName}
              onChange={v => set('clientName', v.toUpperCase())}
              placeholder="ej. TUPY MEXICO"
            />

            {/* Bodega destino */}
            <Field
              label="Bodega destino (ciudad, estado)"
              value={form.bodegaDestino}
              onChange={v => set('bodegaDestino', v.toUpperCase())}
              placeholder="ej. ROMULUS, MI"
            />

            {/* Dirección entrega */}
            <Field
              label="Dirección de entrega"
              value={form.direccion}
              onChange={v => set('direccion', v.toUpperCase())}
              placeholder="ej. 28375 Beverly RD."
            />

            {/* Transfer */}
            <Field
              label="Transfer"
              value={form.transfer}
              onChange={v => set('transfer', v.toUpperCase())}
              placeholder="ej. CARGOFI"
            />

            {/* Drivers */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Operador(es)
              </span>
              {form.drivers.map((drv, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <input
                    type="text"
                    value={drv}
                    onChange={e => setDriver(i, e.target.value)}
                    placeholder={`Driver ${i + 1}`}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
                  />
                  {form.drivers.length > 1 && (
                    <button
                      onClick={() => removeDriver(i)}
                      className="text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addDriver}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-400 transition-colors mt-0.5"
              >
                <Plus className="w-3 h-3" />
                Agregar driver
              </button>
            </div>

            {/* Unit */}
            <Field
              label="Unidad #"
              value={form.unit}
              onChange={v => set('unit', v.toUpperCase())}
              placeholder="ej. 198406"
            />

            {/* Ops name */}
            <Field
              label="Operaciones / Firma"
              value={form.opsName}
              onChange={v => set('opsName', v)}
              placeholder="Nombre del firmante"
            />
          </div>

          {/* Footer actions */}
          <div className="px-4 py-3 border-t border-gray-800 space-y-2">
            <button
              onClick={() => window.print()}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Guardar PDF
            </button>
            <button
              onClick={() => { setForm(DEFAULTS); setSelectedLoad('') }}
              className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-white text-sm py-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar campos
            </button>
          </div>
        </div>

        {/* ── Right: Preview ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-gray-900 p-6">
          <div className="no-print flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-sm">Vista previa</h2>
              <p className="text-gray-500 text-xs">Así se verá la carta impresa</p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
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
