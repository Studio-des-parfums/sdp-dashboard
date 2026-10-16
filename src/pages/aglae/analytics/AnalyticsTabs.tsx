// sdp-dashboard/src/pages/aglae/analytics/AnalyticsTabs.tsx

import React from 'react'
import {
  LayoutGrid,
  TrendingUp,
  CalendarDays,
  Building2,
  Sparkles,
  Gift,
  Users,
  Globe2,
  Repeat,
  PackageCheck,
  type LucideIcon,
} from 'lucide-react'

/**
 * Identifiants uniques des 9 modules d'analyse
 */
export type AnalyticsTabId =
  | 'formulas'
  | 'seasonality'
  | 'ateliers'
  | 'notes'
  | 'options'
  | 'demographics'
  | 'locations'
  | 'loyalty'
  | 'orders'

interface AnalyticsTabsProps {
  activeTab: AnalyticsTabId | null
  onTabChange: (tab: AnalyticsTabId | null) => void
}

/**
 * Définition ordonnée des onglets de navigation avec leurs libellés et icônes
 */
export const ANALYTICS_TABS: { id: AnalyticsTabId; label: string; icon: LucideIcon }[] = [
  { id: 'formulas', label: 'Formules', icon: TrendingUp },
  { id: 'seasonality', label: 'Saisonnalité', icon: CalendarDays },
  { id: 'ateliers', label: 'Ateliers', icon: Building2 },
  { id: 'notes', label: 'Pyramide Olfactive', icon: Sparkles },
  { id: 'options', label: 'Options & Extras', icon: Gift },
  { id: 'demographics', label: 'Démographie', icon: Users },
  { id: 'locations', label: 'Géographie', icon: Globe2 },
  { id: 'loyalty', label: 'Fidélité', icon: Repeat },
  { id: 'orders', label: 'Suivi Commandes', icon: PackageCheck },
]

/**
 * Barre de navigation par onglets de la section Analytics.
 * Propose également le bouton "Toutes les analyses" qui réinitialise `activeTab` à `null`
 * pour revenir à la vue globale sous forme de cartes.
 */
export const AnalyticsTabs: React.FC<AnalyticsTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="bg-gray-100 p-1.5 rounded-xl border border-gray-200 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {/* Bouton de retour à la vue d'ensemble sous forme de cartes */}
        <button
          type="button"
          onClick={() => onTabChange(null)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === null
              ? 'bg-white text-gray-900 shadow-xs border border-gray-200/80 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <LayoutGrid size={14} className={activeTab === null ? 'text-indigo-600' : 'text-gray-500'} />
          <span>Toutes les analyses</span>
        </button>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        {/* Liste des 9 onglets thématiques */}
        {ANALYTICS_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-white text-gray-900 shadow-xs border border-gray-200/80 font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-indigo-600' : 'text-gray-500'} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
