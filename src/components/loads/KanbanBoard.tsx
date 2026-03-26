'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext, DragOverlay, DragEndEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import LoadCard from './LoadCard'
import type { Load, KanbanStatus } from '@/types'

const COLUMNS: { status: KanbanStatus; label: string; accent: string }[] = [
  { status: 'available',    label: 'Available',    accent: 'border-gray-500' },
  { status: 'rate_con',     label: 'Rate Con',     accent: 'border-blue-500' },
  { status: 'confirmed',    label: 'Confirmed',    accent: 'border-purple-500' },
  { status: 'in_transit',   label: 'In Transit',   accent: 'border-yellow-400' },
  { status: 'delivered',    label: 'Delivered',    accent: 'border-orange-500' },
  { status: 'pod_received', label: 'POD Received', accent: 'border-teal-500' },
  { status: 'invoiced',     label: 'Invoiced',     accent: 'border-indigo-500' },
  { status: 'paid',         label: 'Paid',         accent: 'border-green-500' },
  { status: 'settled',      label: 'Settled',      accent: 'border-green-700' },
]

function DroppableColumn({
  status, label, accent, loads, onCardClick,
}: {
  status: KanbanStatus
  label: string
  accent: string
  loads: Load[]
  onCardClick: (load: Load) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col w-60 flex-shrink-0">
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${accent}`}>
        <span className="text-sm font-medium text-gray-200">{label}</span>
        <span className="text-xs text-gray-500 bg-gray-800 rounded-full px-2 py-0.5">
          {loads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 min-h-[120px] rounded-lg p-1.5 transition-colors ${
          isOver ? 'bg-gray-800/60 ring-1 ring-orange-500/30' : ''
        }`}
      >
        <SortableContext items={loads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {loads.map(load => (
            <LoadCard key={load.id} load={load} onClick={onCardClick} />
          ))}
        </SortableContext>
        {loads.length === 0 && (
          <div className="flex items-center justify-center h-16 text-gray-700 text-xs">
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
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragStart({ active }: DragStartEvent) {
    setActiveLoad(loads.find(l => l.id === active.id) ?? null)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveLoad(null)
    if (!over) return

    const loadId = active.id as string

    // over.id can be a column status OR another card's UUID (when dropped on top of a card)
    const validStatuses = COLUMNS.map(c => c.status) as string[]
    let newStatus: KanbanStatus

    if (validStatuses.includes(over.id as string)) {
      newStatus = over.id as KanbanStatus
    } else {
      // Dropped on a card — resolve to that card's column
      const targetLoad = loads.find(l => l.id === over.id)
      if (!targetLoad) return
      newStatus = targetLoad.kanban_status
    }

    const load = loads.find(l => l.id === loadId)
    if (!load || load.kanban_status === newStatus) return

    // Optimistic update
    setLoads(prev =>
      prev.map(l => l.id === loadId ? { ...l, kanban_status: newStatus } : l)
    )

    await fetch(`/api/loads/${loadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kanban_status: newStatus }),
    })
  }

  const byStatus = (status: KanbanStatus) => loads.filter(l => l.kanban_status === status)

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
      <div className="flex gap-4 h-full min-w-max pb-4">
        {COLUMNS.map(col => (
          <DroppableColumn
            key={col.status}
            {...col}
            loads={byStatus(col.status)}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLoad && (
          <div className="rotate-2 opacity-90">
            <LoadCard load={activeLoad} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
