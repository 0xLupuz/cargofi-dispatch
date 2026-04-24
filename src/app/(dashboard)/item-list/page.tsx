'use client'
import { useState, useEffect, useCallback } from 'react'
import { List, Plus, Search, Pencil, Trash2 } from 'lucide-react'
import ItemModal from '@/components/items/ItemModal'

const ALPHA = ['0-9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']

export default function ItemListPage() {
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [alphaFilter, setAlphaFilter] = useState('')
  const [modal, setModal] = useState<{ open:boolean; item?:any }>({ open:false })
  const [deleting, setDeleting] = useState<string|null>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (typeFilter !== 'All') params.set('type', typeFilter)
    if (search) params.set('q', search)
    const r = await fetch('/api/items?' + params.toString())
    if (r.ok) setItems(await r.json())
  }, [typeFilter, search])

  useEffect(() => { load() }, [load])

  const filtered = alphaFilter
    ? items.filter(it => {
        if (alphaFilter === '0-9') return /^[0-9]/.test(it.code ?? '')
        return (it.code ?? '').toUpperCase().startsWith(alphaFilter)
      })
    : items

  async function del(id: string) {
    if (!confirm('Delete this item?')) return
    setDeleting(id); await fetch(`/api/items/${id}`, { method:'DELETE' }); setDeleting(null); load()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d] flex-shrink-0">
        <div className="flex items-center gap-2">
          <List className="w-5 h-5 text-[#3ab690]" />
          <h1 className="text-white font-semibold text-lg">Item List</h1>
          <span className="text-xs text-[#484f58] bg-[#161b22] rounded-full px-2 py-0.5">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3ab690] cursor-pointer">
            <option>All</option><option value="P">Parts</option><option value="L">Labor</option>
          </select>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Code, item, description..." value={search} onChange={e => setSearch(e.target.value)} className="bg-[#161b22] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3ab690] w-56" />
          </div>
          <button onClick={() => setModal({ open:true })} className="flex items-center gap-2 bg-[#3ab690] hover:bg-[#1a9d75] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Alphabetical filter */}
      <div className="px-6 py-2 border-b border-[#21262d] flex items-center gap-1 flex-wrap flex-shrink-0">
        <button onClick={() => setAlphaFilter('')} className={`text-xs px-2 py-1 rounded transition-colors ${!alphaFilter ? 'bg-[#3ab690] text-white' : 'text-gray-500 hover:text-white hover:bg-[#161b22]'}`}>All</button>
        {ALPHA.map(a => (
          <button key={a} onClick={() => setAlphaFilter(alphaFilter === a ? '' : a)} className={`text-xs px-2 py-1 rounded transition-colors ${alphaFilter === a ? 'bg-[#3ab690] text-white' : 'text-[#484f58] hover:text-white hover:bg-[#161b22]'}`}>{a}</button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#080c12] border-b border-[#21262d]">
            <tr>{['Code','Type','Item','Sub-Item','Description','Charge/Hr','Taxable',''].map(h => <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {filtered.map(it => (
              <tr key={it.id} className="hover:bg-[#161b22]/30 transition-colors group">
                <td className="px-4 py-2.5 font-mono font-semibold text-[#3ab690] text-xs">{it.code}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${it.item_type === 'L' ? 'bg-amber-500/10 text-amber-400' : 'bg-[#58a6ff]/10 text-[#58a6ff]'}`}>{it.item_type === 'L' ? 'Labor' : 'Part'}</span>
                </td>
                <td className="px-4 py-2.5 text-gray-200 text-xs max-w-[140px] truncate">{it.item}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs max-w-[120px] truncate">{it.sub_item ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[160px] truncate">{it.description ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-300 text-xs">{it.charge_rate > 0 ? `$${Number(it.charge_rate).toFixed(2)}` : '—'}</td>
                <td className="px-4 py-2.5">{it.taxable ? <span className="text-xs text-emerald-400">Yes</span> : <span className="text-xs text-[#484f58]">No</span>}</td>
                <td className="px-4 py-2.5"><div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setModal({ open:true, item:it })} className="text-gray-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => del(it.id)} disabled={deleting===it.id} className="text-[#484f58] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="flex flex-col items-center justify-center h-40 text-[#484f58]"><List className="w-8 h-8 mb-2 opacity-30" /><p className="text-sm">{search ? 'No items found' : 'No items in catalog yet'}</p></div>}
      </div>

      {modal.open && <ItemModal item={modal.item} onClose={() => setModal({ open:false })} onSaved={load} />}
    </div>
  )
}
