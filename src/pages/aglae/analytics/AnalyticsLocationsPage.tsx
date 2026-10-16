// sdp-dashboard/src/pages/aglae/analytics/AnalyticsLocationsPage.tsx

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
  Globe2,
  MapPin,
  Search,
  Download,
  Building,
  Award,
  Compass,
} from 'lucide-react'
import { analyticsApi } from '../../../api/analyticsClient'
import type { TopLocationsResponse } from '../../../types/analytics'
import { formatNumber, formatPercent, SDP_COLORS, exportToCSV } from './analyticsUtils'

interface AnalyticsLocationsPageProps {
  dateFrom: string
  dateTo: string
}

export const AnalyticsLocationsPage: React.FC<AnalyticsLocationsPageProps> = ({
  dateFrom,
  dateTo,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(25)
  const [data, setData] = useState<TopLocationsResponse | null>(null)
  const [activeTab, setActiveTab] = useState<'both' | 'countries' | 'cities'>('both')
  const [searchTerm, setSearchTerm] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await analyticsApi.getTopLocations({
        limit,
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
  }, [limit, dateFrom, dateTo])

  // FILTRAGE INSTANTANÉ DES PAYS PAR RECHERCHE :
  // Filtre la liste des pays selon la saisie utilisateur (insensible à la casse)
  const filteredCountries = useMemo(() => {
    const list = data?.top_countries || []
    if (!searchTerm.trim()) return list
    const term = searchTerm.toLowerCase()
    return list.filter((c) => c.country.toLowerCase().includes(term))
  }, [data, searchTerm])

  // FILTRAGE INSTANTANÉ DES VILLES PAR RECHERCHE :
  // Filtre la liste des villes selon la saisie utilisateur (insensible à la casse)
  const filteredCities = useMemo(() => {
    const list = data?.top_cities || []
    if (!searchTerm.trim()) return list
    const term = searchTerm.toLowerCase()
    return list.filter((c) => c.city.toLowerCase().includes(term))
  }, [data, searchTerm])

  // Volume cumulé des clients enregistrés par pays dans l'échantillon
  const totalCountryCount = useMemo(() => {
    return (data?.top_countries || []).reduce((acc, c) => acc + c.count, 0) || 1
  }, [data])

  // Volume cumulé des clients enregistrés par ville dans l'échantillon
  const totalCityCount = useMemo(() => {
    return (data?.top_cities || []).reduce((acc, c) => acc + c.count, 0) || 1
  }, [data])

  // Pays et Ville n°1 de provenance
  const topCountry = data?.top_countries?.[0]
  const topCity = data?.top_cities?.[0]

  // CALCUL DE LA PART INTERNATIONALE (RAYONNEMENT HORS FRANCE) :
  // On isole l'effectif de la France dans la liste des pays, puis on déduit
  // le ratio des clients résidant à l'étranger par rapport au total renseigné.
  const internationalPct = useMemo(() => {
    const france = (data?.top_countries || []).find(
      (c) => c.country.toLowerCase() === 'france'
    )
    const franceCount = france?.count || 0
    const nonFranceCount = Math.max(0, totalCountryCount - franceCount)
    return (nonFranceCount / totalCountryCount) * 100
  }, [data, totalCountryCount])

  /**
   * Export CSV conditionnel : exporte les villes si l'onglet 'Villes' est actif,
   * sinon exporte les pays avec le rang et le pourcentage relatif calculé.
   */
  const handleExport = () => {
    if (activeTab === 'cities') {
      const rows = filteredCities.map((c, idx) => ({
        Rang: idx + 1,
        Ville: c.city,
        Clients: c.count,
        Part_Pourcentage: `${((c.count / totalCityCount) * 100).toFixed(2)}%`,
      }))
      exportToCSV(`sdp_villes_${dateFrom || 'debut'}_${dateTo || 'fin'}`, rows)
    } else {
      const rows = filteredCountries.map((c, idx) => ({
        Rang: idx + 1,
        Pays: c.country,
        Clients: c.count,
        Part_Pourcentage: `${((c.count / totalCountryCount) * 100).toFixed(2)}%`,
      }))
      exportToCSV(`sdp_pays_${dateFrom || 'debut'}_${dateTo || 'fin'}`, rows)
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Globe2 size={20} className="text-indigo-600" />
            Répartition Géographique : Pays & Villes
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Origine géographique des clients inscrits et rayonnement international
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher pays ou ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* View Tab */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('both')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'both' ? 'bg-white text-gray-900 shadow-xs font-semibold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Vue Mixte
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('countries')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'countries' ? 'bg-white text-gray-900 shadow-xs font-semibold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pays Uniquement
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cities')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'cities' ? 'bg-white text-gray-900 shadow-xs font-semibold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Villes Uniquement
            </button>
          </div>

          {/* Limit selector */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-medium">
            {[10, 25, 50].map((lim) => (
              <button
                key={lim}
                type="button"
                onClick={() => setLimit(lim)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  limit === lim ? 'bg-white text-gray-900 shadow-xs font-semibold' : 'text-gray-600 hover:text-gray-900'
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Download size={13} />
            CSV
          </button>
        </div>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Top Pays */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-indigo-700 font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
            <Award size={13} /> Premier Pays
          </span>
          <div className="text-xl font-bold text-gray-900 tracking-tight truncate">
            {topCountry?.country || '—'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {topCountry
              ? `${formatNumber(topCountry.count)} clients (${formatPercent(
                  (topCountry.count / totalCountryCount) * 100
                )})`
              : '—'}
          </p>
        </div>

        {/* Part internationale */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-amber-700 font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
            <Compass size={13} /> Clientèle Internationale
          </span>
          <div className="text-2xl font-bold text-amber-700 tracking-tight">
            {formatPercent(internationalPct)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Résidents hors de France</p>
        </div>

        {/* Première Ville */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
            <MapPin size={13} /> Première Ville
          </span>
          <div className="text-xl font-bold text-gray-900 tracking-tight truncate">
            {topCity?.city || '—'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {topCity
              ? `${formatNumber(topCity.count)} clients (${formatPercent(
                  (topCity.count / totalCityCount) * 100
                )})`
              : '—'}
          </p>
        </div>

        {/* Territoires représentés */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Diversité Géographique
          </span>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {data?.top_countries?.length || 0} pays / {data?.top_cities?.length || 0} villes
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Dans le top sélectionné</p>
        </div>
      </div>

      {/* CHARTS (Countries & Cities) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries Bar Chart */}
        {(activeTab === 'both' || activeTab === 'countries') && (
          <div className={`bg-white border border-gray-200 rounded-xl p-6 shadow-xs ${activeTab === 'countries' ? 'lg:col-span-2' : ''}`}>
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Globe2 size={16} className="text-indigo-600" />
                Top Pays de résidence
              </span>
              <span className="text-xs text-gray-500 font-normal">Clients inscrits</span>
            </h3>

            {loading ? (
              <div className="h-72 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : error ? (
              <div className="h-72 flex items-center justify-center text-red-600 text-sm">
                {error}
              </div>
            ) : filteredCountries.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-gray-400 text-sm">
                Aucun pays trouvé
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={filteredCountries.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAE2D9" horizontal={false} />
                    <XAxis type="number" stroke="#9A8573" tick={{ fontSize: 11, fill: '#7A6554' }} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="country"
                      stroke="#9A8573"
                      tick={{ fontSize: 11, fill: '#7A6554' }}
                      tickLine={false}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#FFFFFF',
                        border: '1px solid #EAE2D9',
                        borderRadius: 8,
                        fontSize: '12px',
                      }}
                      formatter={(val: number) => [`${formatNumber(val)} clients`, 'Volume']}
                    />
                    <Bar dataKey="count" fill="#996F56" radius={[0, 4, 4, 0]}>
                      {filteredCountries.slice(0, 8).map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={SDP_COLORS[idx % SDP_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Top Cities Bar Chart */}
        {(activeTab === 'both' || activeTab === 'cities') && (
          <div className={`bg-white border border-gray-200 rounded-xl p-6 shadow-xs ${activeTab === 'cities' ? 'lg:col-span-2' : ''}`}>
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building size={16} className="text-indigo-600" />
                Top Villes de résidence
              </span>
              <span className="text-xs text-gray-500 font-normal">Clients inscrits</span>
            </h3>

            {loading ? (
              <div className="h-72 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : filteredCities.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-gray-400 text-sm">
                Aucune ville trouvée
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={filteredCities.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAE2D9" horizontal={false} />
                    <XAxis type="number" stroke="#9A8573" tick={{ fontSize: 11, fill: '#7A6554' }} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="city"
                      stroke="#9A8573"
                      tick={{ fontSize: 11, fill: '#7A6554' }}
                      tickLine={false}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#FFFFFF',
                        border: '1px solid #EAE2D9',
                        borderRadius: 8,
                        fontSize: '12px',
                      }}
                      formatter={(val: number) => [`${formatNumber(val)} clients`, 'Volume']}
                    />
                    <Bar dataKey="count" fill="#D97706" radius={[0, 4, 4, 0]}>
                      {filteredCities.slice(0, 8).map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={SDP_COLORS[(idx + 2) % SDP_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Countries Table */}
        {(activeTab === 'both' || activeTab === 'countries') && (
          <div className={`bg-white border border-gray-200 rounded-xl p-6 shadow-xs ${activeTab === 'countries' ? 'lg:col-span-2' : ''}`}>
            <h3 className="text-sm font-bold text-gray-900 mb-4">
              Classement détaillé des Pays ({filteredCountries.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                    <th className="text-left py-2 px-3">Rang</th>
                    <th className="text-left py-2 px-3">Pays</th>
                    <th className="text-right py-2 px-3">Clients</th>
                    <th className="text-left py-2 px-4 w-1/3">Part</th>
                    <th className="text-right py-2 px-3">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCountries.map((c, idx) => {
                    const pct = (c.count / totalCountryCount) * 100
                    return (
                      <tr key={c.country} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-3 text-gray-600 font-medium">#{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{c.country}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                          {formatNumber(c.count)}
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
        )}

        {/* Cities Table */}
        {(activeTab === 'both' || activeTab === 'cities') && (
          <div className={`bg-white border border-gray-200 rounded-xl p-6 shadow-xs ${activeTab === 'cities' ? 'lg:col-span-2' : ''}`}>
            <h3 className="text-sm font-bold text-gray-900 mb-4">
              Classement détaillé des Villes ({filteredCities.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                    <th className="text-left py-2 px-3">Rang</th>
                    <th className="text-left py-2 px-3">Ville</th>
                    <th className="text-right py-2 px-3">Clients</th>
                    <th className="text-left py-2 px-4 w-1/3">Part</th>
                    <th className="text-right py-2 px-3">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCities.map((c, idx) => {
                    const pct = (c.count / totalCityCount) * 100
                    return (
                      <tr key={c.city} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-3 text-gray-600 font-medium">#{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{c.city}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                          {formatNumber(c.count)}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-amber-600 h-2 rounded-full"
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
        )}
      </div>
    </div>
  )
}
