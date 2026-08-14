import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Activity, ChevronDown, LogOut } from 'lucide-react'
import { api } from '../api/client'
import { Sidebar } from '../components/Sidebar'
import AdminPage from './AdminPage'
import { useAuth } from '../contexts/AuthContext'
import { NotificationsButton } from '../components/NotificationsButton'
import { MessagingButton } from '../components/messaging/MessagingButton'


import { MetricCard } from '../components/MetricCard'
import { Chart } from '../components/Chart'
import { WelcomeHeader } from '../components/WelcomeHeader'
import { SettingsModal } from '../components/SettingsModal'
import MarketplaceRenderer from '../components/aglae/MarketplaceRenderer'
import NinnoRenderer from '../components/ninno/NinnoRenderer'
import LyloRenderer from '../components/lylo/LyloRenderer'
import NonoRenderer from '../components/nono/NonoRenderer'
import HomePage from '../components/home/HomePage'
import { mockUser, mockNotifications } from '../data/mockData'
import { ticketsClient } from '../api/ticketsClient'
import type { Dashboard, Project } from '../types'

const isUserMode = import.meta.env.VITE_USER_MODE === 'user'

const MARKETPLACE_OCR_SECTIONS = new Set(['extraction', 'clients', 'groups', 'analysis', 'orders', 'devices', 'customer-reviews'])
const NINNO_ADMIN_SECTIONS = new Set(['appearance', 'notes'])
const LYLO_SECTIONS = new Set(['accueil', 'clients', 'equipe', 'formules', 'questionnaire', 'imprimantes', 'analyses'])

