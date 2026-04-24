'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, X, CheckCheck, AlertTriangle, AlertCircle, Info, ExternalLink } from 'lucide-react'

const SEV_STYLE: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  error:   { icon: AlertCircle,   color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  info:    { icon: Info,          color: 'text-[#58a6ff]',   bg: 'bg-[#58a6ff]/10',   border: 'border-[#58a6ff]/20'   },
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  return 'Just now'
}

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen]               = useState(false)
  const [notifs, setNotifs]           = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  async function load() {
    const r = await fetch('/api/notifications')
    if (r.ok) {
      const data = await r.json()
      setNotifs(data)
      setUnreadCount(data.filter((n: any) => !n.read).length)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000) // refresh every 60s
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function dismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    const updated = notifs.filter(n => n.id !== id)
    setNotifs(updated)
    setUnreadCount(updated.filter(n => !n.read).length)
  }

  async function clickNotif(n: any) {
    if (!n.read) {
      await fetch(`/api/notifications/${n.id}`, { method: 'PATCH' })
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      setUnreadCount(c => Math.max(0, c - 1))
    }
    if (n.link) { router.push(n.link); setOpen(false) }
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#161b22] transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0d1117] border border-[#30363d] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#3ab690]" />
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#484f58]">
                <Bell className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">No notifications</p>
                <p className="text-xs mt-1">All clear ✓</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/60">
                {notifs.map(n => {
                  const sev = SEV_STYLE[n.severity] ?? SEV_STYLE.info
                  const Icon = sev.icon
                  return (
                    <div
                      key={n.id}
                      onClick={() => clickNotif(n)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[#161b22]/50 ${!n.read ? 'bg-[#161b22]/30' : ''}`}
                    >
                      <div className={`w-7 h-7 rounded-lg ${sev.bg} border ${sev.border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`w-3.5 h-3.5 ${sev.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs font-semibold leading-snug ${!n.read ? 'text-white' : 'text-gray-400'}`}>{n.title}</p>
                          <button onClick={e => dismiss(n.id, e)} className="text-[#484f58] hover:text-gray-400 flex-shrink-0 mt-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        {n.body && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-[#484f58]">{timeAgo(n.created_at)}</span>
                          {n.link && <ExternalLink className="w-2.5 h-2.5 text-[#484f58]" />}
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#3ab690] ml-auto" />}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-3 border-t border-[#21262d] text-center">
              <button onClick={() => { setOpen(false); load() }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
