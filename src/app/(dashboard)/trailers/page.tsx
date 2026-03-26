'use client'
import { useState, useEffect, useCallback } from 'react'
import { Box, Plus, Search, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import TrailerModal from '@/components/trailers/TrailerModal'

function expBadge(date?: string | null) {
  if (!date) return null
  const d = new Date(date + 'T12:00:00')
  const diff = Math.round((d.getTime() - Date.now()) / 86400000)
  if (diff < 0)  return <span className="text-[10px] bg-red-500/20 text-red-400 rounded px-1.5 py-0.5">Expired</span>
  if (diff <= 30) return <span className="text-[10px] bg-amber-500/20 text-amber-400 rounded px-1.5 py-0.5">{diff}d</span>
  return <span className="text-[10px] text-gray-500">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
}

export default function TrailersPage() {
  const [trailers, setTrailers] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; trailer?: any }>({ open: false })
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/trailers')
    if (res.ok) setTrailers(await res.json())
  }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    let list = showInactive ? trailers : trailers.filter(t => t.active)
    if (search) list = list.filter(t =>
      t.trailer_number?.toLowerCase().includes(search.toLowerCase()) ||
      t.vin?.toLowerCase().includes(search.toLowerCase()) ||
      t.license_plate?.toLowerCase().includes(search.toLowerCase())
    )
    setFiltered(list)
  }, [trailers, search, showInactive])

  async function handleDelete(id: string, num: string) {
    if (!confirm(`Delete trailer #${num}?`)) return
    setDeleting(id)
    await fetch(`/api/trailers/${id}`, { method: 'DELETE' })
    setDeleting(null)
    load()
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-orange-400" />
          <h1 className="text-white font-semibold text-lg">Trailers</h1>
          <span className="text-xs text-gray-600 bg-gray-800 rounded-full px-2 py-0.5">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="accent-orange-500" />
            Show Inactive
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Search trailer, VIN, plate..." value={search} onChange={e => setSearch(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 w-60" />
          </div>
          <button onClick={() => setModal({ open: true })} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Trailer
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-950 border-b border-gray-800">
            <tr>
              {['Trailer #','VIN','Type','Plates / State','Inspection','Lease','Bond','Carrier','Status',''].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-gray-800/30 transition-colors group">
                <td className="px-4 py-3 font-mono font-semibold text-orange-400">{t.trailer_number}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{t.vin ?? '—'}</td>
                <td className="px-4 py-3 text-gray-300">{t.trailer_type ?? '—'}</td>
                <td className="px-4 py-3 text-gray-300">{t.license_plate ? `${t.license_plate} / ${t.plate_state ?? ''}` : '—'}</td>
                <td className="px-4 py-3">{expBadge(t.inspection_expiry)}</td>
                <td className="px-4 py-3">{expBadge(t.lease_expiry)}</td>
                <td className="px-4 py-3">{expBadge(t.bond_expiry)}</td>
                <td className="px-4 py-3 text-gray-400 max-w-[120px] truncate">{t.carrier ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${t.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-700/60 text-gray-500'}`}>
                    {t.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModal({ open: true, trailer: t })} className="text-gray-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(t.id, t.trailer_number)} disabled={deleting === t.id} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-600">
            <Box className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">{search ? 'No trailers found' : 'No trailers yet'}</p>
          </div>
        )}
      </div>

      {modal.open && <TrailerModal trailer={modal.trailer} onClose={() => setModal({ open: false })} onSaved={load} />}
    </div>
  )
}
