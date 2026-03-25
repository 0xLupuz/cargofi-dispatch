import { Package, Plus } from 'lucide-react'
import type { KanbanStatus } from '@/types'

const COLUMNS: { status: KanbanStatus; label: string; color: string }[] = [
  { status: 'available',   label: 'Available',      color: 'border-gray-600' },
  { status: 'rate_con',    label: 'Rate Con',        color: 'border-blue-600' },
  { status: 'confirmed',   label: 'Confirmed',       color: 'border-purple-600' },
  { status: 'in_transit',  label: 'In Transit',      color: 'border-yellow-500' },
  { status: 'delivered',   label: 'Delivered',       color: 'border-orange-500' },
  { status: 'pod_received',label: 'POD Received',    color: 'border-teal-500' },
  { status: 'invoiced',    label: 'Invoiced',        color: 'border-indigo-500' },
  { status: 'paid',        label: 'Paid',            color: 'border-green-500' },
  { status: 'settled',     label: 'Settled',         color: 'border-green-700' },
]

export default function LoadsPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-400" />
          <h1 className="text-white font-semibold text-lg">Loads</h1>
        </div>
        <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          New Load
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto px-6 py-4">
        <div className="flex gap-4 h-full min-w-max">
          {COLUMNS.map(({ status, label, color }) => (
            <div key={status} className="flex flex-col w-64 flex-shrink-0">
              {/* Column header */}
              <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${color}`}>
                <span className="text-sm font-medium text-gray-300">{label}</span>
                <span className="text-xs text-gray-500 bg-gray-800 rounded-full px-2 py-0.5">0</span>
              </div>

              {/* Cards drop zone */}
              <div className="flex-1 space-y-2 min-h-32 rounded-lg border border-dashed border-gray-800 p-2">
                {/* Empty state */}
                <div className="flex items-center justify-center h-20 text-gray-700 text-xs">
                  No loads
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
