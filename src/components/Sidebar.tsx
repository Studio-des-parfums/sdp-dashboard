import { NavLink } from 'react-router-dom'
import { Shield, BarChart3, LayoutDashboard, ArrowLeftRight, Euro, ShoppingCart, Store, Users, Activity, Database, Server, BarChart, Headphones, FileText, Tablet, Image, StickyNote, Settings, LogOut, LucideIcon } from 'lucide-react'
import type { DashboardSection, Project } from '../types'

const iconMap: Record<string, LucideIcon> = {
  Shield, LayoutDashboard, ArrowLeftRight, Euro, ShoppingCart, Store,
  Users, Activity, Database, Server, BarChart3, BarChart, Headphones,
  FileText, Tablet, Image, StickyNote,
}

interface ProjectsMode {
  mode: 'projects'
  projects: Project[]
  collapsed: boolean
}

interface SectionsMode {
  mode: 'sections'
  sections: DashboardSection[]
  activeSection: string
  onSectionChange: (id: string) => void
  collapsed: boolean
  userMode?: boolean
  onOpenSettings?: () => void
  onLogout?: () => void
  badges?: Record<string, number>
}

type SidebarProps = ProjectsMode | SectionsMode

export function Sidebar(props: SidebarProps) {
  if (props.mode === 'projects') {
    const { projects, collapsed } = props
    return (
      <aside className={`bg-gray-100 border-r border-gray-200 flex flex-col transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
        <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-200 ">
          <img src="/favicon.png" alt="SDP" className="h-7 w-7 shrink-0" />
          {!collapsed && <span className="font-bold text-sm truncate">SDP</span>}
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <NavLink to="/" end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive ? 'bg-indigo-600/10 text-indigo-600 border-r-2 border-indigo-400' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`
            }
          >
            <LayoutDashboard size={18} className="shrink-0" />
            {!collapsed && 'Tous les projets'}
          </NavLink>
          {!collapsed && <p className="text-[10px] uppercase tracking-widest text-gray-700 font-semibold px-4 pt-4 pb-1">Projets</p>}
          {projects.map((p) => (
            <NavLink key={p.id} to={`/project/${p.slug}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${isActive ? 'bg-indigo-600/10 text-indigo-600 border-r-2 border-indigo-400' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`
              }
              title={collapsed ? p.name : undefined}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              {!collapsed && <span className="truncate">{p.name}</span>}
            </NavLink>
          ))}
        </div>
        {!collapsed && (
          <div className="px-4 py-2 border-t border-gray-200">
            <p className="text-[10px] text-gray-700">v{__APP_VERSION__}</p>
          </div>
        )}
      </aside>
    )
  }

  const { sections, activeSection, onSectionChange, collapsed, userMode, onOpenSettings, onLogout, badges } = props
  return (
    <aside className={`bg-gray-100 border-r border-gray-200 flex flex-col transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
        <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-200">
          <img src="/favicon.png" alt="SDP" className="h-7 w-7 shrink-0" />
          {!collapsed && <span className="font-bold text-sm truncate">SDP</span>}
        </div>
      <div className="flex-1 overflow-y-auto py-2">
        {!collapsed && <p className="text-[10px] uppercase tracking-widest text-gray-700 font-semibold px-4 pt-4 pb-1">Sections</p>}
        {sections.map((s) => {
          const Icon = iconMap[s.icon] || LayoutDashboard
          const isActive = activeSection === s.id
          const badge = badges?.[s.id]
          return (
            <button
              key={s.id}
              onClick={() => onSectionChange(s.id)}
              className={`relative w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${isActive ? 'bg-indigo-600/10 text-indigo-600 border-r-2 border-indigo-400' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
              title={collapsed ? s.name : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{s.name}</span>}
              {!!badge && (
                <span className={`shrink-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${collapsed ? 'absolute top-1.5 right-1.5' : 'ml-auto'}`}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="border-t border-gray-200 py-2">
        {userMode && (
          <>
            <button
              onClick={onOpenSettings}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors text-left"
              title={collapsed ? 'Paramètres' : undefined}
            >
              <Settings size={18} className="shrink-0" />
              {!collapsed && 'Paramètres'}
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-700 hover:text-red-700 hover:bg-gray-100 transition-colors text-left"
              title={collapsed ? 'Déconnexion' : undefined}
            >
              <LogOut size={18} className="shrink-0" />
              {!collapsed && 'Déconnexion'}
            </button>
          </>
        )}
      </div>
      {!collapsed && (
        <div className="px-4 py-2 border-t border-gray-200">
          <p className="text-[10px] text-gray-700">v{__APP_VERSION__}</p>
        </div>
      )}
    </aside>
  )
}
