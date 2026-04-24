'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FileText, ArrowLeft, CheckCircle, Send, XCircle, ExternalLink } from 'lucide-react'

function fmt(n: any) { return parseFloat(String(n ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d?: string | null) { if (!d) return '—'; return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) }

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  draft:   { bg: 'bg-gray-700/60',    text: 'text-gray-400',   label: 'Draft'   },
  sent:    { bg: 'bg-[#58a6ff]/10',    text: 'text-[#58a6ff]',   label: 'Sent'    },
  paid:    { bg: 'bg-emerald-500/10', text: 'text-emerald-400',label: 'Paid'    },
  overdue: { bg: 'bg-red-500/10',     text: 'text-red-400',    label: 'Overdue' },
  void:    { bg: 'bg-[#161b22]',       text: 'text-[#484f58]',   label: 'Void'    },
}

export default function InvoiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [inv, setInv]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  async function load() {
    const r = await fetch(`/api/invoices/${id}`)
    if (r.ok) setInv(await r.json())
    setLoading(false)
  }

  useEffect(() => { if (id) load() }, [id])

  async function patch(body: Record<string, any>) {
    setUpdating(true)
    await fetch(`/api/invoices/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    await load()
    setUpdating(false)
  }

  async function voidInvoice() {
    if (!confirm('Void this invoice?')) return
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    router.push('/invoices')
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-500 px-6 py-8 text-sm">
      <div className="w-4 h-4 rounded-full border-2 border-[#3ab690] border-t-transparent animate-spin" /> Loading...
    </div>
  )
  if (!inv) return <div className="px-6 py-8 text-gray-500 text-sm">Invoice not found</div>

  const total = (parseFloat(inv.rate) || 0) + (parseFloat(inv.fuel_surcharge) || 0) + (parseFloat(inv.accessorials) || 0)
  const s = STATUS_STYLE[inv.status] ?? STATUS_STYLE.draft

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/invoices')} className="text-gray-500 hover:text-gray-300 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <FileText className="w-5 h-5 text-[#3ab690]" />
            <h1 className="text-white font-semibold text-lg">{inv.invoice_number}</h1>
            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${s.bg} ${s.text}`}>{s.label}</span>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2">
            {inv.status === 'draft' && (
              <button onClick={() => patch({ status: 'sent' })} disabled={updating}
                className="flex items-center gap-1.5 text-sm bg-[#58a6ff]/15 text-[#58a6ff] border border-[#58a6ff]/20 rounded-lg px-3 py-1.5 hover:bg-[#58a6ff]/25 transition-colors disabled:opacity-50">
                <Send className="w-3.5 h-3.5" /> Mark Sent
              </button>
            )}
            {['sent','overdue'].includes(inv.status) && (
              <button onClick={() => patch({ status: 'paid' })} disabled={updating}
                className="flex items-center gap-1.5 text-sm bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-lg px-3 py-1.5 hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
                <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
              </button>
            )}
            {!['paid','void'].includes(inv.status) && (
              <button onClick={voidInvoice} disabled={updating}
                className="flex items-center gap-1.5 text-sm bg-[#161b22] text-gray-500 border border-[#30363d] rounded-lg px-3 py-1.5 hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-50">
                <XCircle className="w-3.5 h-3.5" /> Void
              </button>
            )}
          </div>
        </div>

        {/* Invoice card */}
        <div className="bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden mb-4">
          {/* Top bar */}
          <div className="px-6 py-5 border-b border-[#21262d] flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Bill To</p>
              <p className="text-white font-semibold text-lg">{inv.broker_name}</p>
              {inv.broker_mc && <p className="text-xs text-gray-500">{inv.broker_mc}</p>}
              {inv.broker_email && <p className="text-xs text-gray-500">{inv.broker_email}</p>}
              {inv.broker_address && <p className="text-xs text-gray-500">{inv.broker_address}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Invoice Total</p>
              <p className="text-3xl font-bold text-[#3ab690]">${fmt(total)}</p>
            </div>
          </div>

          {/* Line items */}
          <div className="px-6 py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Freight Rate</span>
              <span className="text-white font-medium">${fmt(inv.rate)}</span>
            </div>
            {parseFloat(inv.fuel_surcharge) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Fuel Surcharge</span>
                <span className="text-white font-medium">${fmt(inv.fuel_surcharge)}</span>
              </div>
            )}
            {parseFloat(inv.accessorials) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Accessorials</span>
                <span className="text-white font-medium">${fmt(inv.accessorials)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-[#21262d] pt-2 mt-2">
              <span className="text-gray-300">Total</span>
              <span className="text-[#3ab690]">${fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Dates + Terms */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Issued', value: fmtDate(inv.issued_at) },
            { label: 'Due', value: fmtDate(inv.due_at), highlight: inv.status === 'overdue' },
            { label: 'Paid', value: inv.paid_at ? fmtDate(inv.paid_at.slice(0,10)) : '—', highlight: inv.status === 'paid' },
          ].map(item => (
            <div key={item.label} className="bg-[#0d1117] border border-[#21262d] rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className={`text-sm font-semibold ${item.highlight ? (inv.status === 'overdue' ? 'text-red-400' : 'text-emerald-400') : 'text-white'}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Payment terms */}
        <div className="bg-[#0d1117] border border-[#21262d] rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-400">Payment Terms</span>
          <span className="text-sm font-semibold text-white">Net {inv.payment_terms ?? 30}</span>
        </div>

        {/* Linked load */}
        {inv.load && (
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-gray-500 mb-2">Linked Load</p>
            <button onClick={() => router.push(`/loads`)}
              className="flex items-center gap-2 text-sm text-[#3ab690] hover:text-[#72d2b3] transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
              {inv.load.load_number}
              {inv.load.broker_name && <span className="text-gray-500">· {inv.load.broker_name}</span>}
            </button>
          </div>
        )}

        {/* Notes */}
        {inv.notes && (
          <div className="bg-[#0d1117] border border-[#21262d] rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-300">{inv.notes}</p>
          </div>
        )}

        {/* Timestamps */}
        <p className="text-xs text-[#30363d] text-center pb-6">
          Created {new Date(inv.created_at).toLocaleString('en-US')}
        </p>
      </div>
    </div>
  )
}
