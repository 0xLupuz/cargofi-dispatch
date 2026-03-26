'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext, DragOverlay, DragEndEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import LoadCard from './LoadCard'
import type { Load, TripStatus } from '@/types'

const COLUMNS: { status: TripStatus; label: string; accent: string; dot: string }[] = [
  { status: 'open',       label: 'Open',       accent: 'border-blue-500',   dot: 'bg-blue-500'   },
  { status: 'in_transit', label: 'In Transit', accent: 'border-amber-400',  dot: 'bg-amber-400'  },
  { status: 'delivered',  label: 'Delivered',  accent: 'border-emerald-500', dot: 'bg-emerald-500' },
]

function DroppableColumn({
  status, label, accent, dot, loads, onCardClick, onChecklistToggle,
}: {
  status: TripStatus
  label: string
  accent: string
  dot: string
  loads: Load[]
  onCardClick: (load: Load) => void
  onChecklistToggle: (loadId: string, field: string, value: boolean) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col flex-1 min-w-[280px] max-w-[360px]">
      {/* Column header */}
      <div className={`flex items-center gap-2.5 mb-3 pb-2.5 border-b-2 ${accent}`}>
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <span className="text-sm font-semibold text-gray-100">{label}</span>
        <span className="text-xs text-gray-500 bg-gray-800/80 rounded-full px-2 py-0.5 ml-auto">
          {loads.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-3 min-h-[200px] rounded-xl p-2 transition-colors ${
          isOver ? 'bg-gray-800/50 ring-1 ring-orange-500/40' : ''
        }`}
      >
        <SortableContext items={loads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {loads.map(load => (
            <LoadCard
              key={load.id}
              load={load}
              onClick={onCardClick}
              onChecklistToggle={onChecklistToggle}
            />
          ))}
        </SortableContext>
        {loads.length === 0 && (
          <div className="flex items-center justify-center h-20 text-gray-700 text-xs border border-dashed border-gray-800 rounded-lg">
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  onCardClick: (load: Load) => void
  refreshKey: number
}

export default function KanbanBoard({ onCardClick, refreshKey }: Props) {
  const [loads, setLoads] = useState<Load[]>([])
  const [activeLoad, setActiveLoad] = useState<Load | null>(null)
  const [fetching, setFetching] = useState(true)

  const fetchLoads = useCallback(async () => {
    setFetching(true)
    const res = await fetch('/api/loads')
    if (res.ok) setLoads(await res.json())
    setFetching(false)
  }, [])

  useEffect(() => { fetchLoads() }, [fetchLoads, refreshKey])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragStart({ active }: DragStartEvent) {
    setActiveLoad(loads.find(l => l.id === active.id) ?? null)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveLoad(null)
    if (!over) return

    const loadId = active.id as string
    const validStatuses = COLUMNS.map(c => c.status) as string[]

    let newStatus: TripStatus
    if (validStatuses.includes(over.id as string)) {
      newStatus = over.id as TripStatus
    } else {
      // Dropped on another card — use that card's column
      const targetLoad = loads.find(l => l.id === over.id)
      if (!targetLoad) return
      newStatus = targetLoad.trip_status
    }

    const load = loads.find(l => l.id === loadId)
    if (!load || load.trip_status === newStatus) return

    // Optimistic
    setLoads(prev => prev.map(l => l.id === loadId ? { ...l, trip_status: newStatus } : l))

    const res = await fetch(`/api/loads/${loadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_status: newStatus }),
    })
    if (!res.ok) {
      // Revert on error
      setLoads(prev => prev.map(l => l.id === loadId ? { ...l, trip_status: load.trip_status } : l))
    }
  }

  async function handleChecklistToggle(loadId: string, field: string, value: boolean) {
    // Optimistic update
    setLoads(prev => prev.map(l => l.id === loadId ? { ...l, [field]: value } : l))

    const res = await fetch(`/api/loads/${loadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })

    if (res.ok && field === 'settled_ok' && value === true) {
      // Auto-archive: remove from board after brief delay
      setTimeout(() => {
        setLoads(prev => prev.filter(l => l.id !== loadId))
      }, 800)
    } else if (!res.ok) {
      // Revert
      setLoads(prev => prev.map(l => l.id === loadId ? { ...l, [field]: !value } : l))
    }
  }

  const byStatus = (status: TripStatus) => loads.filter(l => l.trip_status === status)

  if (fetching) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Loading loads...
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-5 h-full pb-4">
        {COLUMNS.map(col => (
          <DroppableColumn
            key={col.status}
            {...col}
            loads={byStatus(col.status)}
            onCardClick={onCardClick}
            onChecklistToggle={handleChecklistToggle}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLoad && (
          <div className="rotate-1 opacity-90 scale-105">
            <LoadCard load={activeLoad} onClick={() => {}} onChecklistToggle={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
