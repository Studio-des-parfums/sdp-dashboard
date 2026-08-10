const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function currentUserEmail(): string | null {
  try {
    const stored = localStorage.getItem('sdp_user')
    return stored ? JSON.parse(stored).email ?? null : null
  } catch {
    return null
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const email = currentUserEmail()
  const res = await fetch(`${API}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(email ? { 'x-user-email': email } : {}),
    },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur réseau' }))
    throw new Error(err.error)
  }
  return res.json()
}

export interface AppNotification {
  id: number
  user_id: number
  ticket_id: number | null
  ticket_number: string | null
  type: 'ticket_status_change'
  message: string
  is_read: boolean
  created_at: string
}

export const notificationsClient = {
  getNotifications: () =>
    request<AppNotification[]>('/notifications'),

  getUnreadCount: () =>
    request<{ count: number }>('/notifications/unread-count'),

  markAsRead: (id: number) =>
    request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PUT' }),

  markAllAsRead: () =>
    request<{ success: boolean }>('/notifications/read-all', { method: 'PUT' }),
}
