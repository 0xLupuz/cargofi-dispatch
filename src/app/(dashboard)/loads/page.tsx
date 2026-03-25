'use client'

import { useState } from 'react'
import { Package, Plus, RefreshCw, FileSearch } from 'lucide-react'
import KanbanBoard from '@/components/loads/KanbanBoard'
import NewLoadModal from '@/components/loads/NewLoadModal'
import DocumentParser from '@/components/documents/DocumentParser'
import type { Load } from '@/types'

export default function LoadsPage() {
  const [showNew, setShowNew] = useState(false)
  const [showParser, setShowParser] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null)

  function handleCreated() {
    setShowNew(false)
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-400" />
          <h1 className="text-white font-semibold text-lg">Loads</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowParser(true)}
            className="flex items-center gap-2 border border-gray-700 text-gray-300 hover:border-orange-500 hover:text-orange-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <FileSearch className="w-4 h-4" />
            Parse BOL / Rate Con
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Load
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto px-6 py-4">
        <KanbanBoard
          onCardClick={setSelectedLoad}
          refreshKey={refreshKey}
        />
      </div>

      {/* Modals */}
      {showNew && (
        <NewLoadModal
          onClose={() => setShowNew(false)}
          onCreated={handleCreated}
        />
      )}
      {showParser && (
        <DocumentParser
          onClose={() => setShowParser(false)}
          onLoadCreated={(data) => {
            setShowParser(false)
            setShowNew(true)
          }}
        />
      )}
    </div>
  )
}
