// sdp-dashboard/src/pages/aglae/analytics/AnalyticsDemographicsPage.tsx

import React, { useState, useEffect } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Users,
  UserCheck,
  Info,
} from 'lucide-react'
import { analyticsApi } from '../../../api/analyticsClient'
import type { GenderDistributionResponse } from '../../../types/analytics'
import { formatNumber, formatPercent } from './analyticsUtils'

interface AnalyticsDemographicsPageProps {
  dateFrom: string
  dateTo: string
}

export const AnalyticsDemographicsPage: React.FC<AnalyticsDemographicsPageProps> = ({
  dateFrom,
  dateTo,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<GenderDistributionResponse | null>(null)
  const [viewMode, setViewMode] = useState<'known_only' | 'all'>('known_only')

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await analyticsApi.getGenderDistribution({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setData(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de chargement'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [dateFrom, dateTo])

  // LOGIQUE DE QUALIFICATION DES DONNÉES :
  // Nombre total de profils clients dont le genre est renseigné (Homme ou Femme)
  // et calcul du taux de complétude des fiches clients par rapport à la base globale.
  const knownTotal = (data?.male || 0) + (data?.female || 0)
  const knownRate = data?.total ? (knownTotal / data.total) * 100 : 0

  // CALCUL DES DONNÉES DU CAMEMBERT SELON LE MODE D'AFFICHAGE :
  // 1. Mode 'known_only' : Renormalise à 100% sur les profils renseignés (Hommes vs Femmes nets).
  // 2. Mode 'all' : Intègre la part 'Non renseigné' pour évaluer la complétude de la base.
  const chartData = React.useMemo(() => {
    if (!data) return []
    if (viewMode === 'known_only') {
      return [
        { name: 'Hommes', value: data.male, pct: data.male_pct, color: '#996F56' },
        { name: 'Femmes', value: data.female, pct: data.female_pct, color: '#D97706' },
      ].filter((d) => d.value > 0)
    }
    // Mode 'all' : calcul des pourcentages par rapport au volume total absolu
    const allTotal = data.total || 1
    const maleAllPct = (data.male / allTotal) * 100
    const femaleAllPct = (data.female / allTotal) * 100
    return [
      { name: 'Hommes', value: data.male, pct: maleAllPct, color: '#996F56' },
      { name: 'Femmes', value: data.female, pct: femaleAllPct, color: '#D97706' },
      { name: 'Non renseigné', value: data.unknown, pct: data.unknown_pct, color: '#D9CCC0' },
    ].filter((d) => d.value > 0)
  }, [data, viewMode])

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Users size={20} className="text-indigo-600" />
            Démographie & Répartition par Genre
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Analyse de la civilité des clients enregistrés au Studio des Parfums
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-medium">
          <button
            type="button"
            onClick={() => setViewMode('known_only')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              viewMode === 'known_only'
                ? 'bg-white text-gray-900 shadow-xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Profils Renseignés Uniquement
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              viewMode === 'all'
                ? 'bg-white text-gray-900 shadow-xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tous les Profils (avec inconnus)
          </button>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total clients */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Total Clients Inscrits
          </span>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatNumber(data?.total)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Clients validés dans la base</p>
        </div>

        {/* Hommes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-[#996F56] font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
            <Users size={13} /> Hommes
          </span>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatNumber(data?.male)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {viewMode === 'known_only'
              ? `${formatPercent(data?.male_pct)} des profils renseignés`
              : `${formatPercent(((data?.male || 0) / (data?.total || 1)) * 100, 2)} du total`}
          </p>
        </div>

        {/* Femmes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-[#D97706] font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
            <Users size={13} /> Femmes
          </span>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatNumber(data?.female)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {viewMode === 'known_only'
              ? `${formatPercent(data?.female_pct)} des profils renseignés`
              : `${formatPercent(((data?.female || 0) / (data?.total || 1)) * 100, 2)} du total`}
          </p>
        </div>

        {/* Non Renseignés */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Civilité Non Renseignée
          </span>
          <div className="text-2xl font-bold text-gray-700 tracking-tight">
            {formatNumber(data?.unknown)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {formatPercent(data?.unknown_pct)} de la base globale
          </p>
        </div>
      </div>

      {/* VISUAL BREAKDOWN & DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">
                Camembert de répartition ({viewMode === 'known_only' ? 'Profils Renseignés' : 'Tous les Profils'})
              </h3>
              <span className="text-xs text-gray-500">
                {viewMode === 'known_only' ? `${formatNumber(knownTotal)} profils` : `${formatNumber(data?.total)} profils`}
              </span>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : error ? (
              <div className="h-64 flex items-center justify-center text-red-600 text-sm">
                {error}
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                Aucune donnée démographique
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${formatNumber(val)} clients`, '']}
                      contentStyle={{
                        background: '#FFFFFF',
                        border: '1px solid #EAE2D9',
                        borderRadius: 8,
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-center gap-6 text-xs">
            {chartData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-gray-700">{d.name} :</span>
                <span className="font-bold text-gray-900">{formatPercent(d.pct)}</span>
                <span className="text-gray-400">({formatNumber(d.value)})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Qualification & Insight */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Info size={16} className="text-indigo-600" />
              Qualité des Données & Complétude
            </h3>

            <div className="space-y-4">
              {/* Progress bar qualification */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-gray-700 font-medium">Taux de qualification du genre :</span>
                  <span className="font-bold text-gray-900">{formatPercent(knownRate, 2)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-3 rounded-full transition-all"
                    style={{ width: `${Math.max(2, Math.min(100, knownRate))}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {formatNumber(knownTotal)} profils renseignés sur un total de {formatNumber(data?.total)} clients.
                </p>
              </div>

              {/* Note informative */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-900 space-y-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <UserCheck size={14} className="text-amber-700" />
                  Précision de l'échantillon
                </p>
                <p className="text-amber-800 leading-relaxed">
                  Sur les profils où la civilité est explicitement renseignée (M. / Mme), la répartition observée est de{' '}
                  <strong>{formatPercent(data?.male_pct)} d'hommes</strong> et{' '}
                  <strong>{formatPercent(data?.female_pct)} de femmes</strong>.
                </p>
                <p className="text-amber-800 leading-relaxed">
                  L'enrichissement des civilités lors de la numérisation des fiches ateliers permettra d'affiner encore cette analyse.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
            <span>Filtre d'inscription appliqué</span>
            <span className="text-gray-700 font-medium">
              {dateFrom || dateTo ? `Du ${dateFrom || 'début'} au ${dateTo || 'aujourd\'hui'}` : 'Historique complet'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
