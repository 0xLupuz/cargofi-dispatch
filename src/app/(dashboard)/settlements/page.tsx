import { DollarSign } from 'lucide-react'

export default function SettlementsPage() {
  return (
    <div className="px-6 py-6">
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="w-5 h-5 text-orange-400" />
        <h1 className="text-white font-semibold text-lg">Settlements</h1>
      </div>
      <div className="text-gray-500 text-sm">No settlements yet.</div>
    </div>
  )
}
