import { redirect } from 'next/navigation'
import { CalendarClock, ClipboardList, Route, Truck } from 'lucide-react'
import { getDriverAuthContext } from '@/lib/auth/server'
import { isCompanyAssignedDriver } from '@/lib/auth/ownership'

function formatAssignmentType(companyAssigned: boolean) {
  return companyAssigned ? 'CargoFi company unit' : 'Owner operator'
}

export default async function CurrentTripPage() {
  const auth = await getDriverAuthContext()

  if (!auth) {
    redirect('/login')
  }

  const assignment = auth.ownership.currentDriverAssignment
  const companyAssigned = isCompanyAssignedDriver(auth.ownership)

  if (!assignment) {
    return (
      <section className="flex min-h-[calc(100dvh-12rem)] flex-col justify-center rounded-lg border border-[#21262d] bg-[#0d1117] px-5 py-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/10 text-amber-300">
          <Truck className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold text-white">No active assignment</h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          Your driver account is active, but dispatch has not assigned you to an owner operator or
          company unit yet.
        </p>
        <p className="mt-5 rounded-md border border-[#30363d] bg-[#161b22] px-3 py-3 text-sm text-gray-300">
          Contact dispatch before starting a trip.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-[#21262d] bg-[#0d1117] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#3ab690]">Current trip</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Ready for dispatch</h2>
          </div>
          <div className="rounded-full bg-[#3ab690]/10 p-2 text-[#3ab690]">
            <Route className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-gray-400">
          Trip workflow actions will appear here when the driver workflow is connected to active
          loads.
        </p>
      </div>

      <div className="grid gap-3">
        <div className="rounded-lg border border-[#21262d] bg-[#0d1117] p-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-[#3ab690]" />
            <div>
              <p className="text-sm font-medium text-white">Assignment type</p>
              <p className="text-sm text-gray-400">{formatAssignmentType(companyAssigned)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#21262d] bg-[#0d1117] p-4">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-[#3ab690]" />
            <div>
              <p className="text-sm font-medium text-white">Assignment status</p>
              <p className="text-sm text-gray-400">Active and verified for driver access</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
