'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, AlertTriangle, AlertCircle, Info, CheckCircle, Loader2, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'

interface ParsedDoc {
  doc_type: string
  extracted: Record<string, any>
  missing: { field: string; severity: 'critical' | 'warning' | 'info'; message: string }[]
  raw_text_summary: string
}

interface Props {
  onClose: () => void
  onLoadCreated?: (data: any) => void
}

const SEVERITY_CONFIG = {
  critical: { icon: AlertCircle, color: 'text-red-400 bg-red-400/10 border-red-400/20', label: 'Critical' },
  warning:  { icon: AlertTriangle, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', label: 'Warning' },
  info:     { icon: Info, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', label: 'Info' },
}

const FIELD_LABELS: Record<string, string> = {
  bol_number: 'BOL #', pedimento: 'Pedimento', load_number: 'Load #',
  pickup_date: 'Pickup Date', delivery_date: 'Delivery Date',
  pickup_appointment: 'Pickup Appt', delivery_appointment: 'Delivery Appt',
  origin_facility: 'Origin', origin_city: 'Origin City', origin_state: 'Origin State',
  dest_facility: 'Destination', dest_city: 'Dest City', dest_state: 'Dest State',
  shipper_name: 'Shipper', consignee_name: 'Consignee', consignee_contact: 'Consignee Contact',
  carrier_name: 'Carrier', carrier_scac: 'SCAC',
  driver_name: 'Driver', truck_number: 'Truck #', trailer_number: 'Trailer #',
  broker_name: 'Broker', broker_mc: 'Broker MC',
  rate: 'Rate', currency: 'Currency',
  commodity: 'Commodity', weight_lbs: 'Weight (lbs)', pieces: 'Pieces',
  nmfc: 'NMFC #', freight_class: 'Class', freight_terms: 'Freight Terms',
  po_number: 'PO #', special_instructions: 'Special Instructions',
  signed_by: 'Signed By', signed_date: 'Signed Date',
}

export default function DocumentParser({ onClose, onLoadCreated }: Props) {
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<ParsedDoc | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')

  const parseFile = useCallback(async (file: File) => {
    setParsing(true)
    setError('')
    setFileName(file.name)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/parse-document', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    }
    setParsing(false)
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  const extracted = result?.extracted ?? {}
  const missing = result?.missing ?? []
  const criticals = missing.filter(m => m.severity === 'critical')
  const warnings = missing.filter(m => m.severity === 'warning')
  const infos = missing.filter(m => m.severity === 'info')

  // Fields to display in the extracted section
  const displayGroups = [
    {
      label: 'Document',
      fields: ['bol_number', 'pedimento', 'load_number', 'po_number', 'freight_terms', 'signed_by', 'signed_date'],
    },
    {
      label: 'Route',
      fields: ['origin_facility', 'origin_city', 'origin_state', 'dest_facility', 'dest_city', 'dest_state'],
    },
    {
      label: 'Dates & Appointments',
      fields: ['pickup_date', 'pickup_appointment', 'delivery_date', 'delivery_appointment'],
    },
    {
      label: 'Parties',
      fields: ['shipper_name', 'consignee_name', 'consignee_contact', 'broker_name', 'broker_mc', 'carrier_name', 'carrier_scac'],
    },
    {
      label: 'Equipment & Driver',
      fields: ['driver_name', 'truck_number', 'trailer_number'],
    },
    {
      label: 'Cargo',
      fields: ['commodity', 'weight_lbs', 'pieces', 'pieces_unit', 'nmfc', 'freight_class'],
    },
    {
      label: 'Financials',
      fields: ['rate', 'currency'],
    },
  ]

  return (
    <Modal title="Document Parser — AI Extraction" onClose={onClose} width="max-w-3xl">
      {/* Upload zone */}
      {!result && !parsing && (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
              ${dragging ? 'border-orange-500 bg-orange-500/5' : 'border-gray-700 hover:border-gray-500'}`}
            onClick={() => document.getElementById('doc-input')?.click()}
          >
            <Upload className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">Drop your BOL, Rate Con, or POD here</p>
            <p className="text-gray-500 text-sm">PDF, JPG, PNG supported · Claude AI extracts all data automatically</p>
            <input id="doc-input" type="file" className="hidden"
              accept=".pdf,image/jpeg,image/png,image/webp"
              onChange={handleFileInput} />
          </div>
          {error && (
            <p className="text-red-400 text-sm text-center mt-3">⚠️ {error}</p>
          )}
        </div>
      )}

      {/* Parsing */}
      {parsing && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
          <div className="text-center">
            <p className="text-white font-medium">Parsing document...</p>
            <p className="text-gray-500 text-sm mt-1">{fileName}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-5">
          {/* Doc type + filename */}
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <div>
              <span className="text-white font-medium">{fileName}</span>
              <span className="ml-2 text-xs bg-orange-500/10 text-orange-400 rounded-full px-2 py-0.5 uppercase">
                {result.doc_type}
              </span>
            </div>
            <button onClick={() => { setResult(null); setFileName('') }}
              className="ml-auto text-gray-500 hover:text-white text-xs flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Parse another
            </button>
          </div>

          {/* Missing fields alerts */}
          {missing.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                Alerts ({missing.length})
              </p>
              {missing.map((m, i) => {
                const cfg = SEVERITY_CONFIG[m.severity]
                return (
                  <div key={i} className={`flex items-start gap-2 border rounded-lg px-3 py-2 text-sm ${cfg.color}`}>
                    <cfg.icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">{FIELD_LABELS[m.field] ?? m.field}:</span>{' '}
                      {m.message}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Extracted data */}
          <div className="space-y-4">
            {displayGroups.map(group => {
              const rows = group.fields
                .map(f => ({ key: f, label: FIELD_LABELS[f] ?? f, value: extracted[f] }))
                .filter(r => r.value !== null && r.value !== undefined && r.value !== '')

              if (rows.length === 0) return null
              return (
                <div key={group.label}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{group.label}</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {rows.map(row => (
                      <div key={row.key} className="flex items-baseline gap-2">
                        <span className="text-xs text-gray-500 flex-shrink-0 w-28">{row.label}</span>
                        <span className="text-sm text-white truncate">
                          {row.key === 'rate'
                            ? `$${Number(row.value).toLocaleString()}`
                            : row.key === 'weight_lbs'
                            ? `${Number(row.value).toLocaleString()} lbs`
                            : String(row.value)
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          {result.raw_text_summary && (
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Summary</p>
              <p className="text-sm text-gray-300">{result.raw_text_summary}</p>
            </div>
          )}

          {/* Action */}
          {onLoadCreated && (
            <button
              onClick={() => onLoadCreated(extracted)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              Use data to create Load →
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}
