// sdp-dashboard/src/pages/aglae/analytics/AnalyticsCardsGrid.tsx

import React from 'react'
import {
  TrendingUp,
  CalendarDays,
  Building2,
  Sparkles,
  Gift,
  Users,
  Globe2,
  Repeat,
  PackageCheck,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react'
import type { AnalyticsTabId } from './AnalyticsTabs'

/**
 * Modèle de données pour les cartes du menu d'accueil analytique
 */
interface AnalyticsCardItem {
  id: AnalyticsTabId
  title: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
}

/**
 * Configuration des 9 modules d'analyse du Studio des Parfums.
 * Affiche une présentation épurée (icône stylisée aux teintes de la Maison, titre percutant, flèche discrète).
 */
const ANALYTICS_CARDS: AnalyticsCardItem[] = [
  {
    id: 'formulas',
    title: 'Formules créées',
    icon: TrendingUp,
    iconBg: 'bg-[#996F56]/10',
    iconColor: 'text-[#996F56]',
  },
  {
    id: 'seasonality',
    title: 'Saisonnalité',
    icon: CalendarDays,
    iconBg: 'bg-[#D97706]/10',
    iconColor: 'text-[#D97706]',
  },
  {
    id: 'ateliers',
    title: 'Ateliers olfactifs',
    icon: Building2,
    iconBg: 'bg-[#855D47]/10',
    iconColor: 'text-[#855D47]',
  },
  {
    id: 'notes',
    title: 'Pyramide olfactive',
    icon: Sparkles,
    iconBg: 'bg-[#EC4899]/10',
    iconColor: 'text-[#EC4899]',
  },
  {
    id: 'options',
    title: 'Options & Extras',
    icon: Gift,
    iconBg: 'bg-[#8B5CF6]/10',
    iconColor: 'text-[#8B5CF6]',
  },
  {
    id: 'demographics',
    title: 'Démographie',
    icon: Users,
    iconBg: 'bg-[#6366F1]/10',
    iconColor: 'text-[#6366F1]',
  },
  {
    id: 'locations',
    title: 'Géographie',
    icon: Globe2,
    iconBg: 'bg-[#06B6D4]/10',
    iconColor: 'text-[#06B6D4]',
  },
  {
    id: 'loyalty',
    title: 'Fidélité client',
    icon: Repeat,
    iconBg: 'bg-[#10B981]/10',
    iconColor: 'text-[#10B981]',
  },
  {
    id: 'orders',
    title: 'Suivi des commandes',
    icon: PackageCheck,
    iconBg: 'bg-[#43362C]/10',
    iconColor: 'text-[#43362C]',
  },
]

interface AnalyticsCardsGridProps {
  onSelectTab: (tab: AnalyticsTabId) => void
}

/**
 * Grille d'accueil affichée lorsque aucun onglet n'est explicitement sélectionné (activeTab === null).
 * Permet à l'utilisateur d'avoir une vue synthétique des domaines d'analyse et d'y accéder en un clic.
 */
export const AnalyticsCardsGrid: React.FC<AnalyticsCardsGridProps> = ({ onSelectTab }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ANALYTICS_CARDS.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.id}
            onClick={() => onSelectTab(card.id)}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-400 hover:shadow-sm transition-all duration-150 cursor-pointer flex flex-col justify-between h-28 group"
          >
            <div className="flex items-center justify-between">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconBg} ${card.iconColor} group-hover:scale-105 transition-transform`}
              >
                <Icon size={20} />
              </div>
              <ArrowUpRight
                size={16}
                className="text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
              />
            </div>

            <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {card.title}
            </span>
          </div>
        )
      })}
    </div>
  )
}