export function DashboardView() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { logout, user, sdpUser } = useAuth()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [openTicketsCount, setOpenTicketsCount] = useState(0)

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [selectedFormulaId, setSelectedFormulaId] = useState<number | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

  const [selectOpen, setSelectOpen] = useState(false)

  // Rétrocompatibilité avec d'anciens liens utilisant les slugs pré-renommage (marketplace/analytics).
  const normalizedSlug = slug === 'marketplace' ? 'aglae' : slug === 'analytics' ? 'lylo' : slug
  const isHome = normalizedSlug === 'sdp-core'

  const [projectsLoaded, setProjectsLoaded] = useState(false)

  useEffect(() => {
    api.getProjects().then(setProjects).catch(() => {}).finally(() => setProjectsLoaded(true))
  }, [])

  useEffect(() => {
    if (sdpUser?.role_name !== 'admin') return
    const loadCount = () => ticketsClient.getOpenCount().then(({ count }) => setOpenTicketsCount(count)).catch(() => {})
    loadCount()
    const id = setInterval(loadCount, 60000)
    return () => clearInterval(id)
  }, [sdpUser?.role_name])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setSelectedCustomerId(null)
    setSelectedFormulaId(null)
    setSelectedGroupIds([])
    setSelectedOrderId(null)
    api.getDashboard(slug)
      .then((d) => {
        setDashboard(d)
        setActiveSection(isHome ? 'overview' : d.sections[0]?.id || 'overview')
      })
      .catch(() => setError('Impossible de charger le dashboard'))
      .finally(() => setLoading(false))
  }, [slug, isHome])

  // Une fois la liste des projets autorisés chargée, on vérifie que le projet demandé
  // (autre que l'accueil, toujours accessible) en fait bien partie.
  const isAuthorized = isHome || !projectsLoaded || projects.some((p) => p.slug === normalizedSlug)

  const switchProject = useCallback((s: string) => {
    navigate(`/project/${s}`)
    setSelectOpen(false)
  }, [navigate])

  const currentProject = projects.find((p) => p.slug === normalizedSlug)
  const isMarketplace = normalizedSlug === 'aglae'
  const isNinno = normalizedSlug === 'mobile-app'
  const isLylo = normalizedSlug === 'lylo'
  const isNono = normalizedSlug === 'nono'
  const isAdmin = normalizedSlug === 'admin-portal'
  const isOcrSection = isMarketplace && MARKETPLACE_OCR_SECTIONS.has(activeSection)
  const isNinnoAdminSection = isNinno && NINNO_ADMIN_SECTIONS.has(activeSection)
  const isLyloSections = isLylo && LYLO_SECTIONS.has(activeSection)

  const activeSectionData = dashboard?.sections.find((s) => s.id === activeSection)
  const filteredMetrics = dashboard?.metrics.filter((m) =>
    activeSectionData?.metricIds.includes(m.id)
  ) ?? []
  const filteredCharts = dashboard?.charts.filter((c) =>
    activeSectionData?.chartIds.includes(c.id)
  ) ?? []

  return (
    <div className="flex h-screen">
      <Sidebar
        mode="sections"
        sections={dashboard?.sections ?? []}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={collapsed}
        userMode={isUserMode}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={() => { logout(); navigate('/login') }}
        badges={isAdmin && openTicketsCount > 0 ? { tickets: openTicketsCount } : undefined}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="h-14 border-b border-gray-200 flex items-center px-6 gap-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-600 hover:text-gray-900 transition-colors text-xs"
          >
            {collapsed ? '→' : '←'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1 text-xs"
          >
            <ArrowLeft size={14} />
            Retour
          </button>

          <div className="h-6 w-px bg-gray-200" />

          <span className="text-sm font-semibold text-gray-900">Tableau de bord</span>

          <div className="relative ml-auto">
            <button
              onClick={() => setSelectOpen(!selectOpen)}
              className="flex items-center gap-2 bg-white hover:bg-gray-200 text-xs text-gray-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              {currentProject && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentProject.color }} />
              )}
              {currentProject?.name ?? 'Chargement...'}
              <ChevronDown size={14} className={`transition-transform ${selectOpen ? 'rotate-180' : ''}`} />
            </button>

            {selectOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSelectOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-300 rounded-lg shadow-xl z-20 py-1">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => switchProject(p.slug)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${p.slug === normalizedSlug ? 'text-indigo-600 bg-indigo-600/10' : 'text-gray-600 hover:bg-gray-200'}`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      {p.name}
                      {p.status === 'maintenance' && (
                        <span className="ml-auto text-[10px] text-amber-600">Maint.</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <NotificationsButton />
          <MessagingButton />

          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="text-gray-600 hover:text-red-700 transition-colors"
            title="Déconnexion"
          >
            <LogOut size={16} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-gray-100 rounded-xl border border-gray-200 p-4 animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
                    <div className="h-7 bg-gray-200 rounded w-20" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-100 rounded-xl border border-gray-200 p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
                    <div className="h-48 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          ) : !isAuthorized ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <p className="text-gray-900 text-sm font-medium">Accès non autorisé</p>
              <p className="text-gray-600 text-xs max-w-sm">
                Vous n'avez pas accès à ce projet. Contactez un administrateur si vous pensez qu'il s'agit d'une erreur.
              </p>
              <button
                onClick={() => navigate('/')}
                className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Retour à l'accueil
              </button>
            </div>
          ) : dashboard ? (
            isHome ? (
              <HomePage
                section={activeSection}
                projects={projects}
                firstName={sdpUser?.first_name}
                isAdmin={sdpUser?.role_name === 'admin'}
                openTicketsCount={openTicketsCount}
                onOpenHelp={() => setActiveSection('help')}
                onBackHome={() => setActiveSection('overview')}
                onOpenAdminTickets={() => navigate('/project/admin-portal')}
              />
            ) : isLyloSections ? (
              <LyloRenderer section={activeSection} />
            ) : isNono ? (
              <NonoRenderer section={activeSection} />
            ) : isNinnoAdminSection ? (
              <NinnoRenderer section={activeSection} />
            ) : isAdmin ? (
              <AdminPage embedded section={activeSection} onSectionChange={setActiveSection} />
            ) : isOcrSection ? (
              <MarketplaceRenderer
                section={activeSection}
                selectedCustomerId={selectedCustomerId}
                selectedFormulaId={selectedFormulaId}
                selectedGroupIds={selectedGroupIds}
                selectedOrderId={selectedOrderId}
                onOpenCustomer={(id) => { setSelectedCustomerId(id); setActiveSection('clients') }}
                onBackToClients={() => { setSelectedCustomerId(null); setSelectedFormulaId(null) }}
                onOpenFormula={(id) => setSelectedFormulaId(id)}
                onBackToCustomer={() => setSelectedFormulaId(null)}
                onOpenGroups={(ids) => { setSelectedGroupIds(Array.isArray(ids) ? ids : [ids]); setActiveSection('groups') }}
                onBackToGroups={() => setSelectedGroupIds([])}
                onOpenOrder={(id) => { setSelectedOrderId(id); setActiveSection('orders') }}
                onBackToOrders={() => setSelectedOrderId(null)}
                onCustomerDeleted={() => { setSelectedCustomerId(null); setSelectedFormulaId(null) }}
                onOpenCustomerReviews={() => setActiveSection('customer-reviews')}
                onBackToClientsFromReviews={() => setActiveSection('clients')}
              />
            ) : (
              <div className="space-y-6">
                {isUserMode && (
                  <WelcomeHeader firstName={sdpUser?.first_name || user?.first_name || mockUser.firstName} notifications={mockNotifications} />
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-900 font-bold text-xs"
                      style={{ backgroundColor: dashboard.color }}
                    >
                      {dashboard.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{activeSectionData?.name ?? dashboard.name}</h2>
                      <p className="text-xs text-gray-600">{dashboard.description}</p>
                    </div>
                  </div>
                  <span
                    className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                      dashboard.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : dashboard.status === 'maintenance'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-gray-300/10 text-gray-600'
                    }`}
                  >
                    <Activity size={10} />
                    {dashboard.status === 'active' ? 'Actif' : dashboard.status === 'maintenance' ? 'Maintenance' : 'Inactif'}
                  </span>
                </div>

                {filteredMetrics.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredMetrics.map((m) => (
                      <MetricCard key={m.id} metric={m} />
                    ))}
                  </div>
                )}

                {filteredCharts.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredCharts.map((c) => (
                      <Chart key={c.id} chart={c} />
                    ))}
                  </div>
                )}

                {filteredMetrics.length === 0 && filteredCharts.length === 0 && (
                  <p className="text-gray-600 text-sm text-center py-12">Aucune donnée pour cette section</p>
                )}
              </div>
            )
          ) : null}
        </div>
      </main>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
