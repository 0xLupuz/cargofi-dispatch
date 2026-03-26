'use client'

import { useState } from 'react'
import { Package, Plus, RefreshCw, FileSearch, LayoutGrid, Clock } from 'lucide-react'
import KanbanBoard from '@/components/loads/KanbanBoard'
import LoadsHistory from '@/components/loads/LoadsHistory'
import NewLoadModal from '@/components/loads/NewLoadModal'
import DocumentParser from '@/components/documents/DocumentParser'
import LoadDrawer from '@/components/loads/LoadDrawer'
import type { Load } from '@/types'

type Tab = 'board' | 'history'

export default function LoadsPage() {
  const [tab, setTab] = useState<Tab>('board')
  const [showNew, setShowNew] = useState(false)
  const [showParser, setShowParser] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null)

  function handleCreated() {
    setShowNew(false)
    setRefreshKey(k => k + 1)
  }

  const tabClass = (t: Tab) =>
    `flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      tab === t
        ? 'bg-gray-800 text-white'
        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
    }`

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-400" />
            <h1 className="text-white font-semibold text-lg">Loads</h1>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
            <button className={tabClass('board')} onClick={() => setTab('board')}>
              <LayoutGrid className="w-3.5 h-3.5" />
              Board
            </button>
            <button className={tabClass('history')} onClick={() => setTab('history')}>
              <Clock className="w-3.5 h-3.5" />
              History
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tab === 'board' && (
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
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

      {/* Content */}
      {tab === 'board' ? (
        <div className="flex-1 overflow-x-auto px-6 py-5">
          <KanbanBoard
            onCardClick={(load: Load) => setSelectedLoadId(load.id)}
            refreshKey={refreshKey}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <LoadsHistory
            onCardClick={(load: Load) => setSelectedLoadId(load.id)}
          />
        </div>
      )}

      {/* Modals */}
      {showNew && (
        <NewLoadModal onClose={() => setShowNew(false)} onCreated={handleCreated} />
      )}
      {showParser && (
        <DocumentParser
          onClose={() => setShowParser(false)}
          onLoadCreated={() => { setShowParser(false); setRefreshKey(k => k + 1) }}
        />
      )}

      {/* Load Detail Drawer */}
      {selectedLoadId && (
        <LoadDrawer
          loadId={selectedLoadId}
          onClose={() => setSelectedLoadId(null)}
          onUpdated={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  )
}
