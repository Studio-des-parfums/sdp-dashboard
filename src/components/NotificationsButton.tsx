import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { io } from 'socket.io-client'
import { notificationsClient } from '../api/notificationsClient'
import { poluxApi, POLUX_NOTIFICATION_EVENT, POLUX_SOCKET_URL } from '../api/poluxClient'
import { SDP_NOTIFICATION_EVENT } from '../contexts/MessagingContext'
import { useAuth } from '../contexts/AuthContext'

// La cloche fusionne deux sources : les notifications de sdp-dashboard (tickets) et celles de
// Polux (tâches), stockées chacune dans sa base. Un clic sur une notification Polux ouvre la tâche.
interface BellItem {
  key: string
  source: 'sdp' | 'polux'
  id: number
  message: string
  is_read: boolean
  created_at: string
  taskId?: number
}

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

async function loadItems(): Promise<BellItem[]> {
  const [sdp, polux] = await Promise.all([
    notificationsClient.getNotifications().catch(() => []),
    poluxApi.getNotifications().catch(() => []),
  ])
  return [
    ...sdp.map((n): BellItem => ({ key: `sdp-${n.id}`, source: 'sdp', id: n.id, message: n.message, is_read: !!n.is_read, created_at: n.created_at })),
    ...polux.map((n): BellItem => ({ key: `polux-${n.id}`, source: 'polux', id: n.id, message: n.message, is_read: !!n.is_read, created_at: n.created_at, taskId: n.task_id })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function NotificationsButton() {
  const navigate = useNavigate()
  const { sdpUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<BellItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(() => {
    Promise.all([
      notificationsClient.getUnreadCount().then(({ count }) => count).catch(() => 0),
      poluxApi.getUnreadNotificationCount().catch(() => 0),
    ]).then(([sdp, polux]) => setUnreadCount(sdp + polux))
  }, [])

  // Temps réel : chaque notification (Polux via son socket, sdp via MessagingContext) met à jour
  // le compteur, et la liste si elle est ouverte. Le polling reste en filet de sécurité.
  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 60000)
    return () => clearInterval(id)
  }, [refresh])

  useEffect(() => {
    const onNotification = () => {
      refresh()
      setOpen((isOpen) => {
        if (isOpen) loadItems().then(setNotifications)
        return isOpen
      })
    }
    window.addEventListener(SDP_NOTIFICATION_EVENT, onNotification)
    window.addEventListener(POLUX_NOTIFICATION_EVENT, onNotification)
    return () => {
      window.removeEventListener(SDP_NOTIFICATION_EVENT, onNotification)
      window.removeEventListener(POLUX_NOTIFICATION_EVENT, onNotification)
    }
  }, [refresh])

  useEffect(() => {
    if (!POLUX_SOCKET_URL || !sdpUser?.email) return
    const socket = io(POLUX_SOCKET_URL, { auth: { email: sdpUser.email } })
    socket.on('notification', () => window.dispatchEvent(new Event(POLUX_NOTIFICATION_EVENT)))
    return () => { socket.disconnect() }
  }, [sdpUser?.email])

  const handleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) loadItems().then(setNotifications)
  }

  const handleMarkAllRead = async () => {
    await Promise.all([notificationsClient.markAllAsRead().catch(() => {}), poluxApi.markAllNotificationsRead().catch(() => {})])
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const handleClick = (item: BellItem) => {
    if (!item.is_read) {
      const markRead = item.source === 'polux' ? poluxApi.markNotificationRead(item.id) : notificationsClient.markAsRead(item.id)
      markRead.catch(() => {})
      setNotifications((prev) => prev.map((n) => (n.key === item.key ? { ...n, is_read: true } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    if (item.taskId) {
      setOpen(false)
      navigate(`/project/polux?section=accueil&task=${item.taskId}`)
    }
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
          <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full mt-0 sm:mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-sm bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
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
                  <button
                    key={n.key}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={`block w-full text-left px-4 py-2.5 border-b border-gray-200 last:border-b-0 hover:bg-gray-100 ${!n.is_read ? 'bg-indigo-600/5' : ''}`}
                  >
                    <p className="text-xs text-gray-900">{n.message}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {n.source === 'polux' && <span className="font-medium text-indigo-600">Polux · </span>}
                      {relativeTime(n.created_at)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
