'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DollarSign, Truck, User, MapPin } from 'lucide-react'
import type { Load } from '@/types'

interface Props {
  load: Load
  onClick: (load: Load) => void
}

export default function LoadCard({ load, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: load.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const origin = load.stops?.find(s => s.stop_type === 'pickup')
  const dest   = load.stops?.find(s => s.stop_type === 'delivery')

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(load)}
      className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-orange-500/50 transition-colors select-none"
    >
      {/* Load # + Broker */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-orange-400">#{load.load_number}</span>
        <span className="text-xs text-gray-500 truncate max-w-[100px]">{load.broker_name}</span>
      </div>

      {/* Route */}
      {(origin || dest) && (
        <div className="flex items-center gap-1 mb-2 text-xs text-gray-300">
          <MapPin className="w-3 h-3 text-gray-500 flex-shrink-0" />
          <span className="truncate">
            {origin?.city ?? '?'}, {origin?.state ?? '?'}
            <span className="text-gray-600 mx-1">→</span>
            {dest?.city ?? '?'}, {dest?.state ?? '?'}
          </span>
        </div>
      )}

      {/* OO + Driver */}
      <div className="space-y-1">
        {load.owner_operator && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Truck className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{load.owner_operator.name}</span>
          </div>
        )}
        {load.driver && load.driver.id !== load.owner_operator?.id && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{load.driver.name}</span>
          </div>
        )}
      </div>

      {/* Rate */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
        <div className="flex items-center gap-1 text-sm font-semibold text-white">
          <DollarSign className="w-3 h-3 text-green-400" />
          {load.rate.toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </div>
        {load.pickup_date && (
          <span className="text-xs text-gray-500">
            {new Date(load.pickup_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  )
}
