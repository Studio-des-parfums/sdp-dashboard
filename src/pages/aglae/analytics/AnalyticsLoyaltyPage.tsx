// sdp-dashboard/src/pages/aglae/analytics/AnalyticsLoyaltyPage.tsx

import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  Repeat,
  Award,
  TrendingUp,
  Download,
  Sliders,
} from 'lucide-react'
import { analyticsApi } from '../../../api/analyticsClient'
import type { LoyaltyRateResponse } from '../../../types/analytics'
import { formatNumber, formatPercent, exportToCSV } from './analyticsUtils'

interface AnalyticsLoyaltyPageProps {
  dateFrom: string
  dateTo: string
}

export const AnalyticsLoyaltyPage: React.FC<AnalyticsLoyaltyPageProps> = ({
  dateFrom,
  dateTo,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [minFormulas, setMinFormulas] = useState(2)
  const [data, setData] = useState<LoyaltyRateResponse | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await analyticsApi.getLoyaltyRate({
        min_formulas: minFormulas,
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
  }, [minFormulas, dateFrom, dateTo])

  // ANALYSE COMPARATIVE : CLIENTS UNIQUES (MONO-CRÉATEURS) VS RÉCURRENTS :
  // On extrait le bucket '1' de la distribution (clients n'ayant créé qu'une seule formule)
  // pour mesurer le taux d'attrition post-première visite.
  const monoCreators = useMemo(() => {
    const bucket1 = data?.distribution?.find((d) => d.bucket === '1')
    return bucket1?.customer_count || 0
  }, [data])

  // Part en pourcentage des clients mono-créateurs par rapport aux créateurs totaux
  const monoPct = useMemo(() => {
    const total = data?.total_customers_with_formula || 1
    return (monoCreators / total) * 100
  }, [monoCreators, data])

  /**
   * Export CSV de la distribution des clients par tranche de formules créées
   */
  const handleExport = () => {
    if (!data?.distribution) return
    const rows = data.distribution.map((d) => ({
      Tranche_Formules: `${d.bucket} formule(s)`,
      Clients: d.customer_count,
      Part_Pourcentage: `${((d.customer_count / (data.total_customers_with_formula || 1)) * 100).toFixed(2)}%`,
    }))
    exportToCSV(`sdp_fidelite_seuil_${minFormulas}_${dateFrom || 'debut'}_${dateTo || 'fin'}`, rows)
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Repeat size={20} className="text-indigo-600" />
            Fidélité, Repeat Business & Rétention Client
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Analyse de la récurrence des créations de parfum et cohortes de fidélisation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seuil min_formulas */}
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 text-xs">
            <Sliders size={13} className="text-indigo-600" />
            <span className="text-gray-700 font-medium">Seuil de fidélité :</span>
            <div className="flex items-center gap-1">
              {[2, 3, 4, 5].map((threshold) => (
                <button
                  key={threshold}
                  type="button"
                  onClick={() => setMinFormulas(threshold)}
                  className={`w-7 h-6 rounded flex items-center justify-center font-bold text-xs transition-colors ${
                    minFormulas === threshold
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {threshold}+
                </button>
              ))}
            </div>
            <span className="text-gray-400 text-[11px]">formules</span>
          </div>

          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            disabled={!data?.distribution}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Download size={13} />
            CSV
          </button>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taux de fidélité */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-emerald-700 font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
            <Award size={13} /> Taux de Fidélité
          </span>
          <div className="text-3xl font-bold text-emerald-700 tracking-tight">
            {formatPercent(data?.loyalty_rate, 2)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Clients avec &ge; {minFormulas} formules
          </p>
        </div>

        {/* Clients fidèles */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Clients Fidèles
          </span>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatNumber(data?.loyal_customers)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Ayant réitéré l'expérience atelier</p>
        </div>

        {/* Total clients avec formule */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Clients Créateurs
          </span>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatNumber(data?.total_customers_with_formula)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Ayant au moins 1 formule enregistrée</p>
        </div>

        {/* Mono-formule */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Mono-Créateurs (1 seule)
          </span>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatPercent(monoPct, 1)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {formatNumber(monoCreators)} clients (opportunité de réachat)
          </p>
        </div>
      </div>

      {/* TWO CHARTS: DISTRIBUTION & NEW LOYAL COHORT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution Bar Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">
                Distribution du nombre de formules par client
              </h3>
              <span className="text-xs text-gray-500">Par tranche de volume</span>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : error ? (
              <div className="h-64 flex items-center justify-center text-red-600 text-sm">
                {error}
              </div>
            ) : !data?.distribution || data.distribution.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                Aucune donnée de distribution
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.distribution}
                    margin={{ top: 10, right: 15, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAE2D9" vertical={false} />
                    <XAxis
                      dataKey="bucket"
                      stroke="#9A8573"
                      tick={{ fontSize: 11, fill: '#7A6554' }}
                      tickFormatter={(val) => `${val} formule${val === '1' ? '' : 's'}`}
                      tickLine={false}
                    />
                    <YAxis stroke="#9A8573" tick={{ fontSize: 11, fill: '#7A6554' }} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#FFFFFF',
                        border: '1px solid #EAE2D9',
                        borderRadius: 8,
                        fontSize: '12px',
                      }}
                      formatter={(val: number) => [`${formatNumber(val)} clients`, 'Clients']}
                      labelFormatter={(lbl) => `Tranche : ${lbl} formule(s)`}
                    />
                    <Bar dataKey="customer_count" radius={[4, 4, 0, 0]}>
                      {data.distribution.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={entry.bucket === '1' ? '#D9CCC0' : idx === 1 ? '#996F56' : '#10B981'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-600">
            <span>En beige : 1ère visite. En couleur : Repeat business.</span>
            <span className="font-semibold text-gray-900">{formatNumber(data?.loyal_customers)} récurrents</span>
          </div>
        </div>

        {/* New Loyal Clients Timeline */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-600" />
                Nouveaux clients fidélisés par mois
              </h3>
              <span className="text-xs text-gray-500">Franchissement seuil &ge; {minFormulas}</span>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : !data?.new_loyal_by_month || data.new_loyal_by_month.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                Aucun franchissement de seuil sur cette période
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.new_loyal_by_month}
                    margin={{ top: 10, right: 15, left: 0, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="loyalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAE2D9" vertical={false} />
                    <XAxis dataKey="month" stroke="#9A8573" tick={{ fontSize: 11, fill: '#7A6554' }} tickLine={false} />
                    <YAxis stroke="#9A8573" tick={{ fontSize: 11, fill: '#7A6554' }} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#FFFFFF',
                        border: '1px solid #EAE2D9',
                        borderRadius: 8,
                        fontSize: '12px',
                      }}
                      formatter={(val: number) => [`${formatNumber(val)} nouveaux fidèles`, 'Volume']}
                      labelFormatter={(lbl) => `Mois : ${lbl}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="new_loyal"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#loyalGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
            <span>Date de la deuxième formule (ou du seuil choisi)</span>
            <span className="font-semibold text-emerald-700">Rétention active</span>
          </div>
        </div>
      </div>

      {/* DETAILED DISTRIBUTION TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 mb-4">
          Tableau de décomposition de la rétention client
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                <th className="text-left py-2.5 px-3">Tranche</th>
                <th className="text-left py-2.5 px-3">Qualification</th>
                <th className="text-right py-2.5 px-3">Nombre de Clients</th>
                <th className="text-left py-2.5 px-4 w-1/3">Part de la clientèle</th>
                <th className="text-right py-2.5 px-3">% Base</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.distribution?.map((item) => {
                const total = data.total_customers_with_formula || 1
                const pct = (item.customer_count / total) * 100
                const isLoyal = Number(item.bucket.replace('+', '')) >= minFormulas

                return (
                  <tr key={item.bucket} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-gray-900">
                      {item.bucket} formule{item.bucket === '1' ? '' : 's'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          isLoyal
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {isLoyal ? 'Fidélisé / Repeat' : 'Première expérience'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                      {formatNumber(item.customer_count)}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${isLoyal ? 'bg-emerald-600' : 'bg-gray-400'}`}
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
  )
}
