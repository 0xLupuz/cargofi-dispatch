'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext, DragOverlay, DragEndEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import LoadCard from './LoadCard'
import type { Load, TripStatus } from '@/types'

const COLUMNS: { status: TripStatus; label: string; accent: string; dot: string; border: string }[] = [
  { status: 'open',       label: 'Open',       accent: 'border-[#58a6ff]',    dot: 'bg-[#58a6ff]',    border: 'border-[#58a6ff]/30'   },
  { status: 'in_transit', label: 'In Transit', accent: 'border-amber-400',   dot: 'bg-amber-400',   border: 'border-amber-400/30'  },
  { status: 'delivered',  label: 'Delivered',  accent: 'border-emerald-500', dot: 'bg-emerald-500', border: 'border-emerald-500/30' },
]

// ── Desktop: droppable column with DnD + collapse ─────────────────────────────
function DroppableColumn({
  status, label, accent, dot, loads, onCardClick, onChecklistToggle,
}: {
  status: TripStatus; label: string; accent: string; dot: string
  loads: Load[]
  onCardClick: (load: Load) => void
  onChecklistToggle: (loadId: string, field: string, value: boolean) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <div className="flex flex-col flex-none w-11 select-none">
        {/* Collapsed strip — click to expand */}
        <button
          onClick={() => setCollapsed(false)}
          className={`flex flex-col items-center gap-3 py-3 px-2 rounded-xl border ${
            dot === 'bg-[#58a6ff]'    ? 'border-[#58a6ff]/30 hover:border-[#58a6ff]/60' :
            dot === 'bg-amber-400'   ? 'border-amber-400/30 hover:border-amber-400/60' :
                                       'border-emerald-500/30 hover:border-emerald-500/60'
          } bg-[#0d1117]/60 transition-colors h-full`}
          title={`${label} (${loads.length})`}
        >
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
          <span
            className="text-xs font-semibold text-gray-400 flex-1"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {label}
          </span>
          <span className={`text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ${
            dot === 'bg-[#58a6ff]'    ? 'bg-[#58a6ff]/20 text-[#58a6ff]' :
            dot === 'bg-amber-400'   ? 'bg-amber-400/20 text-amber-400' :
                                       'bg-emerald-500/20 text-emerald-400'
          }`}>
            {loads.length}
          </span>
        </button>
        {/* Hidden droppable node so DnD still works */}
        <div ref={setNodeRef} className="hidden" />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-w-[280px]">
      {/* Column header — click chevron to collapse */}
      <div className={`flex items-center gap-2.5 mb-3 pb-2.5 border-b-2 ${accent}`}>
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <span className="text-sm font-semibold text-gray-100">{label}</span>
        <span className="text-xs text-gray-500 bg-[#161b22]/80 rounded-full px-2 py-0.5 ml-auto">{loads.length}</span>
        <button
          onClick={() => setCollapsed(true)}
          className="ml-1 text-[#30363d] hover:text-gray-400 transition-colors"
          title="Colapsar columna"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-3 min-h-[200px] rounded-xl p-2 transition-colors ${isOver ? 'bg-[#161b22]/50 ring-1 ring-[#3ab690]/40' : ''}`}
      >
        <SortableContext items={loads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {loads.map(load => (
            <LoadCard key={load.id} load={load} onClick={onCardClick} onChecklistToggle={onChecklistToggle} />
          ))}
        </SortableContext>
        {loads.length === 0 && (
          <div className="flex items-center justify-center h-20 text-[#30363d] text-xs border border-dashed border-[#21262d] rounded-lg">
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mobile: status section (stacked, no DnD) ──────────────────────────────────
function MobileSection({
  status, label, dot, border, loads, onCardClick, onChecklistToggle,
}: {
  status: TripStatus; label: string; dot: string; border: string
  loads: Load[]
  onCardClick: (load: Load) => void
  onChecklistToggle: (loadId: string, field: string, value: boolean) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className={`rounded-2xl border ${border} bg-[#0d1117]/60 overflow-hidden`}>
      {/* Section header — tap to collapse */}
      <button
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
        onClick={() => setCollapsed(v => !v)}
      >
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-sm font-semibold text-gray-100 flex-1">{label}</span>
        <span className="text-xs text-gray-500 bg-[#161b22] rounded-full px-2 py-0.5">{loads.length}</span>
        <span className={`text-gray-500 text-xs transition-transform ${collapsed ? 'rotate-0' : 'rotate-180'}`}>▲</span>
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-3">
          {loads.length === 0 && (
            <p className="text-center text-[#30363d] text-xs py-4">No loads here</p>
          )}
          {loads.map(load => (
            <LoadCard key={load.id} load={load} onClick={onCardClick} onChecklistToggle={onChecklistToggle} draggable={false} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main board ────────────────────────────────────────────────────────────────
interface Props {
  onCardClick: (load: Load) => void
  refreshKey: number
}

export default function KanbanBoard({ onCardClick, refreshKey }: Props) {
  const [loads, setLoads]       = useState<Load[]>([])
  const [activeLoad, setActiveLoad] = useState<Load | null>(null)
  const [fetching, setFetching] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile on mount + resize
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
      const targetLoad = loads.find(l => l.id === over.id)
      if (!targetLoad) return
      newStatus = targetLoad.trip_status
    }
    const load = loads.find(l => l.id === loadId)
    if (!load || load.trip_status === newStatus) return
    setLoads(prev => prev.map(l => l.id === loadId ? { ...l, trip_status: newStatus } : l))
    const res = await fetch(`/api/loads/${loadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_status: newStatus }),
    })
    if (!res.ok) setLoads(prev => prev.map(l => l.id === loadId ? { ...l, trip_status: load.trip_status } : l))
  }

  async function handleChecklistToggle(loadId: string, field: string, value: boolean) {
    setLoads(prev => prev.map(l => l.id === loadId ? { ...l, [field]: value } : l))
    const res = await fetch(`/api/loads/${loadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    if (res.ok && field === 'settled_ok' && value === true) {
      setTimeout(() => { setLoads(prev => prev.filter(l => l.id !== loadId)) }, 800)
    } else if (!res.ok) {
      setLoads(prev => prev.map(l => l.id === loadId ? { ...l, [field]: !value } : l))
    }
  }

  const byStatus = (status: TripStatus) => loads.filter(l => l.trip_status === status)

  if (fetching) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        <div className="w-5 h-5 rounded-full border-2 border-[#3ab690] border-t-transparent animate-spin mr-2" />
        Loading...
      </div>
    )
  }

  // ── Mobile view: stacked sections, no DnD at all ─────────────────────────
  if (isMobile) {
    return (
      <div className="space-y-3 pb-2">
        {COLUMNS.map(col => (
          <MobileSection
            key={col.status}
            {...col}
            loads={byStatus(col.status)}
            onCardClick={onCardClick}
            onChecklistToggle={handleChecklistToggle}
          />
        ))}
      </div>
    )
  }

  // ── Desktop view: horizontal Kanban with DnD ───────────────────────────────
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
