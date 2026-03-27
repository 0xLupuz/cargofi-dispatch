'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MapPin, DollarSign, Truck, User, ArrowUpFromLine, Clock, CheckCircle2 } from 'lucide-react'
import type { Load } from '@/types'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(dateStr?: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function etaColor(dateStr?: string | null): string {
  if (!dateStr) return 'text-gray-500'
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(dateStr + 'T12:00:00'); d.setHours(0,0,0,0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return 'text-red-400 font-semibold'
  if (diff === 0) return 'text-amber-400 font-semibold'
  if (diff === 1) return 'text-amber-300'
  return 'text-gray-400'
}

// ─── DateRow ──────────────────────────────────────────────────────────────────

function DateRow({ load }: { load: Load }) {
  const pickupStop   = load.stops?.find(s => s.stop_type === 'pickup')
  const deliveryStop = load.stops?.find(s => s.stop_type === 'delivery')
  const departedAt   = pickupStop?.actual_departure_at ?? load.pickup_date ?? null
  const expectedAt   = pickupStop?.appointment_at ?? load.pickup_date ?? null
  const deliveredAt  = deliveryStop?.actual_arrival_at ?? load.delivery_date ?? null
  const etaAt        = deliveryStop?.appointment_at ?? load.delivery_date ?? null

  if (load.trip_status === 'open') return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1 text-gray-600"><ArrowUpFromLine className="w-3 h-3" />Departed: <span className="text-gray-600 ml-0.5">N/A</span></span>
      <span className="flex items-center gap-1 text-gray-500"><Clock className="w-3 h-3" />Appt: <span className="text-gray-400 ml-0.5">{fmt(expectedAt)}</span></span>
    </div>
  )
  if (load.trip_status === 'in_transit') return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1 text-gray-500"><ArrowUpFromLine className="w-3 h-3 text-amber-500" />Departed: <span className="text-gray-300 ml-0.5">{fmt(departedAt)}</span></span>
      <span className={`flex items-center gap-1 ${etaColor(etaAt)}`}><Clock className="w-3 h-3" />ETA: <span className="ml-0.5">{fmt(etaAt)}</span></span>
    </div>
  )
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1 text-gray-500"><ArrowUpFromLine className="w-3 h-3" />Departed: <span className="text-gray-400 ml-0.5">{fmt(departedAt)}</span></span>
      <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" />Delivered: <span className="ml-0.5">{fmt(deliveredAt)}</span></span>
    </div>
  )
}

// ─── Checklist ────────────────────────────────────────────────────────────────

const CHECKLIST: { field: keyof Load; label: string }[] = [
  { field: 'rate_con_ok', label: 'Rate Con' },
  { field: 'pod_ok',      label: 'POD'      },
  { field: 'invoiced_ok', label: 'Invoice'  },
  { field: 'paid_ok',     label: 'Paid'     },
  { field: 'settled_ok',  label: 'Settled'  },
]

// ─── Shared card body (no dnd-kit, no refs, pure UI) ─────────────────────────

interface CardBodyProps {
  load: Load
  isDragging?: boolean
  onChecklistToggle: (loadId: string, field: string, value: boolean) => void
}

function CardBody({ load, isDragging = false, onChecklistToggle }: CardBodyProps) {
  const origin = load.stops?.find(s => s.stop_type === 'pickup')
  const dest   = load.stops?.find(s => s.stop_type === 'delivery')
  const completedSteps = CHECKLIST.filter(c => load[c.field]).length
  const allDone = completedSteps === CHECKLIST.length

  return (
    <div className={`bg-gray-900 border rounded-xl p-3.5 select-none transition-all group ${
      allDone ? 'border-emerald-700/60' : 'border-gray-700/80'
    } ${isDragging ? 'shadow-2xl opacity-35' : ''}`}>

      {/* Top: Load # + rate */}
      <div className="flex items-start justify-between mb-2.5">
        <div>
          <span className="text-xs font-mono font-semibold text-orange-400">{load.load_number}</span>
          {load.work_order_number && <span className="text-xs text-gray-600 ml-2">WO# {load.work_order_number}</span>}
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

      {/* Broker */}
      {load.broker_name && <p className="text-xs text-gray-500 truncate mb-1.5">{load.broker_name}</p>}

      {/* Date row */}
      <div className="mb-3 bg-gray-800/50 rounded-md px-2 py-1.5">
        <DateRow load={load} />
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

      {/* Checklist */}
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
              onClick={e => { e.stopPropagation(); onChecklistToggle(load.id, field, !done) }}
              className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-md transition-colors ${
                done ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full transition-colors ${done ? 'bg-emerald-400' : 'bg-gray-700'}`} />
              <span className="text-[9px] leading-none font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  load: Load
  onClick: (load: Load) => void
  onChecklistToggle: (loadId: string, field: string, value: boolean) => void
  draggable?: boolean
}

// ─── SortableLoadCard — desktop only, uses useSortable ────────────────────────

function SortableLoadCard({ load, onClick, onChecklistToggle }: Omit<Props, 'draggable'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: load.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => onClick(load)}
      className="cursor-pointer hover:scale-[1.01] transition-transform"
    >
      <CardBody load={load} isDragging={isDragging} onChecklistToggle={onChecklistToggle} />
    </div>
  )
}

// ─── StaticLoadCard — mobile, ZERO dnd-kit, plain div with onClick ────────────

function StaticLoadCard({ load, onClick, onChecklistToggle }: Omit<Props, 'draggable'>) {
  return (
    <div onClick={() => onClick(load)} className="cursor-pointer active:opacity-80 transition-opacity">
      <CardBody load={load} onChecklistToggle={onChecklistToggle} />
    </div>
  )
}

// ─── Default export — picks the right variant ─────────────────────────────────

export default function LoadCard({ draggable = true, ...props }: Props) {
  if (!draggable) return <StaticLoadCard {...props} />
  return <SortableLoadCard {...props} />
}
