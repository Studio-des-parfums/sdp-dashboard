import type { PoluxComment, PoluxLead, PoluxLeadInteraction, PoluxTask, PoluxTeam, PoluxUserRef } from '../types/polux'
import {
  mockPoluxComments,
  mockPoluxLeads,
  mockPoluxTasks,
  mockPoluxTeams,
  mockPoluxUsers,
} from '../data/mockPoluxData'

// Notification de mention en commentaire — table task_notifications dédiée côté polux-back
// (séparée de la table `notifications` de sdp-dashboard pour ne pas coupler les deux bases
// en écriture ; voir polux-back/src/migrations/001_init.sql).
export interface PoluxMentionNotification {
  id: number
  task_id: number
  comment_id: number | null
  mentioned_user_id: number
  from_user_id: number
  is_read: boolean
  created_at: string
}

// Backend dédié (polux-back), séparé de sdp-dashboard/server — même pattern que ninnoClient.ts.
// Tant que VITE_POLUX_API_URL n'est pas configuré, ce client sert les données mockées en mémoire.
const API_URL = import.meta.env.VITE_POLUX_API_URL ?? ''
const USE_MOCK = !API_URL

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function currentUserEmail(): string | null {
  try {
    const stored = localStorage.getItem('sdp_user')
    return stored ? JSON.parse(stored).email ?? null : null
  } catch {
    return null
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const email = currentUserEmail()
  const headers = new Headers(options.headers)
  if (email) headers.set('x-user-email', email)
  if (!(options.body instanceof FormData) && options.body) headers.set('Content-Type', 'application/json')

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

let tasks = [...mockPoluxTasks]
let comments = [...mockPoluxComments]
let teams = [...mockPoluxTeams]
let leads = [...mockPoluxLeads]
let mentionNotifications: PoluxMentionNotification[] = []
let nextTaskId = tasks.length + 1
let nextCommentId = comments.length + 1
let nextTeamId = teams.length + 1
let nextNotificationId = 1
let nextLeadId = leads.length + 1
let nextLeadInteractionId = leads.reduce((max, l) => Math.max(max, ...l.interactions.map((i) => i.id)), 0) + 1

export interface TaskPatch {
  title?: string
  description?: string
  project_name?: string | null
  assigned_to_ids?: number[]
  priority?: PoluxTask['priority']
  color?: string | null
  status?: PoluxTask['status']
  start_date?: string | null
  deadline?: string | null
}

export interface TaskInput {
  project_name?: string | null
  team_id: number
  title: string
  description: string
  assigned_to_ids: number[]
  priority: PoluxTask['priority']
  color: string | null
  start_date: string | null
  deadline: string | null
}

export interface LeadInput {
  contact_type: PoluxLead['contact_type']
  last_name: string
  first_name: string
  phone: string
  email: string
  company: string | null
  info: string
  project_name: string
  project_date: string | null
  first_deposit_date: string | null
  second_deposit_date: string | null
  status: PoluxLead['status']
  call_date: string
  next_follow_up_at: string | null
  assigned_to_id: number | null
}

export type LeadPatch = Partial<LeadInput>

export const poluxApi = {
  async getTeams(): Promise<PoluxTeam[]> {
    if (USE_MOCK) return delay([...teams])
    return request('/teams')
  },

  async createTeam(input: { name: string; color: string }): Promise<PoluxTeam> {
    if (USE_MOCK) {
      const slug = input.name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      const creatorEmail = currentUserEmail()
      const creator = mockPoluxUsers.find((u) => u.email === creatorEmail) ?? mockPoluxUsers[0]
      const team: PoluxTeam = { id: nextTeamId++, slug, name: input.name.trim(), color: input.color, member_ids: [creator.id] }
      teams = [...teams, team]
      return delay(team)
    }
    return request('/teams', { method: 'POST', body: JSON.stringify(input) })
  },

  async addTeamMember(teamId: number, userId: number): Promise<void> {
    if (USE_MOCK) {
      const index = teams.findIndex((t) => t.id === teamId)
      if (index === -1) throw new Error('Équipe introuvable')
      if (!teams[index].member_ids.includes(userId)) {
        const updated = { ...teams[index], member_ids: [...teams[index].member_ids, userId] }
        teams = [...teams.slice(0, index), updated, ...teams.slice(index + 1)]
      }
      return delay(undefined)
    }
    return request(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify({ user_id: userId }) })
  },

  async removeTeamMember(teamId: number, userId: number): Promise<void> {
    if (USE_MOCK) {
      const index = teams.findIndex((t) => t.id === teamId)
      if (index === -1) return
      const updated = { ...teams[index], member_ids: teams[index].member_ids.filter((id) => id !== userId) }
      teams = [...teams.slice(0, index), updated, ...teams.slice(index + 1)]
      return delay(undefined)
    }
    return request(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' })
  },

  async deleteTeam(teamId: number): Promise<void> {
    if (USE_MOCK) {
      teams = teams.filter((t) => t.id !== teamId)
      tasks = tasks.filter((t) => t.team_id !== teamId)
      return delay(undefined)
    }
    return request(`/teams/${teamId}`, { method: 'DELETE' })
  },

  async getUsers(): Promise<PoluxUserRef[]> {
    if (USE_MOCK) return delay(mockPoluxUsers)
    return request('/users')
  },

  async getTasks(): Promise<PoluxTask[]> {
    if (USE_MOCK) return delay([...tasks])
    return request('/tasks')
  },

  async createTask(input: TaskInput): Promise<PoluxTask> {
    if (USE_MOCK) {
      const task: PoluxTask = {
        id: nextTaskId++,
        project_name: input.project_name ?? null,
        team_id: input.team_id,
        title: input.title,
        description: input.description,
        assigned_to_ids: input.assigned_to_ids,
        created_by: mockPoluxUsers[0].id,
        priority: input.priority,
        color: input.color,
        status: 'a_faire',
        start_date: input.start_date,
        deadline: input.deadline,
        created_at: new Date().toISOString(),
        reminders: [],
        attachments: [],
        comments: [],
      }
      tasks = [...tasks, task]
      return delay(task)
    }
    return request('/tasks', { method: 'POST', body: JSON.stringify(input) })
  },

  async updateTask(taskId: number, patch: TaskPatch): Promise<PoluxTask> {
    if (USE_MOCK) {
      const index = tasks.findIndex((t) => t.id === taskId)
      if (index === -1) throw new Error('Tâche introuvable')
      const updated = { ...tasks[index], ...patch }
      tasks = [...tasks.slice(0, index), updated, ...tasks.slice(index + 1)]
      return delay(updated)
    }
    return request(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(patch) })
  },

  async deleteTask(taskId: number): Promise<void> {
    if (USE_MOCK) {
      tasks = tasks.filter((t) => t.id !== taskId)
      return delay(undefined)
    }
    return request(`/tasks/${taskId}`, { method: 'DELETE' })
  },

  async addComment(taskId: number, body: string, mentionedUserIds: number[] = []): Promise<PoluxComment> {
    if (USE_MOCK) {
      const authorId = mockPoluxUsers[0].id
      const comment: PoluxComment = {
        id: nextCommentId++,
        task_id: taskId,
        user_id: authorId,
        body,
        mentioned_user_ids: mentionedUserIds,
        created_at: new Date().toISOString(),
      }
      comments = [...comments, comment]
      const index = tasks.findIndex((t) => t.id === taskId)
      if (index !== -1) {
        const updated = { ...tasks[index], comments: [...tasks[index].comments, comment] }
        tasks = [...tasks.slice(0, index), updated, ...tasks.slice(index + 1)]
      }
      mentionedUserIds
        .filter((userId) => userId !== authorId)
        .forEach((userId) => {
          mentionNotifications = [...mentionNotifications, {
            id: nextNotificationId++,
            task_id: taskId,
            comment_id: comment.id,
            mentioned_user_id: userId,
            from_user_id: authorId,
            is_read: false,
            created_at: comment.created_at,
          }]
        })
      return delay(comment)
    }
    return request(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ body, mentioned_user_ids: mentionedUserIds }) })
  },

  async getMentionNotifications(userId: number): Promise<PoluxMentionNotification[]> {
    if (USE_MOCK) return delay(mentionNotifications.filter((n) => n.mentioned_user_id === userId))
    return request('/notifications')
  },

  async uploadAttachments(taskId: number, files: File[]): Promise<PoluxTask> {
    if (USE_MOCK) {
      const index = tasks.findIndex((t) => t.id === taskId)
      if (index === -1) throw new Error('Tâche introuvable')
      const newAttachments = files.map((file, i) => ({
        id: Date.now() + i,
        task_id: taskId,
        filename: file.name,
        url: URL.createObjectURL(file),
        content_type: file.type,
        size: file.size,
        uploaded_by: mockPoluxUsers[0].id,
        created_at: new Date().toISOString(),
      }))
      const updated = { ...tasks[index], attachments: [...tasks[index].attachments, ...newAttachments] }
      tasks = [...tasks.slice(0, index), updated, ...tasks.slice(index + 1)]
      return delay(updated)
    }
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    await request(`/tasks/${taskId}/attachments`, { method: 'POST', body: formData })
    const freshTasks = await poluxApi.getTasks()
    const updated = freshTasks.find((t) => t.id === taskId)
    if (!updated) throw new Error('Tâche introuvable après upload')
    return updated
  },

  async deleteAttachment(attachmentId: number): Promise<void> {
    if (USE_MOCK) {
      tasks = tasks.map((t) => ({ ...t, attachments: t.attachments.filter((a) => a.id !== attachmentId) }))
      return delay(undefined)
    }
    return request(`/attachments/${attachmentId}`, { method: 'DELETE' })
  },

  async getLeads(): Promise<PoluxLead[]> {
    if (USE_MOCK) return delay([...leads])
    return request('/leads')
  },

  async createLead(input: LeadInput): Promise<PoluxLead> {
    if (USE_MOCK) {
      const creatorEmail = currentUserEmail()
      const creator = mockPoluxUsers.find((u) => u.email === creatorEmail) ?? mockPoluxUsers[0]
      const lead: PoluxLead = {
        id: nextLeadId++,
        ...input,
        created_by: creator.id,
        created_at: new Date().toISOString(),
        interactions: [],
      }
      leads = [...leads, lead]
      return delay(lead)
    }
    return request('/leads', { method: 'POST', body: JSON.stringify(input) })
  },

  async updateLead(leadId: number, patch: LeadPatch): Promise<PoluxLead> {
    if (USE_MOCK) {
      const index = leads.findIndex((l) => l.id === leadId)
      if (index === -1) throw new Error('Lead introuvable')
      const updated = { ...leads[index], ...patch }
      leads = [...leads.slice(0, index), updated, ...leads.slice(index + 1)]
      return delay(updated)
    }
    return request(`/leads/${leadId}`, { method: 'PUT', body: JSON.stringify(patch) })
  },

  async deleteLead(leadId: number): Promise<void> {
    if (USE_MOCK) {
      leads = leads.filter((l) => l.id !== leadId)
      return delay(undefined)
    }
    return request(`/leads/${leadId}`, { method: 'DELETE' })
  },

  async addLeadInteraction(leadId: number, body: string): Promise<PoluxLeadInteraction> {
    if (USE_MOCK) {
      const authorEmail = currentUserEmail()
      const author = mockPoluxUsers.find((u) => u.email === authorEmail) ?? mockPoluxUsers[0]
      const interaction: PoluxLeadInteraction = {
        id: nextLeadInteractionId++,
        lead_id: leadId,
        author_id: author.id,
        body,
        created_at: new Date().toISOString(),
      }
      const index = leads.findIndex((l) => l.id === leadId)
      if (index !== -1) {
        const updated = { ...leads[index], interactions: [...leads[index].interactions, interaction] }
        leads = [...leads.slice(0, index), updated, ...leads.slice(index + 1)]
      }
      return delay(interaction)
    }
    return request(`/leads/${leadId}/interactions`, { method: 'POST', body: JSON.stringify({ body }) })
  },
}
