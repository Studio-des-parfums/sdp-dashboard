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
  /** Appel visio (Daily) annoncé par ce message : URL de la salle privée. */
  call_url?: string | null
  /** Compte rendu IA : URL de l'appel résumé, et contenu structuré. */
  summary_for_call?: string | null
  call_summary?: MeetingSummary | null
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

/** Compte rendu IA d'une réunion (généré par le serveur à partir de la transcription). */
export interface MeetingSummary {
  titre?: string
  resume: string
  /** Discussion par sujet : qui a dit quoi, et pourquoi. */
  sujets?: Array<{ titre: string; points: Array<{ auteur: string | null; texte: string }> }>
  decisions: string[]
}

export type MeetingTaskPriority = 'basse' | 'moyenne' | 'haute' | 'urgente'

/** Tâche détectée par l'IA dans une réunion, à valider (créée dans Polux) ou refuser. */
export interface MeetingTask {
  id: number
  message_id: number
  title: string
  description: string
  assignee_ids: number[]
  /** Équipe suggérée (slug Polux) ; null = sans équipe (« Mon espace »). */
  team_slug: string | null
  /** YYYY-MM-DD */
  deadline: string | null
  priority: MeetingTaskPriority
  status: 'proposee' | 'acceptee' | 'refusee'
  decided_by: number | null
  polux_task_id: number | null
}

export type MeetingTaskPatch = Partial<Pick<MeetingTask, 'title' | 'description' | 'assignee_ids' | 'team_slug' | 'deadline' | 'priority'>>

/** Accès à une salle Daily : URL + jeton nominatif. */
export interface CallAccess {
  url: string
  token: string
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

  /** Lance un appel visio dans la conversation : salle privée + message d'invitation + jeton d'accès. */
  startCall: (target: ConversationTarget) =>
    request<{ message: Message } & CallAccess>('/calls', { method: 'POST', body: JSON.stringify(targetFields(target)) }),

  /** Jeton d'accès à un appel (membres de la conversation uniquement ; erreur si l'appel est terminé). */
  joinCall: (callUrl: string) =>
    request<CallAccess>('/calls/join', { method: 'POST', body: JSON.stringify({ callUrl }) }),

  /** Génère le compte rendu IA d'un appel terminé et le poste dans la conversation. */
  generateCallSummary: (callUrl: string) =>
    request<Message>('/calls/summary', { method: 'POST', body: JSON.stringify({ callUrl }) }),

  getMeetingSummary: (messageId: number) =>
    request<{ summary: MeetingSummary; created_at: string; tasks: MeetingTask[] }>(`/meeting-summaries/${messageId}`),

  updateMeetingTask: (taskId: number, patch: MeetingTaskPatch) =>
    request<MeetingTask>(`/meeting-tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(patch) }),

  /** À appeler une fois la tâche créée dans Polux : la marque acceptée pour tous les participants. */
  acceptMeetingTask: (taskId: number, poluxTaskId: number) =>
    request<MeetingTask>(`/meeting-tasks/${taskId}/accept`, { method: 'POST', body: JSON.stringify({ poluxTaskId }) }),

  rejectMeetingTask: (taskId: number) =>
    request<MeetingTask>(`/meeting-tasks/${taskId}/reject`, { method: 'POST' }),

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
