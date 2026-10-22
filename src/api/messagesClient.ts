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

// multipart : pas de Content-Type JSON, le navigateur pose la boundary lui-même.
async function postForm<T>(url: string, form: FormData): Promise<T> {
  const email = currentUserEmail()
  const res = await fetch(`${API}${url}`, {
    method: 'POST',
    headers: email ? { 'x-user-email': email } : {},
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur réseau' }))
    throw new Error(err.error)
  }
  return res.json()
}

/** Destinataire d'une conversation : un collègue ou un groupe. */
export type ConversationTarget = { kind: 'user'; id: number } | { kind: 'group'; id: number }

function targetFields(target: ConversationTarget): Record<string, number> {
  return target.kind === 'group' ? { groupId: target.id } : { receiverId: target.id }
}

export interface Message {
  id: number
  sender_id: number
  /** Null pour un message de groupe. */
  receiver_id: number | null
  group_id?: number | null
  content: string
  /** Message vocal : URL d'écoute (pré-signée, valable 1h) et durée en secondes. */
  audio_url?: string | null
  audio_duration?: number | null
  /** Pièce jointe (image ou PDF) : URL d'aperçu et de téléchargement pré-signées (1h). */
  attachment?: { name: string; type: string; url: string; download_url: string } | null
  attachment_size?: number | null
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

export interface GroupMember {
  id: number
  first_name: string
  last_name: string
}

export interface MessageGroup {
  id: number
  name: string
  /** Propriétaire (lead) : seul à pouvoir ajouter des participants, transférer ou supprimer le groupe. */
  owner_id: number
  created_at: string
  members: GroupMember[]
  last_message: string | null
  last_message_at: string | null
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

  getHistory: (target: ConversationTarget) =>
    request<Message[]>(target.kind === 'group' ? `/message-groups/${target.id}/messages` : `/messages/${target.id}`),

  sendMessage: (target: ConversationTarget, content: string) =>
    request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify({ ...targetFields(target), content }),
    }),

  sendVoiceMessage: (target: ConversationTarget, audio: Blob, durationSeconds: number): Promise<Message> => {
    const form = new FormData()
    for (const [key, value] of Object.entries(targetFields(target))) form.append(key, String(value))
    form.append('duration', String(Math.round(durationSeconds)))
    form.append('audio', audio, `vocal.${audio.type.includes('mp4') ? 'm4a' : 'webm'}`)
    return postForm('/messages/voice', form)
  },

  sendAttachment: (target: ConversationTarget, file: File, caption: string): Promise<Message> => {
    const form = new FormData()
    for (const [key, value] of Object.entries(targetFields(target))) form.append(key, String(value))
    form.append('caption', caption)
    form.append('file', file, file.name)
    return postForm('/messages/attachment', form)
  },

  deleteMessage: (messageId: number) =>
    request<{ success: boolean }>(`/messages/${messageId}`, { method: 'DELETE' }),

  markAsRead: (target: ConversationTarget) =>
    request<{ success: boolean }>(target.kind === 'group' ? `/message-groups/${target.id}/read` : `/messages/${target.id}/read`, { method: 'PUT' }),

  getGroups: () =>
    request<MessageGroup[]>('/message-groups'),

  createGroup: (name: string, memberIds: number[]) =>
    request<{ id: number }>('/message-groups', { method: 'POST', body: JSON.stringify({ name, memberIds }) }),

  addGroupMembers: (groupId: number, userIds: number[]) =>
    request<{ success: boolean }>(`/message-groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ userIds }) }),

  transferGroupOwnership: (groupId: number, userId: number) =>
    request<{ success: boolean }>(`/message-groups/${groupId}/owner`, { method: 'PUT', body: JSON.stringify({ userId }) }),

  deleteGroup: (groupId: number) =>
    request<{ success: boolean }>(`/message-groups/${groupId}`, { method: 'DELETE' }),
}
