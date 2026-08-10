import type { Project } from '../types'

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

export interface AdminProject extends Project {
  notes?: string
}

export interface ProjectNote {
  id: number
  project_id: number
  content: string
  type: 'info' | 'warning' | 'update' | 'maintenance'
  created_at: string
}

export interface AdminUser {
  id: number
  email: string
  pseudo: string
  first_name: string
  last_name: string
  role_id: number
  role_name: string
  is_active: boolean
  last_login: string | null
  created_at: string
}

export interface AdminRole {
  id: number
  name: string
  description: string
  permissions: Array<{ resource: string; action: string }> | null
  created_at: string
}

export interface RolePermissions {
  page_permissions: Array<{ resource: string; action: string }>
  project_permissions: Array<{ project_id: number; permission: string; project_name: string }>
}

export interface UserProject extends Project {
  permission: string | null
}

export const adminClient = {
  // Projects
  updateProject: (id: number, data: Partial<AdminProject>) =>
    request<AdminProject>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getNotes: (projectId: number) =>
    request<ProjectNote[]>(`/projects/${projectId}/notes`),

  addNote: (projectId: number, content: string, type: string = 'info') =>
    request<ProjectNote>(`/projects/${projectId}/notes`, { method: 'POST', body: JSON.stringify({ content, type }) }),

  deleteNote: (projectId: number, noteId: number) =>
    request<void>(`/projects/${projectId}/notes/${noteId}`, { method: 'DELETE' }),

  // Users
  getUsers: () =>
    request<AdminUser[]>('/users'),

  createUser: (data: { email: string; first_name: string; last_name: string; role_id: number }) =>
    request<AdminUser>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (id: number, data: Partial<AdminUser>) =>
    request<AdminUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  resetPassword: (email: string) =>
    request<{ success: boolean }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email }) }),

  deleteUser: (id: number) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),

  getUserProjects: (userId: number) =>
    request<UserProject[]>(`/users/${userId}/projects`),

  updateUserProjects: (userId: number, projects: Array<{ project_id: number; permission: string }>) =>
    request<UserProject[]>(`/users/${userId}/projects`, { method: 'PUT', body: JSON.stringify({ projects }) }),

  // Roles
  getRoles: () =>
    request<AdminRole[]>('/roles'),

  createRole: (data: { name: string; description: string }) =>
    request<AdminRole>('/roles', { method: 'POST', body: JSON.stringify(data) }),

  updateRole: (id: number, data: Partial<AdminRole>) =>
    request<void>(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteRole: (id: number) =>
    request<void>(`/roles/${id}`, { method: 'DELETE' }),

  getRolePermissions: (roleId: number) =>
    request<RolePermissions>(`/roles/${roleId}/permissions`),

  updateRolePermissions: (roleId: number, data: { page_permissions: Array<{ resource: string; action: string }>; project_permissions: Array<{ project_id: number; permission: string }> }) =>
    request<void>(`/roles/${roleId}/permissions`, { method: 'PUT', body: JSON.stringify(data) }),
}
