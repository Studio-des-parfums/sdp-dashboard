// sdp-dashboard/src/pages/aglae/analytics/AnalyticsAteliersPage.tsx

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
  PieChart,
  Pie,
} from 'recharts'
import {
  Building2,
  Download,
  Sparkles,
} from 'lucide-react'
import { analyticsApi } from '../../../api/analyticsClient'
import type { TopAtelierItem } from '../../../types/analytics'
import { formatNumber, formatPercent, exportToCSV } from './analyticsUtils'

interface AnalyticsAteliersPageProps {
  dateFrom: string
  dateTo: string
}

// Palette harmonieuse de la Maison pour distinguer les 3 ateliers du Studio :
// Atelier 1 (Ambre cuiré signature), Atelier 2 (Miel doré), Atelier 3 (Cèdre chaud).
const ATELIER_COLORS = [
  '#996F56', // Ambre cuiré signature SDP (#1)
  '#D97706', // Miel doré (#2)
  '#855D47', // Cèdre chaud (#3)
]

export const AnalyticsAteliersPage: React.FC<AnalyticsAteliersPageProps> = ({
  dateFrom,
  dateTo,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ateliers, setAteliers] = useState<TopAtelierItem[]>([])

  /**
   * Charge le palmarès des ateliers auprès du backend FastAPI.
   * L'API groupe par nom d'atelier et compte les formules validées associées.
   */
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await analyticsApi.getTopAteliers({
        limit: 10,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setAteliers(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de chargement'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Recharger lors de toute modification du filtre temporel
  useEffect(() => {
    loadData()
  }, [dateFrom, dateTo])

  // Volume total cumulé sur l'ensemble des 3 ateliers
  const totalFormulas = useMemo(() => {
    return ateliers.reduce((acc, a) => acc + a.count, 0)
  }, [ateliers])

  // Atelier leader (1ère position du palmarès trié par volume décroissant)
  const topAtelier = ateliers[0]

  // FORMATAGE DES DONNÉES DU GRAPHIQUE EN DONUT :
  // Associe à chaque atelier sa couleur identitaire et sa part de marché relative en %
  const pieData = useMemo(() => {
    return ateliers.map((a, idx) => ({
      name: a.atelier_name,
      value: a.count,
      color: ATELIER_COLORS[idx % ATELIER_COLORS.length],
      pct: totalFormulas > 0 ? (a.count / totalFormulas) * 100 : 0,
    }))
  }, [ateliers, totalFormulas])

  /**
   * Export CSV des 3 ateliers avec volumes et quotes-parts calculées
   */
  const handleExport = () => {
    const exportRows = ateliers.map((a, idx) => ({
      Rang: idx + 1,
      ID_Atelier: a.atelier_id ?? 'N/A',
      Nom_Atelier: a.atelier_name,
      Nombre_Formules: a.count,
      Part_Pourcentage: `${((a.count / (totalFormulas || 1)) * 100).toFixed(2)}%`,
    }))
    exportToCSV(`sdp_ateliers_${dateFrom || 'debut'}_${dateTo || 'fin'}`, exportRows)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-gray-200 rounded-xl" />
          <div className="h-72 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
        <p className="font-semibold mb-2">Erreur de chargement des ateliers</p>
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
            <Building2 size={20} className="text-indigo-600" />
            Fréquentation des Ateliers Olfactifs
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Analyse comparative des 3 ateliers de création du Studio des Parfums
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={ateliers.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* TRIPTYQUE : LES 3 ATELIERS EN HERO CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {ateliers.slice(0, 3).map((atelier, idx) => {
          const pct = totalFormulas > 0 ? (atelier.count / totalFormulas) * 100 : 0
          const color = ATELIER_COLORS[idx % ATELIER_COLORS.length]
          const isLeader = idx === 0

          return (
            <div
              key={atelier.atelier_id || idx}
              className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col justify-between transition-all duration-200 ${
                isLeader
                  ? 'border-indigo-400 ring-2 ring-indigo-500/10'
                  : 'border-gray-200'
              }`}
            >
              <div>
                {/* Header card with medal */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Rang #{idx + 1}
                    </span>
                  </div>

                  {isLeader && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      <Sparkles size={10} /> Plus demandé
                    </span>
                  )}
                </div>

                {/* Atelier name */}
                <h3 className="text-sm font-bold text-gray-900 mb-3 min-h-[36px] flex items-center">
                  {atelier.atelier_name}
                </h3>

                {/* Big Metric */}
                <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  {formatNumber(atelier.count)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">formules créées</p>
              </div>

              {/* Progress gauge & share */}
              <div className="mt-5 pt-3.5 border-t border-gray-100">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-gray-500 font-medium">Part des créations :</span>
                  <span className="font-bold text-gray-900">{formatPercent(pct)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: `${Math.max(4, Math.min(100, pct))}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}

        {ateliers.length === 0 && (
          <div className="col-span-3 bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            Aucune donnée d'atelier enregistrée pour cette période
          </div>
        )}
      </div>

      {/* VISUAL COMPARISON : DONUT & BAR CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">
                Part de marché des ateliers
              </h3>
              <span className="text-xs text-gray-500">
                {formatNumber(totalFormulas)} formules au total
              </span>
            </div>

            {totalFormulas === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-xs">
                Aucune formule
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${formatNumber(val)} formules`, 'Volume']}
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

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-around gap-2 text-xs">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-700 truncate max-w-[130px]" title={item.name}>
                  {item.name} :
                </span>
                <span className="font-bold text-gray-900">{formatPercent(item.pct)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart Comparatif direct */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">
                Comparatif des volumes
              </h3>
              <span className="text-xs text-gray-500">Formules par atelier</span>
            </div>

            {ateliers.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-xs">
                Aucune donnée
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ateliers}
                    margin={{ top: 15, right: 15, left: 0, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAE2D9" vertical={false} />
                    <XAxis
                      dataKey="atelier_name"
                      stroke="#9A8573"
                      tick={{ fontSize: 11, fill: '#7A6554' }}
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
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {ateliers.map((_, idx) => (
                        <Cell
                          key={`bar-${idx}`}
                          fill={ATELIER_COLORS[idx % ATELIER_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Atelier leader : <strong className="text-gray-900">{topAtelier?.atelier_name || '—'}</strong></span>
            <span className="font-semibold text-indigo-600">{formatPercent(topAtelier ? (topAtelier.count / (totalFormulas || 1)) * 100 : 0)} de part</span>
          </div>
        </div>
      </div>

      {/* COMPACT SUMMARY TABLE (3 ROWS) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 mb-4">
          Récapitulatif des 3 ateliers
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                <th className="text-left py-3 px-4">Rang</th>
                <th className="text-left py-3 px-4">Nom de l'atelier</th>
                <th className="text-center py-3 px-4">Identifiant</th>
                <th className="text-right py-3 px-4">Nombre de formules</th>
                <th className="text-left py-3 px-6 w-1/3">Part relative</th>
                <th className="text-right py-3 px-4">% Part</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ateliers.map((a, idx) => {
                const pct = totalFormulas > 0 ? (a.count / totalFormulas) * 100 : 0
                const color = ATELIER_COLORS[idx % ATELIER_COLORS.length]

                return (
                  <tr key={a.atelier_id || idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-700">
                      {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : '🥉 #3'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span>{a.atelier_name}</span>
                    </td>
                    <td className="py-3 px-4 text-center text-gray-400">
                      {a.atelier_id !== null ? a.atelier_id : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {formatNumber(a.count)}
                    </td>
                    <td className="py-3 px-6">
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-2.5 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, pct)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
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
