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

export type TicketCategory = 'bug' | 'question' | 'feature' | 'other'
export type TicketPriority = 'Basse' | 'Moyenne' | 'Haute'
export type TicketStatus = 'Ouvert' | 'En cours' | 'Résolu' | 'Fermé'

export interface Ticket {
  id: number
  ticket_number: string
  user_id: number
  project_id: number | null
  category: TicketCategory
  priority: TicketPriority
  subject: string
  description: string
  contact_email: string | null
  status: TicketStatus
  created_at: string
  updated_at: string
  user_first_name: string
  user_last_name: string
  user_email: string
  project_name: string | null
}

export const ticketsClient = {
  getTickets: () =>
    request<Ticket[]>('/tickets'),

  getTicket: (id: number) =>
    request<Ticket>(`/tickets/${id}`),

  createTicket: (data: { project: string; category: TicketCategory; priority: TicketPriority; subject: string; description: string }) =>
    request<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(data) }),

  updateStatus: (id: number, status: TicketStatus) =>
    request<Ticket>(`/tickets/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  getOpenCount: () =>
    request<{ count: number }>('/tickets/open-count'),
}
