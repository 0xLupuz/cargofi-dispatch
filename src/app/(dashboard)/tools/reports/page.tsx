'use client'

import { BarChart2, TrendingUp, Truck, DollarSign, Fuel, FileText, Users, Clock } from 'lucide-react'

const PLANNED_REPORTS = [
  {
    category: 'Accounting',
    icon: DollarSign,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    reports: [
      { name: 'P&L por Período',        desc: 'Revenue, gastos y net margin por semana / mes / trimestre' },
      { name: 'Aging Accounts Receivable', desc: 'Invoices sin pagar por broker, agrupadas 0-30 / 31-60 / 61-90 / +90 días' },
      { name: 'Settlements Summary',    desc: 'Total pagado a OOs por período, desglose por deducciones' },
      { name: 'Revenue por Lane',       desc: 'Revenue/milla por ruta — qué lanes son más rentables' },
    ],
  },
  {
    category: 'Fleet',
    icon: Truck,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    reports: [
      { name: 'Utilización por Unidad', desc: 'Miles, días activo, días en mantenimiento, revenue por unidad' },
      { name: 'Performance por OO',     desc: 'Loads, miles, gross y net por Owner Operator' },
      { name: 'Disponibilidad de Flota',desc: 'Snapshot del status actual: disponible / en viaje / mantenimiento' },
    ],
  },
  {
    category: 'Drivers',
    icon: Users,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    reports: [
      { name: 'Driver Pay Summary',     desc: 'Pago total por driver, desglose de miles y bonos por período' },
      { name: 'Compliance Tracker',     desc: 'CDLs y DOT Medical próximos a vencer' },
      { name: 'HOS / Miles por Driver', desc: 'Miles recorridos por conductor por semana / mes' },
    ],
  },
  {
    category: 'Fuel',
    icon: Fuel,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    reports: [
      { name: 'IFTA Quarterly',         desc: 'Miles por estado y compras de combustible por estado — reporte trimestral' },
      { name: 'MPG por Unidad',         desc: 'Eficiencia de combustible por camión' },
      { name: 'Fuel Cost Analysis',     desc: 'Costo de combustible como % de revenue por load / período' },
    ],
  },
  {
    category: 'Operations',
    icon: TrendingUp,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    reports: [
      { name: 'On-Time Delivery Rate',  desc: 'Loads entregados a tiempo vs tarde' },
      { name: 'Customer Load History',  desc: 'Historial de loads por cliente / broker con revenue asociado' },
      { name: 'Maintenance Cost Report',desc: 'Repair orders por unidad, costo total, frecuencia' },
    ],
  },
]

export default function ReportsPage() {
  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Reports</h1>
          <p className="text-xs text-gray-500">Próximamente — módulo en construcción</p>
        </div>
        <span className="ml-auto text-[10px] font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-1 uppercase tracking-wide">
          Coming Soon
        </span>
      </div>

      {/* Banner */}
      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 px-5 py-4 mb-8 mt-4">
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-300 mb-1">Módulo en desarrollo</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Los reportes se generarán automáticamente con los datos que ya estás capturando — loads, settlements, fuel, maintenance. Abajo está el roadmap completo de lo que estará disponible.
            </p>
          </div>
        </div>
      </div>

      {/* Planned reports grid */}
      <div className="space-y-6">
        {PLANNED_REPORTS.map(cat => (
          <div key={cat.category}>
            {/* Category header */}
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-6 h-6 rounded-md ${cat.bg} border ${cat.border} flex items-center justify-center`}>
                <cat.icon className={`w-3.5 h-3.5 ${cat.color}`} />
              </div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{cat.category}</h2>
            </div>

            {/* Report cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cat.reports.map(r => (
                <div
                  key={r.name}
                  className={`rounded-lg border ${cat.border} bg-gray-900/60 px-4 py-3 flex items-start gap-3 opacity-60`}
                >
                  <FileText className={`w-4 h-4 ${cat.color} mt-0.5 flex-shrink-0`} />
                  <div>
                    <p className="text-sm font-medium text-gray-300">{r.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-700 mt-8 text-center">
        ¿Falta algún reporte crítico? Menciónalo y lo agregamos al roadmap.
      </p>
    </div>
  )
}
