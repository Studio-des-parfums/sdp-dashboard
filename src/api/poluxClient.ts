import type { PoluxComment, PoluxProject, PoluxTask, PoluxTeam, PoluxUserRef } from '../types/polux'
import {
  mockPoluxComments,
  mockPoluxProjects,
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
let mentionNotifications: PoluxMentionNotification[] = []
let nextTaskId = tasks.length + 1
let nextCommentId = comments.length + 1
let nextTeamId = teams.length + 1
let nextNotificationId = 1

export interface TaskPatch {
  title?: string
  description?: string
  assigned_to?: number | null
  priority?: PoluxTask['priority']
  status?: PoluxTask['status']
  deadline?: string | null
}

export interface TaskInput {
  project_id: number
  team_id: number
  title: string
  description: string
  assigned_to: number | null
  priority: PoluxTask['priority']
  deadline: string | null
}

export const poluxApi = {
  async getTeams(): Promise<PoluxTeam[]> {
    if (USE_MOCK) return delay([...teams])
    return request('/teams')
  },

  async createTeam(input: { name: string; color: string }): Promise<PoluxTeam> {
    if (USE_MOCK) {
      const slug = input.name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      const team: PoluxTeam = { id: nextTeamId++, slug, name: input.name.trim(), color: input.color, member_ids: [] }
      teams = [...teams, team]
      return delay(team)
    }
    return request('/teams', { method: 'POST', body: JSON.stringify(input) })
  },

  async getUsers(): Promise<PoluxUserRef[]> {
    if (USE_MOCK) return delay(mockPoluxUsers)
    return request('/users')
  },

  async getProjects(): Promise<PoluxProject[]> {
    if (USE_MOCK) return delay(mockPoluxProjects)
    return request('/projects')
  },

  async getTasks(): Promise<PoluxTask[]> {
    if (USE_MOCK) return delay([...tasks])
    return request('/tasks')
  },

  async createTask(input: TaskInput): Promise<PoluxTask> {
    if (USE_MOCK) {
      const task: PoluxTask = {
        id: nextTaskId++,
        project_id: input.project_id,
        team_id: input.team_id,
        title: input.title,
        description: input.description,
        assigned_to: input.assigned_to,
        created_by: mockPoluxUsers[0].id,
        priority: input.priority,
        status: 'a_faire',
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

  async notifyTeam(taskId: number, teamMemberIds: number[], commentId: number): Promise<void> {
    if (USE_MOCK) {
      const authorId = mockPoluxUsers[0].id
      teamMemberIds
        .filter((userId) => userId !== authorId)
        .forEach((userId) => {
          mentionNotifications = [...mentionNotifications, {
            id: nextNotificationId++,
            task_id: taskId,
            comment_id: commentId,
            mentioned_user_id: userId,
            from_user_id: authorId,
            is_read: false,
            created_at: new Date().toISOString(),
          }]
        })
      return delay(undefined)
    }
    return request(`/tasks/${taskId}/notify-team`, { method: 'POST', body: JSON.stringify({ team_member_ids: teamMemberIds, comment_id: commentId }) })
  },

  async getMentionNotifications(userId: number): Promise<PoluxMentionNotification[]> {
    if (USE_MOCK) return delay(mentionNotifications.filter((n) => n.mentioned_user_id === userId))
    return request('/notifications')
  },

  async uploadAttachment(taskId: number, file: File): Promise<PoluxTask> {
    if (USE_MOCK) {
      const index = tasks.findIndex((t) => t.id === taskId)
      if (index === -1) throw new Error('Tâche introuvable')
      const attachment = {
        id: Date.now(),
        task_id: taskId,
        filename: file.name,
        url: URL.createObjectURL(file),
        content_type: file.type,
        size: file.size,
        uploaded_by: mockPoluxUsers[0].id,
        created_at: new Date().toISOString(),
      }
      const updated = { ...tasks[index], attachments: [...tasks[index].attachments, attachment] }
      tasks = [...tasks.slice(0, index), updated, ...tasks.slice(index + 1)]
      return delay(updated)
    }
    const formData = new FormData()
    formData.append('file', file)
    await request(`/tasks/${taskId}/attachments`, { method: 'POST', body: formData })
    const freshTasks = await poluxApi.getTasks()
    const updated = freshTasks.find((t) => t.id === taskId)
    if (!updated) throw new Error('Tâche introuvable après upload')
    return updated
  },
}
