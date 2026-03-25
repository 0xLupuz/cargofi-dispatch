import { UserCheck, Plus } from 'lucide-react'

export default function DriversPage() {
  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-orange-400" />
          <h1 className="text-white font-semibold text-lg">Drivers</h1>
        </div>
        <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Driver
        </button>
      </div>
      <div className="text-gray-500 text-sm">No drivers yet.</div>
    </div>
  )
}
