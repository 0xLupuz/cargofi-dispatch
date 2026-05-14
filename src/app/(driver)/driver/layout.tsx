import { redirect } from 'next/navigation'
import { isAdminProfile } from '@/lib/auth/profile'
import { getDriverAuthContext, getServerAuthContext } from '@/lib/auth/server'
import DriverMobileNav from '@/components/driver/DriverMobileNav'

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await getServerAuthContext()

  if (!auth) {
    redirect('/login')
  }

  if (auth.strategy === 'legacy') {
    redirect('/login')
  }

  if (isAdminProfile(auth.profile)) {
    redirect('/dashboard')
  }

  const driverAuth = await getDriverAuthContext(auth)

  if (!driverAuth) {
    redirect('/login')
  }

  const displayName = driverAuth.profile.display_name ?? 'Driver'
  const hasAssignment = Boolean(driverAuth.ownership.currentDriverAssignment)

  return (
    <div className="min-h-dvh bg-[#080c12] text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
        <header className="sticky top-0 z-20 border-b border-[#21262d] bg-[#080c12]/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-[#3ab690]">CargoFi Driver</p>
              <h1 className="truncate text-lg font-semibold text-white">{displayName}</h1>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="rounded-md border border-[#30363d] px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-[#3ab690]/60 hover:text-white"
              >
                Logout
              </button>
            </form>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            <span
              className={`h-2 w-2 rounded-full ${hasAssignment ? 'bg-[#3ab690]' : 'bg-amber-400'}`}
              aria-hidden="true"
            />
            <span>{hasAssignment ? 'Active assignment' : 'No active assignment'}</span>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
        <DriverMobileNav />
      </div>
    </div>
  )
}
