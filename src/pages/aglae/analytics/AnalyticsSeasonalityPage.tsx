// sdp-dashboard/src/pages/aglae/analytics/AnalyticsSeasonalityPage.tsx

import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  CalendarDays,
  Flame,
  Award,
  Sparkles,
} from 'lucide-react'
import { analyticsApi } from '../../../api/analyticsClient'
import type { BestPeriodsResponse } from '../../../types/analytics'
import { formatNumber, formatPercent } from './analyticsUtils'

export const AnalyticsSeasonalityPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(12)
  const [data, setData] = useState<BestPeriodsResponse | null>(null)
  const [activeTab, setActiveTab] = useState<'months' | 'days' | 'years'>('months')

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await analyticsApi.getBestPeriods(limit)
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
  }, [limit])

  // CALCULS STATISTIQUES MÉMORISÉS SUR LA SAISONNALITÉ :
  // Dérive les meilleures périodes historiques (mois star, jour d'affluence, année record)
  // et segmente la fréquentation entre jours ouvrés (semaine) et week-ends.
  const insights = useMemo(() => {
    const topMonth = data?.top_months?.[0]
    const topDay = data?.top_days_of_week?.[0]
    const topYear = data?.top_years?.[0]

    // LOGIQUE DE RÉPARTITION SEMAINE VS WEEK-END :
    // L'API renvoie les jours sous la convention ISO :
    // 1 = Lundi, 2 = Mardi, ..., 5 = Vendredi, 6 = Samedi, 7 = Dimanche.
    // On cumule donc les jours >= 6 pour le week-end et < 6 pour les jours de semaine.
    const days = data?.top_days_of_week || []
    let weekdayCount = 0
    let weekendCount = 0

    days.forEach((d) => {
      if (d.day >= 6) {
        weekendCount += d.count
      } else {
        weekdayCount += d.count
      }
    })

    // Calcul des pourcentages relatifs pour la jauge comparative Semaine vs Week-end
    const totalDaysCount = weekdayCount + weekendCount || 1
    const weekdayPct = (weekdayCount / totalDaysCount) * 100
    const weekendPct = (weekendCount / totalDaysCount) * 100

    return {
      topMonth,
      topDay,
      topYear,
      weekdayCount,
      weekendCount,
      weekdayPct,
      weekendPct,
    }
  }, [data])

  // Volume total agrégé sur l'ensemble des mois de l'échantillon
  const totalMonthsCount = useMemo(() => {
    return (data?.top_months || []).reduce((acc, m) => acc + m.count, 0) || 1
  }, [data])

  // Volume total agrégé sur l'ensemble des jours de la semaine
  const totalDaysCount = useMemo(() => {
    return (data?.top_days_of_week || []).reduce((acc, d) => acc + d.count, 0) || 1
  }, [data])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-72 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
        <p className="font-semibold mb-2">Erreur de chargement de la saisonnalité</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-700 text-white rounded-lg text-xs font-medium"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays size={20} className="text-indigo-600" />
            Saisonnalité & Meilleures Périodes d'Activité
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Découvrez les mois de forte affluence, les jours les plus productifs de la semaine et la dynamique annuelle
          </p>
        </div>

        {/* View toggle */}
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('months')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'months'
                ? 'bg-white text-gray-900 shadow-xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Mois de l'Année
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('days')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'days'
                ? 'bg-white text-gray-900 shadow-xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Jours de la Semaine
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('years')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'years'
                ? 'bg-white text-gray-900 shadow-xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Années
          </button>
        </div>

        {/* Limit selector */}
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-medium">
          {[5, 10, 12].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLimit(l)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                limit === l ? 'bg-white text-gray-900 shadow-xs font-semibold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Top {l}
            </button>
          ))}
        </div>
      </div>

      {/* KPI HIGHLIGHTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Top Mois */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Mois Record
          </span>
          <div className="text-xl font-bold text-indigo-700 tracking-tight flex items-center gap-1.5">
            <Award size={18} className="text-indigo-600" />
            {insights.topMonth?.label || '—'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {insights.topMonth ? `${formatNumber(insights.topMonth.count)} formules créées` : '—'}
          </p>
        </div>

        {/* Top Jour */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Jour Phare
          </span>
          <div className="text-xl font-bold text-amber-700 tracking-tight flex items-center gap-1.5">
            <Flame size={18} className="text-amber-600" />
            {insights.topDay?.label || '—'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {insights.topDay ? `${formatNumber(insights.topDay.count)} formules créées` : '—'}
          </p>
        </div>

        {/* Semaine vs Week-end */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Semaine vs Week-end
          </span>
          <div className="text-base font-bold text-gray-900 tracking-tight">
            {formatPercent(insights.weekdayPct, 0)} <span className="text-xs font-normal text-gray-400">/</span> {formatPercent(insights.weekendPct, 0)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {formatNumber(insights.weekdayCount)} sem. vs {formatNumber(insights.weekendCount)} w-e
          </p>
        </div>

        {/* Top Année */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Année Leader
          </span>
          <div className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
            <Sparkles size={18} className="text-indigo-500" />
            {insights.topYear?.year || '—'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {insights.topYear ? `${formatNumber(insights.topYear.count)} formules créées` : '—'}
          </p>
        </div>
      </div>

      {/* SECTION 1: MOIS DE L'ANNÉE */}
      {activeTab === 'months' && (
        <div className="space-y-6">
          {/* Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-between">
              <span>Classement des mois par création de formules</span>
              <span className="text-xs font-normal text-gray-500">Mois de janvier à décembre</span>
            </h3>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.top_months || []} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAE2D9" vertical={false} />
                  <XAxis dataKey="label" stroke="#9A8573" tick={{ fontSize: 11, fill: '#7A6554' }} tickLine={false} />
                  <YAxis stroke="#9A8573" tick={{ fontSize: 11, fill: '#7A6554' }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #EAE2D9',
                      borderRadius: 8,
                      fontSize: '12px',
                    }}
                    formatter={(val: number) => [`${formatNumber(val)} formules`, 'Volume']}
                    labelFormatter={(lbl) => `Mois : ${lbl}`}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(data?.top_months || []).map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={idx === 0 ? '#996F56' : idx === 1 ? '#B28267' : '#D9CCC0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 mb-4">
              Palmarès complet des mois
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                    <th className="text-left py-2.5 px-3">Rang</th>
                    <th className="text-left py-2.5 px-3">Mois</th>
                    <th className="text-right py-2.5 px-3">Formules</th>
                    <th className="text-left py-2.5 px-4 w-1/3">Part de la saison</th>
                    <th className="text-right py-2.5 px-3">% Part</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.top_months?.map((m, idx) => {
                    const pct = (m.count / totalMonthsCount) * 100
                    return (
                      <tr key={m.month} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-3 text-gray-600 font-medium">
                          {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{m.label}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                          {formatNumber(m.count)}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-600 font-medium">
                          {formatPercent(pct)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: JOURS DE LA SEMAINE */}
      {activeTab === 'days' && (
        <div className="space-y-6">
          {/* Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-between">
              <span>Fréquentation selon le jour de la semaine</span>
              <span className="text-xs font-normal text-gray-500">Du Lundi au Dimanche</span>
            </h3>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.top_days_of_week || []} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAE2D9" vertical={false} />
                  <XAxis dataKey="label" stroke="#9A8573" tick={{ fontSize: 11, fill: '#7A6554' }} tickLine={false} />
                  <YAxis stroke="#9A8573" tick={{ fontSize: 11, fill: '#7A6554' }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #EAE2D9',
                      borderRadius: 8,
                      fontSize: '12px',
                    }}
                    formatter={(val: number) => [`${formatNumber(val)} formules`, 'Volume']}
                    labelFormatter={(lbl) => `Jour : ${lbl}`}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(data?.top_days_of_week || []).map((entry, idx) => (
                      <Cell
                        key={`day-cell-${idx}`}
                        fill={entry.day >= 6 ? '#D97706' : '#996F56'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 mb-4">
              Détail par jour de la semaine
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                    <th className="text-left py-2.5 px-3">Rang</th>
                    <th className="text-left py-2.5 px-3">Jour</th>
                    <th className="text-left py-2.5 px-3">Type</th>
                    <th className="text-right py-2.5 px-3">Formules</th>
                    <th className="text-left py-2.5 px-4 w-1/3">Répartition</th>
                    <th className="text-right py-2.5 px-3">% Semaine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.top_days_of_week?.map((d, idx) => {
                    const pct = (d.count / totalDaysCount) * 100
                    const isWeekend = d.day >= 6
                    return (
                      <tr key={d.day} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-3 text-gray-600 font-medium">#{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{d.label}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              isWeekend
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {isWeekend ? 'Week-end' : 'Semaine'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                          {formatNumber(d.count)}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${isWeekend ? 'bg-amber-500' : 'bg-indigo-600'}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-600 font-medium">
                          {formatPercent(pct)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: ANNÉES */}
      {activeTab === 'years' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-6">
          <h3 className="text-sm font-bold text-gray-900">
            Historique Pluriannuel
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data?.top_years?.map((y, idx) => (
              <div
                key={y.year}
                className="bg-gray-50 rounded-xl p-5 border border-gray-200/80 flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                    Année {y.year}
                  </span>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {formatNumber(y.count)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Formules créées et validées</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
                  <span>Classement</span>
                  <span className="font-semibold text-indigo-600">Rang #{idx + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
