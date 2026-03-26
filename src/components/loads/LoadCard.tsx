'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MapPin, DollarSign, Truck, User, Clock } from 'lucide-react'
import type { Load } from '@/types'

function ETABadge({ deliveryDate }: { deliveryDate?: string | null }) {
  if (!deliveryDate) return null

  const eta   = new Date(deliveryDate + 'T12:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const etaDay = new Date(eta); etaDay.setHours(0,0,0,0)
  const diffDays = Math.round((etaDay.getTime() - today.getTime()) / 86400000)

  const label = eta.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  let cls = 'text-gray-500'
  let dot  = 'bg-gray-600'

  if (diffDays < 0) {
    cls = 'text-red-400 font-semibold'   // overdue
    dot = 'bg-red-500'
  } else if (diffDays === 0) {
    cls = 'text-amber-400 font-semibold' // today
    dot = 'bg-amber-400'
  } else if (diffDays === 1) {
    cls = 'text-amber-300'               // tomorrow
    dot = 'bg-amber-400'
  }

  return (
    <span className={`flex items-center gap-1 text-xs ml-auto ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      <Clock className="w-3 h-3 flex-shrink-0" />
      ETA {label}
    </span>
  )
}

const CHECKLIST: { field: keyof Load; label: string }[] = [
  { field: 'rate_con_ok', label: 'Rate Con' },
  { field: 'pod_ok',      label: 'POD'      },
  { field: 'invoiced_ok', label: 'Invoice'  },
  { field: 'paid_ok',     label: 'Paid'     },
  { field: 'settled_ok',  label: 'Settled'  },
]

interface Props {
  load: Load
  onClick: (load: Load) => void
  onChecklistToggle: (loadId: string, field: string, value: boolean) => void
}

export default function LoadCard({ load, onClick, onChecklistToggle }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: load.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  const origin = load.stops?.find(s => s.stop_type === 'pickup')
  const dest   = load.stops?.find(s => s.stop_type === 'delivery')

  const completedSteps = CHECKLIST.filter(c => load[c.field]).length
  const allDone = completedSteps === CHECKLIST.length

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(load)}
      className={`bg-gray-900 border rounded-xl p-3.5 cursor-pointer select-none transition-all group ${
        allDone
          ? 'border-emerald-700/60 hover:border-emerald-500/60'
          : 'border-gray-700/80 hover:border-orange-500/50'
      } ${isDragging ? 'shadow-2xl' : 'hover:shadow-lg'}`}
    >
      {/* Top row: Load # + WO# + rate */}
      <div className="flex items-start justify-between mb-2.5">
        <div>
          <span className="text-xs font-mono font-semibold text-orange-400">
            {load.load_number}
          </span>
          {load.work_order_number && (
            <span className="text-xs text-gray-600 ml-2">WO# {load.work_order_number}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5 text-sm font-bold text-white">
          <DollarSign className="w-3.5 h-3.5 text-green-400" />
          {load.rate.toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </div>
      </div>

      {/* Route */}
      {(origin || dest) && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-300">
          <MapPin className="w-3 h-3 text-gray-500 flex-shrink-0" />
          <span className="truncate font-medium">
            {origin?.city ?? '—'}, {origin?.state ?? ''}
            <span className="text-gray-600 mx-1.5">→</span>
            {dest?.city ?? '—'}, {dest?.state ?? ''}
          </span>
        </div>
      )}

      {/* Broker + ETA */}
      <div className="flex items-center justify-between mb-3">
        {load.broker_name && (
          <span className="text-xs text-gray-500 truncate max-w-[120px]">{load.broker_name}</span>
        )}
        <ETABadge deliveryDate={load.delivery_date} />
      </div>

      {/* OO + Driver */}
      <div className="flex items-center gap-3 mb-3">
        {load.owner_operator && (
          <div className="flex items-center gap-1 text-xs text-gray-400 min-w-0">
            <Truck className="w-3 h-3 flex-shrink-0 text-gray-500" />
            <span className="truncate">{load.owner_operator.name}</span>
          </div>
        )}
        {load.driver && load.driver.id !== load.owner_operator?.id && (
          <div className="flex items-center gap-1 text-xs text-gray-500 min-w-0">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{load.driver.name}</span>
          </div>
        )}
      </div>

      {/* Progress checklist — stop propagation so clicks don't open drawer or trigger drag */}
      <div
        className="flex items-center gap-1 pt-2.5 border-t border-gray-800"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        {CHECKLIST.map(({ field, label }) => {
          const done = Boolean(load[field])
          return (
            <button
              key={field}
              title={label}
              onClick={e => {
                e.stopPropagation()
                onChecklistToggle(load.id, field, !done)
              }}
              className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-md transition-colors ${
                done
                  ? 'text-emerald-400 hover:text-emerald-300'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full transition-colors ${
                done ? 'bg-emerald-400' : 'bg-gray-700'
              }`} />
              <span className="text-[9px] leading-none font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
