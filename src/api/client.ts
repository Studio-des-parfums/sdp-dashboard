import type { Dashboard, Project } from '../types'
import { mockProjects, mockDashboards } from '../data/mockData'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function currentUserEmail(): string | null {
  try {
    const stored = localStorage.getItem('sdp_user')
    return stored ? JSON.parse(stored).email ?? null : null
  } catch {
    return null
  }
}

const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

export const api = {
  async getProjects(): Promise<Project[]> {
    // Mode dev : utilisateur simulé (dev@sdp.local), absent de la base — inutile d'interroger le backend.
    if (IS_DEV_MODE) {
      await delay(300)
      return mockProjects.map((p) => ({ ...p, user_permission: 'admin' as const }))
    }

    const email = currentUserEmail()
    try {
      const res = await fetch(`${API_URL}/projects`, {
        headers: email ? { 'x-user-email': email } : {},
      })
      if (!res.ok) throw new Error('Failed to fetch projects')
      const rows: Project[] = await res.json()

      // Les projets renvoyés par le backend sont déjà filtrés selon les permissions
      // de l'utilisateur (view/edit/admin). On les enrichit avec les métadonnées
      // d'affichage (couleur, description) définies côté front pour chaque slug connu.
      return rows.map((row) => {
        const mock = mockProjects.find((p) => p.slug === row.slug)
        return mock
          ? { ...mock, id: row.id, status: row.status, user_permission: row.user_permission }
          : { ...row, user_permission: row.user_permission }
      })
    } catch {
      // Backend indisponible (ex: dev sans serveur local) : on retombe sur les mocks, non filtrés.
      await delay(300)
      return mockProjects
    }
  },

  async getDashboard(slug: string): Promise<Dashboard> {
    await delay(400)
    const normalized = slug === 'marketplace' ? 'aglae' : slug === 'analytics' ? 'lylo' : slug
    const dashboard = mockDashboards[normalized]
    if (!dashboard) throw new Error('Dashboard not found')
    return dashboard
  },
}
