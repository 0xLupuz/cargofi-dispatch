'use client'

import { useState, useEffect } from 'react'
import { Upload, FileText, Trash2, ExternalLink, AlertTriangle, Plus } from 'lucide-react'

export interface EntityDoc {
  id: string
  doc_category: string
  doc_name: string
  file_url: string
  file_path: string
  expiry_date?: string
  notes?: string
  uploaded_at: string
}

interface Props {
  entityType: 'unit' | 'owner_operator' | 'driver' | 'load'
  entityId: string
  categories: { value: string; label: string }[]
}

export default function DocUploader({ entityType, entityId, categories }: Props) {
  const [docs, setDocs] = useState<EntityDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ doc_category: categories[0]?.value ?? '', doc_name: '', expiry_date: '', notes: '' })
  const [file, setFile] = useState<File | null>(null)

  async function fetchDocs() {
    setLoading(true)
    const res = await fetch(`/api/documents?entity_type=${entityType}&entity_id=${entityId}`)
    if (res.ok) setDocs(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchDocs() }, [entityId])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploading(true)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('entity_type', entityType)
    fd.append('entity_id', entityId)
    fd.append('doc_category', form.doc_category)
    fd.append('doc_name', form.doc_name || form.doc_category)
    if (form.expiry_date) fd.append('expiry_date', form.expiry_date)
    if (form.notes) fd.append('notes', form.notes)

    const res = await fetch('/api/documents', { method: 'POST', body: fd })
    if (res.ok) {
      const doc = await res.json()
      setDocs(prev => [doc, ...prev])
      setShowForm(false)
      setFile(null)
      setForm({ doc_category: categories[0]?.value ?? '', doc_name: '', expiry_date: '', notes: '' })
    }
    setUploading(false)
  }

  async function handleDelete(doc: EntityDoc) {
    if (!confirm(`¿Eliminar "${doc.doc_name}"?`)) return
    await fetch('/api/documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: doc.id, file_path: doc.file_path }),
    })
    setDocs(prev => prev.filter(d => d.id !== doc.id))
  }

  function expiryAlert(expiry?: string) {
    if (!expiry) return null
    const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
    if (days < 0) return 'text-red-400'
    if (days < 30) return 'text-yellow-400'
    return null
  }

  const inp = 'w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Documentos ({docs.length})</p>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Subir documento
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <form onSubmit={handleUpload} className="bg-gray-700/50 rounded-lg p-3 space-y-2 border border-gray-600">
          <div className="grid grid-cols-2 gap-2">
            <select className={inp} value={form.doc_category}
              onChange={e => setForm(f => ({ ...f, doc_category: e.target.value }))}>
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input className={inp} placeholder="Nombre (ej: Seguro 2026)"
              value={form.doc_name} onChange={e => setForm(f => ({ ...f, doc_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Vencimiento (opcional)</label>
              <input className={inp} type="date" value={form.expiry_date}
                onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Archivo *</label>
              <input className={inp + ' cursor-pointer'} type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={e => setFile(e.target.files?.[0] ?? null)} required />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-600 text-gray-400 rounded-lg py-1.5 text-xs hover:bg-gray-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={uploading || !file}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg py-1.5 text-xs font-medium transition-colors">
              {uploading ? 'Subiendo...' : 'Subir'}
            </button>
          </div>
        </form>
      )}

      {/* Docs list */}
      {loading && <p className="text-gray-600 text-xs">Cargando...</p>}
      {!loading && docs.length === 0 && !showForm && (
        <p className="text-gray-600 text-xs">Sin documentos. Sube el primero →</p>
      )}
      <div className="space-y-1.5">
        {docs.map(doc => {
          const alertCls = expiryAlert(doc.expiry_date)
          return (
            <div key={doc.id} className="flex items-center gap-2 bg-gray-700/40 rounded-lg px-3 py-2">
              <FileText className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{doc.doc_name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="bg-gray-700 rounded px-1">{doc.doc_category}</span>
                  {doc.expiry_date && (
                    <span className={alertCls ?? 'text-gray-500'}>
                      {alertCls === 'text-red-400' ? '⚠ ' : ''}
                      Vence: {new Date(doc.expiry_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </p>
              </div>
              <a href={doc.file_url} target="_blank" rel="noreferrer"
                className="text-gray-500 hover:text-white p-1 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button onClick={() => handleDelete(doc)}
                className="text-gray-600 hover:text-red-400 p-1 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
