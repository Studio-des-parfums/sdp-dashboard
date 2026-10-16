// sdp-dashboard/src/pages/aglae/analytics/AnalyticsOptionsPage.tsx

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
  Gift,
  Award,
  Search,
  Download,
  Sparkles,
  Package,
  Wine,
} from 'lucide-react'
import { analyticsApi } from '../../../api/analyticsClient'
import type { TopOptionItem } from '../../../types/analytics'
import { formatNumber, formatPercent, SDP_COLORS, exportToCSV } from './analyticsUtils'

interface AnalyticsOptionsPageProps {
  dateFrom: string
  dateTo: string
}

export const AnalyticsOptionsPage: React.FC<AnalyticsOptionsPageProps> = ({
  dateFrom,
  dateTo,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [options, setOptions] = useState<TopOptionItem[]>([])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await analyticsApi.getTopOptions({
        limit,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setOptions(res)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de chargement'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [limit, dateFrom, dateTo])

  // FILTRAGE DYNAMIQUE DES OPTIONS PAR RECHERCHE :
  // Filtre la liste des compléments souscrits en temps réel (insensible à la casse)
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options
    const term = searchTerm.toLowerCase()
    return options.filter((o) => o.option_name.toLowerCase().includes(term))
  }, [options, searchTerm])

  // Volume global cumulé de l'ensemble des options souscrites
  const totalCount = useMemo(() => {
    return options.reduce((acc, o) => acc + o.count, 0)
  }, [options])

  // Option la plus populaire (#1 du classement)
  const topOption = options[0]

  /**
   * Export CSV des options choisies avec rang, volume et part en pourcentage
   */
  const handleExport = () => {
    const exportRows = filteredOptions.map((o, idx) => ({
      Rang: idx + 1,
      Nom_Option: o.option_name,
      Occurrences: o.count,
      Part_Pourcentage: `${((o.count / (totalCount || 1)) * 100).toFixed(2)}%`,
    }))
    exportToCSV(`sdp_options_${dateFrom || 'debut'}_${dateTo || 'fin'}`, exportRows)
  }

  // RÉSOLUTION CONTEXTUELLE DE L'ICÔNE :
  // Associe dynamiquement un pictogramme pertinent selon l'intitulé de l'option
  // (ex: coupe pour le champagne, flacon pour le verre/bouteille, étincelle pour le ruban)
  const getOptionIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('champagne')) return Wine
    if (n.includes('flacon') || n.includes('bouteille')) return Package
    if (n.includes('ruban')) return Sparkles
    return Gift
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Gift size={20} className="text-indigo-600" />
            Options & Extras Choisis lors de la Formulation
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Classement des compléments souscrits (flacons murano, rubans personnalisés, champagne, coffrets cadeaux...)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une option..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Limit selector */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-medium">
            {[10, 20, 50].map((lim) => (
              <button
                key={lim}
                type="button"
                onClick={() => setLimit(lim)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  limit === lim
                    ? 'bg-white text-gray-900 shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Top {lim}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredOptions.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Download size={13} />
            CSV
          </button>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Option Leader */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-indigo-700 font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
            <Award size={13} /> Option Préférée
          </span>
          <div className="text-lg font-bold text-gray-900 tracking-tight truncate">
            {topOption?.option_name || '—'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {topOption
              ? `${formatNumber(topOption.count)} fois (${formatPercent(
                  (topOption.count / (totalCount || 1)) * 100
                )})`
              : '—'}
          </p>
        </div>

        {/* Total Sélections */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Total Extras Choisis
          </span>
          <div className="text-2xl font-bold text-indigo-600 tracking-tight">
            {formatNumber(totalCount)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Sur la période sélectionnée</p>
        </div>

        {/* Variétés d'options */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Types d'Options
          </span>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {options.length}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Options distinctes proposées</p>
        </div>

        {/* Part top 3 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Part du Top 3
          </span>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatPercent(
              totalCount > 0
                ? (options.slice(0, 3).reduce((acc, o) => acc + o.count, 0) / totalCount) * 100
                : 0
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Pénétration des 3 favoris</p>
        </div>
      </div>

      {/* TOP OPTIONS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.slice(0, 3).map((opt, idx) => {
          const Icon = getOptionIcon(opt.option_name)
          const pct = (opt.count / (totalCount || 1)) * 100
          return (
            <div
              key={opt.option_name}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </span>
                  <span className="p-1.5 bg-gray-50 text-gray-500 rounded-md">
                    <Icon size={16} />
                  </span>
                </div>
                <h4 className="text-sm font-bold text-gray-900">{opt.option_name}</h4>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {formatNumber(opt.count)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">formules avec cet extra</p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500">Part de marché</span>
                <span className="font-semibold text-indigo-600">{formatPercent(pct)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* CHART & TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 mb-4">
          Comparatif des options
        </h3>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <div className="h-64 flex items-center justify-center text-red-600 text-sm">
            {error}
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            Aucune option trouvée
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredOptions.slice(0, 10)}
                margin={{ top: 10, right: 15, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE2D9" vertical={false} />
                <XAxis dataKey="option_name" stroke="#9A8573" tick={{ fontSize: 11, fill: '#7A6554' }} tickLine={false} />
                <YAxis stroke="#9A8573" tick={{ fontSize: 11, fill: '#7A6554' }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #EAE2D9',
                    borderRadius: 8,
                    fontSize: '12px',
                  }}
                  formatter={(val: number) => [`${formatNumber(val)} fois`, 'Occurrences']}
                />
                <Bar dataKey="count" fill="#996F56" radius={[4, 4, 0, 0]}>
                  {filteredOptions.slice(0, 10).map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={SDP_COLORS[idx % SDP_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 mb-4">
          Détail complet des options ({filteredOptions.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                <th className="text-left py-2.5 px-3">Rang</th>
                <th className="text-left py-2.5 px-3">Option</th>
                <th className="text-right py-2.5 px-3">Sélections</th>
                <th className="text-left py-2.5 px-4 w-1/3">Part</th>
                <th className="text-right py-2.5 px-3">% Part</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOptions.map((opt, idx) => {
                const pct = (opt.count / (totalCount || 1)) * 100
                return (
                  <tr key={opt.option_name} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 text-gray-600 font-medium">#{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{opt.option_name}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                      {formatNumber(opt.count)}
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

              {filteredOptions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Aucune option ne correspond à votre recherche
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
