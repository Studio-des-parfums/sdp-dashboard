import { useEffect, useState, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { notificationsClient, type AppNotification } from '../api/notificationsClient'

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  return `${days} j`
}

export function NotificationsButton() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(() => {
    notificationsClient.getUnreadCount().then(({ count }) => setUnreadCount(count)).catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 60000)
    return () => clearInterval(id)
  }, [refresh])

  const handleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) {
      notificationsClient.getNotifications().then(setNotifications).catch(() => {})
    }
  }

  const handleMarkAllRead = async () => {
    await notificationsClient.markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className={`relative text-gray-600 hover:text-gray-900 transition-colors ${open ? 'text-indigo-600' : ''}`}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-indigo-600 hover:text-indigo-500">
                  Tout marquer lu
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-8">Aucune notification</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-2.5 border-b border-gray-200 last:border-b-0 ${!n.is_read ? 'bg-indigo-600/5' : ''}`}
                  >
                    <p className="text-xs text-gray-900">{n.message}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{relativeTime(n.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
