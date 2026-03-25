import { Truck, Plus } from 'lucide-react'

export default function OwnerOperatorsPage() {
  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-orange-400" />
          <h1 className="text-white font-semibold text-lg">Owner Operators</h1>
        </div>
        <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add OO
        </button>
      </div>
      <div className="text-gray-500 text-sm">No owner operators yet.</div>
    </div>
  )
}
