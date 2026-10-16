// sdp-dashboard/src/pages/aglae/analytics/AnalyticsFormulasPage.tsx

import React, { useState, useEffect, useMemo } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  Download,
  Calendar,
  Flame,
  Award,
  BarChart2,
  LineChart as LineChartIcon,
  Activity,
} from 'lucide-react'
import { analyticsApi } from '../../../api/analyticsClient'
import type { FormulaCountResponse, Granularity } from '../../../types/analytics'
import { formatNumber, formatPercent, getDaysDifference, exportToCSV } from './analyticsUtils'

interface AnalyticsFormulasPageProps {
  dateFrom: string
  dateTo: string
}

export const AnalyticsFormulasPage: React.FC<AnalyticsFormulasPageProps> = ({
  dateFrom,
  dateTo,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<FormulaCountResponse | null>(null)
  // Sélecteur dynamique de type de graphique (Aire / Bâtons / Courbe)
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area')

  // LOGIQUE DE GRANULARITÉ INTELLIGENTE :
  // On calcule l'écart de jours entre les bornes temporelles pour déterminer
  // la granularité la plus lisible par défaut :
  // - Inférieure ou égale à 31 jours : granularité journalière ('day')
  // - Supérieure à 2 ans (730 jours) : granularité annuelle ('year')
  // - Entre deux : granularité mensuelle ('month')
  const daysDiff = getDaysDifference(dateFrom, dateTo)
  const defaultGranularity: Granularity =
    daysDiff > 0 && daysDiff <= 31 ? 'day' : daysDiff > 730 ? 'year' : 'month'

  const [groupBy, setGroupBy] = useState<Granularity>(defaultGranularity)

  // Synchronise automatiquement la granularité si l'utilisateur change la plage de dates
  // (ex: clic sur le preset '30 derniers jours' -> bascule automatique sur 'day')
  useEffect(() => {
    if (daysDiff > 0 && daysDiff <= 31) {
      setGroupBy('day')
    } else if (daysDiff > 730) {
      setGroupBy('year')
    }
  }, [daysDiff])

  /**
   * Récupère le volume de formules auprès du backend FastAPI selon les filtres actifs.
   */
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await analyticsApi.getFormulaCount({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        group_by: groupBy,
      })
      setData(res)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur de chargement'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Déclenche le rechargement dès que les dates ou la granularité changent
  useEffect(() => {
    loadData()
  }, [dateFrom, dateTo, groupBy])

  // CALCULS STATISTIQUES MÉMORISÉS (KPIs) :
  // Dérive le total, la moyenne par pas de temps, ainsi que les périodes record (pic) et creuse.
  const stats = useMemo(() => {
    if (!data?.data || data.data.length === 0) {
      return { total: data?.total || 0, average: 0, peak: null, lowest: null }
    }
    const list = data.data
    const total = data.total
    const avg = total / list.length

    let peak = list[0]
    let lowest = list[0]

    list.forEach((item) => {
      if (item.count > peak.count) peak = item
      if (item.count < lowest.count) lowest = item
    })

    return { total, average: avg, peak, lowest }
  }, [data])

  /**
   * Génère l'export CSV structuré avec période, volume et part en pourcentage du total.
   */
  const handleExport = () => {
    if (!data?.data) return
    const exportRows = data.data.map((item) => ({
      Periode: item.period,
      Formules: item.count,
      Part_Pourcentage: `${((item.count / (data.total || 1)) * 100).toFixed(2)}%`,
    }))
    exportToCSV(`sdp_formules_${groupBy}_${dateFrom || 'debut'}_${dateTo || 'fin'}`, exportRows)
  }

  return (
    <div className="space-y-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-600" />
            Évolution Chronologique des Formules
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Analyse détaillée des créations de formules validées (exclut les OCR en attente de validation)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Granularity switch */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => setGroupBy('day')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                groupBy === 'day'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Par Jour
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('month')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                groupBy === 'month'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Par Mois
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('year')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                groupBy === 'year'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Par Année
            </button>
          </div>

          {/* Chart type switch */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs text-gray-600">
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-md transition-colors ${
                chartType === 'area' ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-gray-900'
              }`}
              title="Graphique en aire"
            >
              <Activity size={14} />
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-md transition-colors ${
                chartType === 'bar' ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-gray-900'
              }`}
              title="Histogramme"
            >
              <BarChart2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded-md transition-colors ${
                chartType === 'line' ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-gray-900'
              }`}
              title="Courbe"
            >
              <LineChartIcon size={14} />
            </button>
          </div>

          {/* Export button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={!data?.data || data.data.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            title="Exporter les données en CSV"
          >
            <Download size={13} />
            CSV
          </button>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Total Créées
          </span>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatNumber(stats.total)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Sur la période sélectionnée</p>
        </div>

        {/* Moyenne */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Moyenne / {groupBy === 'day' ? 'Jour' : groupBy === 'month' ? 'Mois' : 'An'}
          </span>
          <div className="text-2xl font-bold text-indigo-600 tracking-tight">
            {formatNumber(Math.round(stats.average))}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Sur {data?.data?.length || 0} période(s) analysée(s)
          </p>
        </div>

        {/* Pic */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-amber-700 font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
            <Flame size={13} /> Pic de production
          </span>
          <div className="text-2xl font-bold text-amber-900 tracking-tight">
            {stats.peak ? formatNumber(stats.peak.count) : '—'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1 truncate">
            {stats.peak ? `Record atteint en : ${stats.peak.period}` : '—'}
          </p>
        </div>

        {/* Périodes actives */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Périodes Répertoriées
          </span>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {data?.data?.length || 0}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Granularité {groupBy}</p>
        </div>
      </div>

      {/* MAIN CHART */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-between">
          <span>Courbe d'évolution chronologique</span>
          <span className="text-xs font-normal text-gray-500">
            Unité : formules par {groupBy === 'day' ? 'jour' : groupBy === 'month' ? 'mois' : 'année'}
          </span>
        </h3>

        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <div className="h-80 flex items-center justify-center text-red-600 text-sm">
            {error}
          </div>
        ) : !data?.data || data.data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
            Aucune donnée pour cette sélection
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={data.data} margin={{ top: 10, right: 15, left: 0, bottom: 25 }}>
                  <defs>
                    <linearGradient id="formulaColorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#996F56" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#996F56" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAE2D9" vertical={false} />
                  <XAxis
                    dataKey="period"
                    stroke="#9A8573"
                    tick={{ fontSize: 11, fill: '#7A6554' }}
                    angle={data.data.length > 12 ? -45 : 0}
                    textAnchor={data.data.length > 12 ? 'end' : 'middle'}
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
                    formatter={(val: number) => [`${formatNumber(val)} formules`, 'Volume']}
                    labelFormatter={(lbl) => `Période : ${lbl}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#996F56"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#formulaColorGrad)"
                  />
                </AreaChart>
              ) : chartType === 'bar' ? (
                <BarChart data={data.data} margin={{ top: 10, right: 15, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAE2D9" vertical={false} />
                  <XAxis
                    dataKey="period"
                    stroke="#9A8573"
                    tick={{ fontSize: 11, fill: '#7A6554' }}
                    angle={data.data.length > 12 ? -45 : 0}
                    textAnchor={data.data.length > 12 ? 'end' : 'middle'}
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
                    formatter={(val: number) => [`${formatNumber(val)} formules`, 'Volume']}
                    labelFormatter={(lbl) => `Période : ${lbl}`}
                  />
                  <Bar dataKey="count" fill="#996F56" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={data.data} margin={{ top: 10, right: 15, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAE2D9" vertical={false} />
                  <XAxis
                    dataKey="period"
                    stroke="#9A8573"
                    tick={{ fontSize: 11, fill: '#7A6554' }}
                    angle={data.data.length > 12 ? -45 : 0}
                    textAnchor={data.data.length > 12 ? 'end' : 'middle'}
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
                    formatter={(val: number) => [`${formatNumber(val)} formules`, 'Volume']}
                    labelFormatter={(lbl) => `Période : ${lbl}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#996F56"
                    strokeWidth={2.5}
                    dot={{ fill: '#996F56', r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* DETAILED DATA TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">
            Détail par période ({data?.data?.length || 0} entrées)
          </h3>
          <span className="text-xs text-gray-500">
            Classé chronologiquement
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="text-left py-3 px-3">Période</th>
                <th className="text-right py-3 px-3">Nombre de Formules</th>
                <th className="text-left py-3 px-4 w-1/3">Part Relative</th>
                <th className="text-right py-3 px-3">% Total</th>
                <th className="text-right py-3 px-3">Écart Moyenne</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data?.map((row) => {
                const total = data.total || 1
                const pct = (row.count / total) * 100
                const diffFromAvg = row.count - stats.average
                const isPeak = stats.peak?.period === row.period && row.count > 0

                return (
                  <tr
                    key={row.period}
                    className={`hover:bg-gray-50 transition-colors ${
                      isPeak ? 'bg-amber-50/50 font-medium' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-gray-900 flex items-center gap-2">
                      <Calendar size={13} className="text-gray-400" />
                      {row.period}
                      {isPeak && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold">
                          <Award size={10} /> Pic
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right font-semibold text-gray-900">
                      {formatNumber(row.count)}
                    </td>

                    <td className="py-2.5 px-4">
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right text-gray-600 font-medium">
                      {formatPercent(pct)}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`font-medium ${
                          diffFromAvg > 0
                            ? 'text-emerald-600'
                            : diffFromAvg < 0
                            ? 'text-gray-400'
                            : 'text-gray-600'
                        }`}
                      >
                        {diffFromAvg > 0 ? `+${formatNumber(Math.round(diffFromAvg))}` : formatNumber(Math.round(diffFromAvg))}
                      </span>
                    </td>
                  </tr>
                )
              })}

              {(!data?.data || data.data.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Aucune formule enregistrée sur cette période
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
