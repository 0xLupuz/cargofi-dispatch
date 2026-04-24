'use client'
import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, Search, Pencil, Trash2, Globe, Phone } from 'lucide-react'
import CustomerModal from '@/components/customers/CustomerModal'

const TYPE_COLORS: Record<string,string> = {
  Broker:   'bg-[#58a6ff]/10 text-[#58a6ff]',
  Shipper:  'bg-purple-500/10 text-purple-400',
  Receiver: 'bg-teal-500/10 text-teal-400',
  Customer: 'bg-[rgba(58,182,144,0.1)] text-[#3ab690]',
  '3PL':    'bg-indigo-500/10 text-indigo-400',
  Other:    'bg-gray-700 text-gray-400',
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; customer?: any }>({ open: false })
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/customers')
    if (res.ok) setCustomers(await res.json())
  }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    let list = showInactive ? customers : customers.filter(c => c.active)
    if (search) list = list.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.mc_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase())
    )
    setFiltered(list)
  }, [customers, search, showInactive])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete customer "${name}"?`)) return
    setDeleting(id)
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    setDeleting(null)
    load()
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#3ab690]" />
          <h1 className="text-white font-semibold text-lg">Customers</h1>
          <span className="text-xs text-[#484f58] bg-[#161b22] rounded-full px-2 py-0.5">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="accent-orange-500" />
            Show Inactive
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Name, MC #, city..." value={search} onChange={e => setSearch(e.target.value)}
              className="bg-[#161b22] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3ab690] w-60" />
          </div>
          <button onClick={() => setModal({ open: true })} className="flex items-center gap-2 bg-[#3ab690] hover:bg-[#1a9d75] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#080c12] border-b border-[#21262d]">
            <tr>
              {['Customer Name','Type','MC #','City / State','Telephone','Billing Email','Status',''].map(h => (
                <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-[#161b22]/30 transition-colors group">
                <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${TYPE_COLORS[c.customer_type] ?? TYPE_COLORS.Other}`}>
                    {c.customer_type ?? 'Customer'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{c.mc_number ?? '—'}</td>
                <td className="px-4 py-3 text-gray-300">{c.city ? `${c.city}, ${c.state ?? ''}` : '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{c.telephone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">{c.billing_email ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${c.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-700/60 text-gray-500'}`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModal({ open: true, customer: c })} className="text-gray-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(c.id, c.name)} disabled={deleting === c.id} className="text-[#484f58] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-[#484f58]">
            <Building2 className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">{search ? 'No customers found' : 'No customers yet'}</p>
          </div>
        )}
      </div>

      {modal.open && <CustomerModal customer={modal.customer} onClose={() => setModal({ open: false })} onSaved={load} />}
    </div>
  )
}
