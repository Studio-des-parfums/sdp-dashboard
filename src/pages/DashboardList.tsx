import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { DashboardCard } from '../components/DashboardCard'
import { api } from '../api/client'
import type { Project } from '../types'

export function DashboardList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    api
      .getProjects()
      .then(setProjects)
      .catch(() => setError('Impossible de charger les projets'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex h-screen">
      <Sidebar
        mode="projects"
        projects={projects}
        collapsed={collapsed}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="h-14 border-b border-gray-200 flex items-center px-4 md:px-6">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden text-gray-600 hover:text-gray-900 transition-colors p-1 mr-2"
            title="Menu"
            aria-label="Ouvrir le menu"
          >
            <Menu size={18} />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block text-gray-600 hover:text-gray-900 transition-colors text-xs"
          >
            {collapsed ? '→' : '←'}
          </button>
          <h1 className="text-sm font-semibold text-gray-900 ml-2 md:ml-4">Tableau de bord</h1>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-gray-100 rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-48" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Mes projets</h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {projects.length} projet{projects.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((p) => (
                  <DashboardCard key={p.id} project={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
