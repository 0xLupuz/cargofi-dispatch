'use client'
import { useState, useEffect, useCallback } from 'react'
import { Wrench, Plus, Search, Pencil, Trash2, Calendar } from 'lucide-react'
import RepairOrderModal from '@/components/repair-orders/RepairOrderModal'

const STATUS_LABELS: Record<string,string> = {
  estimate:'Estimate', in_progress:'In Progress',
  delivered_complete:'Delivered - Complete', delivered_incomplete:'Delivered - Incomplete', cancelled:'Cancelled'
}
const STATUS_COLORS: Record<string,string> = {
  estimate:'bg-gray-700 text-gray-300',
  in_progress:'bg-amber-500/10 text-amber-400',
  delivered_complete:'bg-emerald-500/10 text-emerald-400',
  delivered_incomplete:'bg-orange-500/10 text-orange-400',
  cancelled:'bg-red-500/10 text-red-400',
}

function fmtDate(d?: string|null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'2-digit' })
}

export default function RepairOrdersPage() {
  const [ros, setRos] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10) })
  const [to, setTo] = useState(new Date().toISOString().slice(0,10))
  const [modal, setModal] = useState<{ open:boolean; ro?:any }>({ open:false })
  const [deleting, setDeleting] = useState<string|null>(null)

  const load = useCallback(async () => {
    const p = new URLSearchParams({ from, to })
    if (statusFilter) p.set('status', statusFilter)
    if (search) p.set('q', search)
    const r = await fetch('/api/repair-orders?' + p.toString())
    if (r.ok) setRos(await r.json())
  }, [from, to, statusFilter, search])

  useEffect(() => { load() }, [load])

  async function openEdit(ro: any) {
    const r = await fetch(`/api/repair-orders/${ro.id}`)
    if (r.ok) setModal({ open:true, ro: await r.json() })
  }

  async function del(id: string, num: string) {
    if (!confirm(`Delete Repair Order #${num}?`)) return
    setDeleting(id); await fetch(`/api/repair-orders/${id}`, { method:'DELETE' }); setDeleting(null); load()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-orange-400" />
          <h1 className="text-white font-semibold text-lg">Repair Orders</h1>
          <span className="text-xs text-gray-600 bg-gray-800 rounded-full px-2 py-0.5">{ros.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setModal({ open:true })} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Repair Order
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="w-4 h-4" />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500" />
          <span>to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="RO #..." value={search} onChange={e => setSearch(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 w-40" />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-950 border-b border-gray-800">
            <tr>{['RO #','Status','Type','Unit / Trailer','Vendor','Arrived','Delivered','Parts','Labor','Total',''].map(h => <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {ros.map(ro => {
              const equip = ro.equipment_type === 'truck' ? ro.unit : ro.trailer
              return (
                <tr key={ro.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-4 py-3 font-mono font-semibold text-orange-400 text-sm">{ro.ro_number}</td>
                  <td className="px-4 py-3"><span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[ro.status] ?? STATUS_COLORS.estimate}`}>{STATUS_LABELS[ro.status] ?? ro.status}</span></td>
                  <td className="px-4 py-3 text-gray-400 capitalize text-xs">{ro.equipment_type}</td>
                  <td className="px-4 py-3 text-gray-200 font-mono text-xs">{equip?.unit_number ?? equip?.trailer_number ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[120px] truncate">{ro.vendor?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(ro.arrived_at)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(ro.delivered_at)}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{Number(ro.subtotal_no_taxable + ro.subtotal_taxable - (ro.total - ro.subtotal_taxable - ro.subtotal_no_taxable)) > 0 ? '' : ''}<span className="text-gray-400">${(Number(ro.subtotal_taxable) + Number(ro.subtotal_no_taxable)).toFixed(0)}</span></td>
                  <td className="px-4 py-3 text-gray-300 text-xs"></td>
                  <td className="px-4 py-3 text-white font-semibold">${Number(ro.total).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(ro)} className="text-gray-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => del(ro.id, ro.ro_number)} disabled={deleting===ro.id} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {ros.length === 0 && <div className="flex flex-col items-center justify-center h-40 text-gray-600"><Wrench className="w-8 h-8 mb-2 opacity-30" /><p className="text-sm">No repair orders in this date range</p></div>}
      </div>

      {modal.open && <RepairOrderModal ro={modal.ro} onClose={() => setModal({ open:false })} onSaved={load} />}
    </div>
  )
}
