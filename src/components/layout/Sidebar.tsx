'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Search, Receipt, FileText, Fuel,
  Wrench, Store, List,
  Truck, Box, UserCheck, Users, Building2, Banknote,
  Settings, LogOut, ChevronRight, ScrollText, Globe,
  BarChart2, ChevronDown,
} from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  exact?: boolean
  soon?: boolean
}

type NavSection = {
  header?: string
  collapsible?: boolean   // only sections with headers can collapse
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard',   href: '/loads',             icon: LayoutDashboard, exact: true },
      { label: 'Load Finder', href: '/loads?tab=history', icon: Search,          exact: true },
    ],
  },
  {
    header: 'Accounting',
    collapsible: true,
    items: [
      { label: 'Settlements',    href: '/settlements',  icon: Receipt              },
      { label: 'Invoices',       href: '/invoices',     icon: FileText  },
      { label: 'IFTA',           href: '/ifta',         icon: Fuel      },
    ],
  },
  {
    header: 'Maintenance',
    collapsible: true,
    items: [
      { label: 'Repair Orders',  href: '/repair-orders', icon: Wrench },
      { label: 'Vendors',        href: '/vendors',        icon: Store  },
      { label: 'Item List',      href: '/item-list',      icon: List   },
    ],
  },
  {
    header: 'Fleet Manager',
    collapsible: true,
    items: [
      { label: 'Trucks',           href: '/units',            icon: Truck     },
      { label: 'Trailers',         href: '/trailers',         icon: Box       },
      { label: 'Drivers',          href: '/drivers',          icon: UserCheck },
      { label: 'Owner Operators',  href: '/owner-operators',  icon: Users     },
      { label: 'Customers',        href: '/customers',        icon: Building2 },
      { label: 'Factoring Co.',    href: '/factoring',        icon: Banknote  },
    ],
  },
  {
    header: 'Tools',
    collapsible: true,
    items: [
      { label: 'Carta de Retiro', href: '/tools/carta-retiro', icon: ScrollText  },
      { label: 'Carta B1',        href: '/tools/carta-b1',     icon: Globe       },
      { label: 'Reports',         href: '/tools/reports',      icon: BarChart2, soon: true },
    ],
  },
]

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  if (item.soon) {
    return (
      <div className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm text-gray-600 cursor-default select-none">
        <div className="flex items-center gap-2.5">
          <item.icon className="w-4 h-4 flex-shrink-0" />
          {item.label}
        </div>
        <span className="text-[9px] font-medium text-gray-700 bg-gray-800 rounded px-1.5 py-0.5 uppercase tracking-wide">
          Soon
        </span>
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      className={clsx(
        'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors group',
        active
          ? 'bg-orange-500/10 text-orange-400'
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      )}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      {item.label}
      {active && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
    </Link>
  )
}

export default function Sidebar() {
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const tab         = searchParams.get('tab')

  // Track collapsed state per section header
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  function toggle(header: string) {
    setCollapsed(prev => ({ ...prev, [header]: !prev[header] }))
  }

  function isActive(item: NavItem): boolean {
    if (item.exact) {
      if (item.href.includes('tab=history')) return pathname === '/loads' && tab === 'history'
      if (item.href === '/loads') return pathname === '/loads' && tab !== 'history'
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  // Auto-expand section if a child is active
  function hasActive(section: NavSection): boolean {
    return section.items.some(item => isActive(item))
  }

  return (
    <aside className="flex h-screen w-56 flex-col bg-gray-950 border-r border-gray-800 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-800">
        <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
          <Truck className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight">CargoFi</p>
          <p className="text-gray-600 text-[10px] leading-tight">Dispatch</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {sections.map((section, si) => {
          const isCollapsed = section.collapsible && section.header
            ? (collapsed[section.header] ?? false) && !hasActive(section)
            : false

          return (
            <div key={si}>
              {section.header && (
                <button
                  onClick={() => section.collapsible && toggle(section.header!)}
                  className={clsx(
                    'w-full flex items-center justify-between px-3 mb-1',
                    section.collapsible ? 'cursor-pointer hover:text-gray-400 transition-colors' : 'cursor-default'
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                    {section.header}
                  </p>
                  {section.collapsible && (
                    <ChevronDown
                      className={clsx(
                        'w-3 h-3 text-gray-700 transition-transform duration-200',
                        isCollapsed ? '-rotate-90' : 'rotate-0'
                      )}
                    />
                  )}
                </button>
              )}

              {!isCollapsed && (
                <div className="space-y-0.5">
                  {section.items.map(item => (
                    <NavLink key={item.href} item={item} active={isActive(item)} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-gray-800 space-y-0.5">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </form>
      </div>
    </aside>
  )
}
