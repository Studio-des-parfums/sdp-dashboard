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

export interface Message {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  is_read: boolean
  created_at: string
  sender_first_name?: string
  sender_last_name?: string
}

export interface Conversation {
  user_id: number
  first_name: string
  last_name: string
  email: string
  last_message: string
  last_message_at: string
  last_message_sender_id: number
  unread_count: number
}

export interface Contact {
  id: number
  first_name: string
  last_name: string
  email: string
}

export const messagesClient = {
  getConversations: () =>
    request<Conversation[]>('/messages/conversations'),

  getContacts: () =>
    request<Contact[]>('/messages/contacts'),

  getUnreadCount: () =>
    request<{ count: number }>('/messages/unread-count'),

  getHistory: (userId: number) =>
    request<Message[]>(`/messages/${userId}`),

  sendMessage: (receiverId: number, content: string) =>
    request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify({ receiverId, content }),
    }),

  markAsRead: (userId: number) =>
    request<{ success: boolean }>(`/messages/${userId}/read`, { method: 'PUT' }),
}
