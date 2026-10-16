// sdp-dashboard/src/pages/aglae/AnalysisPage.tsx

import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AnalyticsHeader } from './analytics/AnalyticsHeader'
import { AnalyticsTabs, type AnalyticsTabId } from './analytics/AnalyticsTabs'
import { AnalyticsCardsGrid } from './analytics/AnalyticsCardsGrid'
import { AnalyticsFormulasPage } from './analytics/AnalyticsFormulasPage'
import { AnalyticsSeasonalityPage } from './analytics/AnalyticsSeasonalityPage'
import { AnalyticsAteliersPage } from './analytics/AnalyticsAteliersPage'
import { AnalyticsNotesPage } from './analytics/AnalyticsNotesPage'
import { AnalyticsOptionsPage } from './analytics/AnalyticsOptionsPage'
import { AnalyticsDemographicsPage } from './analytics/AnalyticsDemographicsPage'
import { AnalyticsLocationsPage } from './analytics/AnalyticsLocationsPage'
import { AnalyticsLoyaltyPage } from './analytics/AnalyticsLoyaltyPage'
import { AnalyticsOrdersTrackingPage } from './analytics/AnalyticsOrdersTrackingPage'

export default function AnalysisPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // GESTION DU ROUTAGE INTERNE PAR PARAMÈTRES D'URL :
  // Si le paramètre ?tab=xxx est présent dans l'URL, on affiche directement la sous-page demandée.
  // Si aucun paramètre n'est renseigné (activeTab === null), on affiche la grille de cartes épurées.
  const tabParam = searchParams.get('tab') as AnalyticsTabId | null
  const [activeTab, setActiveTab] = useState<AnalyticsTabId | null>(tabParam || null)

  // Filtres temporels globaux conservés dans l'URL pour faciliter le partage et les favoris du navigateur
  const [dateFrom, setDateFrom] = useState<string>(searchParams.get('date_from') || '')
  const [dateTo, setDateTo] = useState<string>(searchParams.get('date_to') || '')
  const [refreshKey, setRefreshKey] = useState(0)

  // SYNCHRONISATION DU CHANGEMENT D'ONGLET AVEC L'URL :
  // Met à jour l'URL sans recharger la page pour préserver l'historique du navigateur (replace: true).
  const handleTabChange = useCallback(
    (newTab: AnalyticsTabId | null) => {
      setActiveTab(newTab)
      const currentParams = new URLSearchParams(searchParams)
      if (newTab) {
        currentParams.set('tab', newTab)
      } else {
        currentParams.delete('tab')
      }
      setSearchParams(currentParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // SYNCHRONISATION DES PLAGES DE DATES AVEC L'URL :
  // Met à jour date_from et date_to dans les query parameters de l'URL.
  const handleDateChange = useCallback(
    (from: string, to: string) => {
      setDateFrom(from)
      setDateTo(to)
      const currentParams = new URLSearchParams(searchParams)
      if (from) currentParams.set('date_from', from)
      else currentParams.delete('date_from')
      if (to) currentParams.set('date_to', to)
      else currentParams.delete('date_to')
      setSearchParams(currentParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // DÉCLENCHEUR DE RÉACTUALISATION GLOBALE :
  // Incrémente un compteur utilisé comme clé React pour forcer le remontage
  // et le rechargement immédiat de la vue active.
  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  return (
    <div className="space-y-6 pb-12">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            📊 Module Analytics & Statistiques
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Studio des Parfums (Sidonie) — Analyses approfondies et indicateurs de performance
          </p>
        </div>

        {activeTab !== null && (
          <button
            type="button"
            onClick={() => handleTabChange(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-100 shadow-xs transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Toutes les analyses</span>
          </button>
        )}
      </div>

      {/* GLOBAL DATE FILTER BAR */}
      <AnalyticsHeader
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateChange={handleDateChange}
        onRefresh={handleRefresh}
      />

      {/* DISTINCT ANALYTICS TABS */}
      <AnalyticsTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* SUBPAGE CONTENT OR CARDS GRID */}
      <div key={`view-${activeTab || 'grid'}-${refreshKey}`}>
        {activeTab === null && (
          <AnalyticsCardsGrid onSelectTab={handleTabChange} />
        )}

        {activeTab === 'formulas' && (
          <AnalyticsFormulasPage dateFrom={dateFrom} dateTo={dateTo} />
        )}

        {activeTab === 'seasonality' && <AnalyticsSeasonalityPage />}

        {activeTab === 'ateliers' && (
          <AnalyticsAteliersPage dateFrom={dateFrom} dateTo={dateTo} />
        )}

        {activeTab === 'notes' && (
          <AnalyticsNotesPage dateFrom={dateFrom} dateTo={dateTo} />
        )}

        {activeTab === 'options' && (
          <AnalyticsOptionsPage dateFrom={dateFrom} dateTo={dateTo} />
        )}

        {activeTab === 'demographics' && (
          <AnalyticsDemographicsPage dateFrom={dateFrom} dateTo={dateTo} />
        )}

        {activeTab === 'locations' && (
          <AnalyticsLocationsPage dateFrom={dateFrom} dateTo={dateTo} />
        )}

        {activeTab === 'loyalty' && (
          <AnalyticsLoyaltyPage dateFrom={dateFrom} dateTo={dateTo} />
        )}

        {activeTab === 'orders' && <AnalyticsOrdersTrackingPage />}
      </div>
    </div>
  )
}
