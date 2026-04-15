'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, DollarSign, Wrench, Truck, MoreHorizontal,
  X, Receipt, FileText, Fuel, Store, List, Box,
  UserCheck, Users, Building2, Banknote, Search, ScrollText, Globe, BarChart2, Settings, LayoutGrid,
} from 'lucide-react'
import { clsx } from 'clsx'

const BOTTOM_TABS = [
  { label: 'Dashboard',   href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Board',       href: '/loads',        icon: LayoutGrid      },
  { label: 'Settlements', href: '/settlements',  icon: DollarSign      },
  { label: 'Fleet',       href: '/units',        icon: Truck           },
  { label: 'More',        href: '__more__',      icon: MoreHorizontal  },
]

const MORE_SECTIONS = [
  {
    header: 'Accounting',
    items: [
      { label: 'Invoices',        href: '/invoices',          icon: FileText   },
      { label: 'IFTA',            href: '/ifta',              icon: Fuel       },
      { label: 'Load Finder',     href: '/loads?tab=history', icon: Search     },
    ],
  },
  {
    header: 'Fleet',
    items: [
      { label: 'Trailers',        href: '/trailers',          icon: Box        },
      { label: 'Drivers',         href: '/drivers',           icon: UserCheck  },
      { label: 'Owner Operators', href: '/owner-operators',   icon: Users      },
      { label: 'Customers',       href: '/customers',         icon: Building2  },
      { label: 'Factoring Co.',   href: '/factoring',         icon: Banknote   },
    ],
  },
  {
    header: 'Maintenance',
    items: [
      { label: 'Repair Orders',   href: '/repair-orders',     icon: Wrench     },
      { label: 'Vendors',         href: '/vendors',           icon: Store      },
      { label: 'Item List',       href: '/item-list',         icon: List       },
    ],
  },
  {
    header: 'Tools & Reports',
    items: [
      { label: 'Reports',         href: '/tools/reports',      icon: BarChart2  },
      { label: 'Carta de Retiro', href: '/tools/carta-retiro', icon: ScrollText },
      { label: 'Carta B1',        href: '/tools/carta-b1',     icon: Globe      },
      { label: 'Settings',        href: '/settings',           icon: Settings   },
    ],
  },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  function isActive(href: string) {
    if (href === '/loads') return pathname === '/loads'
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href.split('?')[0])
  }

  return (
    <>
      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-gray-950 border-t border-gray-800 flex md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {BOTTOM_TABS.map(tab => {
          const isMore = tab.href === '__more__'
          const active = isMore ? moreOpen : isActive(tab.href)
          const Icon = tab.icon

          if (isMore) {
            return (
              <button
                key="more"
                onClick={() => setMoreOpen(v => !v)}
                className={clsx(
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
                  active ? 'text-orange-400' : 'text-gray-500'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => setMoreOpen(false)}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
                active ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-[56px] inset-x-0 z-40 bg-gray-900 border-t border-gray-800 rounded-t-2xl md:hidden max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <span className="text-white font-semibold text-sm">More</span>
              <button onClick={() => setMoreOpen(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-4 py-3 space-y-5 pb-8">
              {MORE_SECTIONS.map(section => (
                <div key={section.header}>
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-2 mb-2">
                    {section.header}
                  </p>
                  <div className="space-y-0.5">
                    {section.items.map(item => {
                      const Icon = item.icon
                      const active = isActive(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className={clsx(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                            active ? 'bg-orange-500/10 text-orange-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
