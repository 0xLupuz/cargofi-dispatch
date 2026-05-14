'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, FileText, LifeBuoy, Route } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { label: 'Trip', href: '/driver/current-trip', icon: Route, enabled: true },
  { label: 'Docs', href: '#', icon: FileText, enabled: false },
  { label: 'Incident', href: '#', icon: LifeBuoy, enabled: false },
  { label: 'Tasks', href: '#', icon: ClipboardList, enabled: false },
]

export default function DriverMobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-2xl border-t border-[#21262d] bg-[#080c12]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Driver navigation"
    >
      {navItems.map(item => {
        const Icon = item.icon
        const active = pathname === item.href
        const className = clsx(
          'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
          active ? 'text-[#3ab690]' : 'text-gray-500',
          item.enabled && !active ? 'hover:text-gray-300' : '',
          !item.enabled ? 'cursor-not-allowed opacity-50' : '',
        )

        if (!item.enabled) {
          return (
            <button key={item.label} type="button" className={className} disabled aria-disabled="true">
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          )
        }

        return (
          <Link key={item.href} href={item.href} className={className}>
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
