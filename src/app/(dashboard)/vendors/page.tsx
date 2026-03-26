'use client'
import { useState, useEffect, useCallback } from 'react'
import { Store, Plus, Search, Pencil, Trash2 } from 'lucide-react'
import VendorModal from '@/components/vendors/VendorModal'
export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ open:boolean; vendor?:any }>({ open:false })
  const [deleting, setDeleting] = useState<string|null>(null)
  const load = useCallback(async () => { const r = await fetch('/api/vendors'); if (r.ok) setVendors(await r.json()) }, [])
  useEffect(() => { load() }, [load])
  const filtered = vendors.filter(v => !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.city?.toLowerCase().includes(search.toLowerCase()))
  async function del(id: string, name: string) {
    if (!confirm(`Delete vendor "${name}"?`)) return
    setDeleting(id); await fetch(`/api/vendors/${id}`, { method:'DELETE' }); setDeleting(null); load()
  }
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2"><Store className="w-5 h-5 text-orange-400" /><h1 className="text-white font-semibold text-lg">Vendors</h1><span className="text-xs text-gray-600 bg-gray-800 rounded-full px-2 py-0.5">{filtered.length}</span></div>
        <div className="flex items-center gap-3">
          <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder="Name, city..." value={search} onChange={e => setSearch(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 w-52" /></div>
          <button onClick={() => setModal({ open:true })} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"><Plus className="w-4 h-4" /> Add Vendor</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-950 border-b border-gray-800">
            <tr>{['Name','Address','City / State','Contact','Telephone','Email',''].map(h => <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {filtered.map(v => (
              <tr key={v.id} className="hover:bg-gray-800/30 transition-colors group">
                <td className="px-4 py-3 font-medium text-white">{v.name}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{v.address ?? '—'}</td>
                <td className="px-4 py-3 text-gray-300">{v.city ? `${v.city}, ${v.state ?? ''}` : '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{v.contact_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{v.telephone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{v.email ?? '—'}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setModal({ open:true, vendor:v })} className="text-gray-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => del(v.id, v.name)} disabled={deleting===v.id} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="flex flex-col items-center justify-center h-40 text-gray-600"><Store className="w-8 h-8 mb-2 opacity-30" /><p className="text-sm">{search ? 'No vendors found' : 'No vendors yet'}</p></div>}
      </div>
      {modal.open && <VendorModal vendor={modal.vendor} onClose={() => setModal({ open:false })} onSaved={load} />}
    </div>
  )
}
