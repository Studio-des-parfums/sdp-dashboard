import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Shield, BarChart3, LayoutDashboard, ArrowLeftRight, Euro, ShoppingCart, Store, Users, Activity, Database, Server, BarChart, Headphones, FileText, Tablet, Image, StickyNote, Bot, Phone, Settings, LogOut, ChevronDown, Plus, X, LucideIcon } from 'lucide-react'
import type { DashboardSection, Project } from '../types'

const iconMap: Record<string, LucideIcon> = {
  Shield, LayoutDashboard, ArrowLeftRight, Euro, ShoppingCart, Store,
  Users, Activity, Database, Server, BarChart3, BarChart, Headphones,
  FileText, Tablet, Image, StickyNote, Bot, Phone,
}

interface ProjectsMode {
  mode: 'projects'
  projects: Project[]
  collapsed: boolean
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

interface SectionsMode {
  mode: 'sections'
  sections: DashboardSection[]
  activeSection: string
  onSectionChange: (id: string) => void
  collapsed: boolean
  mobileOpen?: boolean
  onCloseMobile?: () => void
  userMode?: boolean
  onOpenSettings?: () => void
  onLogout?: () => void
  badges?: Record<string, number>
  /** Sous-ensemble de sections regroupées sous un dropdown repliable (ex: une entrée par équipe Polux). */
  groupedSection?: {
    label: string
    sectionIds: string[]
    onAddClick: () => void
    addLabel: string
  }
  projects?: Project[]
  currentSlug?: string
  onSwitchProject?: (slug: string) => void
}

type SidebarProps = ProjectsMode | SectionsMode

export function Sidebar(props: SidebarProps) {
  if (props.mode === 'projects') {
    const { projects, collapsed, mobileOpen, onCloseMobile } = props
    return (
      <>
        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={onCloseMobile}
          />
        )}
        <aside
          className={`bg-gray-100 border-r border-gray-200 flex flex-col transition-all duration-200 
            fixed inset-y-0 left-0 z-40 md:static
            ${mobileOpen ? 'translate-x-0 w-64 shadow-xl' : '-translate-x-full md:translate-x-0'}
            ${collapsed ? 'md:w-16' : 'md:w-60'}
          `}
        >
          <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="SDP" className="h-7 w-7 shrink-0" />
              {(!collapsed || mobileOpen) && <span className="font-bold text-sm truncate">SDP</span>}
            </div>
            {mobileOpen && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden text-gray-500 hover:text-gray-900 p-1"
                aria-label="Fermer le menu"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            <NavLink to="/" end
              onClick={() => onCloseMobile?.()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive ? 'bg-indigo-600/10 text-indigo-600 border-r-2 border-indigo-400' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`
              }
            >
              <LayoutDashboard size={18} className="shrink-0" />
              {(!collapsed || mobileOpen) && 'Tous les projets'}
            </NavLink>
            {(!collapsed || mobileOpen) && <p className="text-[10px] uppercase tracking-widest text-gray-700 font-semibold px-4 pt-4 pb-1">Projets</p>}
            {projects.map((p) => (
              <NavLink key={p.id} to={`/project/${p.slug}`}
                onClick={() => onCloseMobile?.()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${isActive ? 'bg-indigo-600/10 text-indigo-600 border-r-2 border-indigo-400' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`
                }
                title={collapsed && !mobileOpen ? p.name : undefined}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                {(!collapsed || mobileOpen) && <span className="truncate">{p.name}</span>}
              </NavLink>
            ))}
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="px-4 py-2 border-t border-gray-200">
              <p className="text-[10px] text-gray-700">v{__APP_VERSION__}</p>
            </div>
          )}
        </aside>
      </>
    )
  }

  const { sections, activeSection, onSectionChange, collapsed, mobileOpen, onCloseMobile, userMode, onOpenSettings, onLogout, badges, groupedSection, projects, currentSlug, onSwitchProject } = props
  const [groupOpen, setGroupOpen] = useState(true)
  const [mobileProjectSelectOpen, setMobileProjectSelectOpen] = useState(false)
  const groupedIds = new Set(groupedSection?.sectionIds ?? [])
  const mainSections = sections.filter((s) => !groupedIds.has(s.id))
  const groupSections = sections.filter((s) => groupedIds.has(s.id))

  function renderSectionButton(s: DashboardSection) {
    const Icon = iconMap[s.icon] || LayoutDashboard
    const isActive = activeSection === s.id
    const badge = badges?.[s.id]
    const isTextShown = !collapsed || mobileOpen
    return (
      <button
        key={s.id}
        onClick={() => {
          onSectionChange(s.id)
          onCloseMobile?.()
        }}
        className={`relative w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${isActive ? 'bg-indigo-600/10 text-indigo-600 border-r-2 border-indigo-400' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
        title={collapsed && !mobileOpen ? s.name : undefined}
      >
        {s.color ? (
          <span
            className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
            style={{ backgroundColor: s.color }}
          >
            {s.name.charAt(0).toUpperCase()}
          </span>
        ) : (
          <Icon size={18} className="shrink-0" />
        )}
        {isTextShown && <span className="truncate">{s.name}</span>}
        {!!badge && (
          <span className={`shrink-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${collapsed && !mobileOpen ? 'absolute top-1.5 right-1.5' : 'ml-auto'}`}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    )
  }

  const isTextShown = !collapsed || mobileOpen
  const currentProject = projects?.find((p) => p.slug === currentSlug)

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`bg-gray-100 border-r border-gray-200 flex flex-col transition-all duration-200
          fixed inset-y-0 left-0 z-40 md:static
          ${mobileOpen ? 'translate-x-0 w-64 shadow-xl' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-16' : 'md:w-60'}
        `}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="SDP" className="h-7 w-7 shrink-0" />
            {isTextShown && <span className="font-bold text-sm truncate">SDP</span>}
          </div>
          {mobileOpen && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden text-gray-500 hover:text-gray-900 p-1"
              aria-label="Fermer le menu"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {isTextShown && <p className="text-[10px] uppercase tracking-widest text-gray-700 font-semibold px-4 pt-4 pb-1">Sections</p>}
          {mainSections.map(renderSectionButton)}

          {groupedSection && (
            <>
              <button
                onClick={() => setGroupOpen((o) => !o)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors text-left"
                title={collapsed && !mobileOpen ? groupedSection.label : undefined}
              >
                <ChevronDown size={18} className={`shrink-0 transition-transform ${groupOpen ? '' : '-rotate-90'}`} />
                {isTextShown && <span className="truncate">{groupedSection.label}</span>}
              </button>
              {groupOpen && groupSections.map(renderSectionButton)}
              {(groupOpen || collapsed) && (
                <button
                  onClick={() => {
                    groupedSection.onAddClick()
                    onCloseMobile?.()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors text-left"
                  title={collapsed && !mobileOpen ? groupedSection.addLabel : undefined}
                >
                  <Plus size={18} className="shrink-0" />
                  {isTextShown && <span className="truncate">{groupedSection.addLabel}</span>}
                </button>
              )}
            </>
          )}
        </div>

        <div className="border-t border-gray-200 py-2">
          {projects && projects.length > 0 && onSwitchProject && (
            <div className="md:hidden px-3 py-1.5 mb-1">
              <p className="text-[10px] uppercase tracking-wider text-gray-700 font-semibold mb-1 px-1">Projet</p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMobileProjectSelectOpen(!mobileProjectSelectOpen)}
                  className="w-full flex items-center justify-between gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-xs text-gray-800 px-3 py-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {currentProject && (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: currentProject.color }} />
                    )}
                    <span className="truncate">{currentProject?.name ?? 'Changer de projet...'}</span>
                  </div>
                  <ChevronDown size={14} className={`shrink-0 text-gray-500 transition-transform ${mobileProjectSelectOpen ? 'rotate-180' : ''}`} />
                </button>

                {mobileProjectSelectOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMobileProjectSelectOpen(false)}
                    />
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 max-h-60 overflow-y-auto">
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setMobileProjectSelectOpen(false)
                            onSwitchProject(p.slug)
                            onCloseMobile?.()
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${p.slug === currentSlug ? 'text-indigo-600 bg-indigo-50 font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="truncate">{p.name}</span>
                          {p.status === 'maintenance' && (
                            <span className="ml-auto text-[10px] text-amber-600">Maint.</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {userMode && (
            <>
              <button
                onClick={() => {
                  onOpenSettings?.()
                  onCloseMobile?.()
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors text-left"
                title={collapsed && !mobileOpen ? 'Paramètres' : undefined}
              >
                <Settings size={18} className="shrink-0" />
                {isTextShown && 'Paramètres'}
              </button>
              <button
                onClick={() => {
                  onLogout?.()
                  onCloseMobile?.()
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-700 hover:text-red-700 hover:bg-gray-100 transition-colors text-left"
                title={collapsed && !mobileOpen ? 'Déconnexion' : undefined}
              >
                <LogOut size={18} className="shrink-0" />
                {isTextShown && 'Déconnexion'}
              </button>
            </>
          )}
        </div>
        {isTextShown && (
          <div className="px-4 py-2 border-t border-gray-200">
            <p className="text-[10px] text-gray-700">v{__APP_VERSION__}</p>
          </div>
        )}
      </aside>
    </>
  )
}
