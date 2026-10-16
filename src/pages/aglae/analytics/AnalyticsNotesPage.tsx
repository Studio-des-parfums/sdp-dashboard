// sdp-dashboard/src/pages/aglae/analytics/AnalyticsNotesPage.tsx

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
  Sparkles,
  Search,
  Download,
  Award,
} from 'lucide-react'
import { analyticsApi } from '../../../api/analyticsClient'
import type { TopNotesResponse, TopNoteItem, NoteType } from '../../../types/analytics'
import { formatNumber, formatPercent, getNoteColor, exportToCSV } from './analyticsUtils'

interface AnalyticsNotesPageProps {
  dateFrom: string
  dateTo: string
}

type TabCategory = 'all' | NoteType

export const AnalyticsNotesPage: React.FC<AnalyticsNotesPageProps> = ({
  dateFrom,
  dateTo,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(30)
  const [activeTab, setActiveTab] = useState<TabCategory>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [notesData, setNotesData] = useState<TopNotesResponse | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await analyticsApi.getTopNotes({
        limit,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setNotesData(res)
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

  // EXTRACTION DE LA LISTE SELON L'ONGLET DE LA PYRAMIDE OLFACTIVE SÉLECTIONNÉ :
  // L'API renvoie un objet décomposé par niveau de pyramide :
  // all (toutes), top_note (tête), heart_note (cœur), base_note (fond), booster_note (boosters)
  const currentList: TopNoteItem[] = useMemo(() => {
    if (!notesData) return []
    if (activeTab === 'all') return notesData.all || []
    if (activeTab === 'top_note') return notesData.top_note || []
    if (activeTab === 'heart_note') return notesData.heart_note || []
    if (activeTab === 'base_note') return notesData.base_note || []
    if (activeTab === 'booster_note') return notesData.booster_note || []
    return []
  }, [notesData, activeTab])

  // FILTRAGE PAR RECHERCHE TEXTUELLE EN TEMPS RÉEL :
  // Recherche insensible aux majuscules/minuscules sur le nom de l'essence ou de la note
  const filteredNotes = useMemo(() => {
    if (!searchTerm.trim()) return currentList
    const term = searchTerm.toLowerCase()
    return currentList.filter((n) => n.name.toLowerCase().includes(term))
  }, [currentList, searchTerm])

  // Total cumulé des sélections d'essences dans la catégorie affichée
  const totalCount = useMemo(() => {
    return currentList.reduce((acc, item) => acc + item.count, 0)
  }, [currentList])

  // Essence olfactive n°1 (la plus demandée)
  const topNote = currentList[0]

  // INDICE DE CONCENTRATION DU TOP 5 (LOI DE PARETO) :
  // Calcule quel pourcentage du volume total de la catégorie est accaparé
  // par les 5 notes les plus populaires.
  const top5Concentration = useMemo(() => {
    const top5Sum = currentList.slice(0, 5).reduce((acc, n) => acc + n.count, 0)
    return totalCount > 0 ? (top5Sum / totalCount) * 100 : 0
  }, [currentList, totalCount])

  /**
   * Export CSV des notes filtrées avec calcul de la quote-part en pourcentage
   */
  const handleExport = () => {
    const exportRows = filteredNotes.map((n, idx) => ({
      Rang: idx + 1,
      Categorie: activeTab,
      Nom_Essence: n.name,
      Utilisations: n.count,
      Part_Pourcentage: `${((n.count / (totalCount || 1)) * 100).toFixed(2)}%`,
    }))
    exportToCSV(`sdp_notes_${activeTab}_${dateFrom || 'debut'}_${dateTo || 'fin'}`, exportRows)
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-600" />
            Pyramide Olfactive & Palmarès des Essences
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Classement des notes aromatiques les plus sélectionnées (exclut automatiquement les slots vides ou non renseignés)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Limit selector */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-medium">
            {[20, 50, 100].map((lim) => (
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
            disabled={filteredNotes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Download size={13} />
            CSV
          </button>
        </div>
      </div>

      {/* CATEGORY TABS (Tête, Cœur, Fond, Booster, All) */}
      <div className="flex flex-wrap items-center gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'all'
              ? 'bg-white text-gray-900 shadow-xs font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>✨ Toutes les notes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('top_note')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'top_note'
              ? 'bg-white text-gray-900 shadow-xs font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>🍃 Notes de Tête</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('heart_note')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'heart_note'
              ? 'bg-white text-gray-900 shadow-xs font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>🌸 Notes de Cœur</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('base_note')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'base_note'
              ? 'bg-white text-gray-900 shadow-xs font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>🪵 Notes de Fond</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('booster_note')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
            activeTab === 'booster_note'
              ? 'bg-white text-gray-900 shadow-xs font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>⚡ Boosters</span>
        </button>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Essence Reine */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-indigo-700 font-medium uppercase tracking-wider flex items-center gap-1 mb-1">
            <Award size={13} /> Essence Favorite
          </span>
          <div className="text-xl font-bold text-gray-900 tracking-tight truncate flex items-center gap-2">
            {topNote && (
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: getNoteColor(topNote.name) }}
              />
            )}
            <span className="truncate">{topNote?.name || '—'}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {topNote
              ? `${formatNumber(topNote.count)} utilisations (${formatPercent(
                  (topNote.count / (totalCount || 1)) * 100
                )})`
              : '—'}
          </p>
        </div>

        {/* Total Utilisations */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Utilisations Cumulées
          </span>
          <div className="text-2xl font-bold text-indigo-600 tracking-tight">
            {formatNumber(totalCount)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Sur la catégorie {activeTab}</p>
        </div>

        {/* Essences distinctes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Essences Référencées
          </span>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {currentList.length}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Dans le top affiché</p>
        </div>

        {/* Concentration Top 5 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
            Concentration Top 5
          </span>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatPercent(top5Concentration)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Part accaparée par les 5 leaders</p>
        </div>
      </div>

      {/* CHART & PYRAMID VISUAL */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-between">
          <span>Classement visuel des essences</span>
          <span className="text-xs text-gray-500 font-normal">Top 12 de la catégorie</span>
        </h3>

        {loading ? (
          <div className="h-72 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <div className="h-72 flex items-center justify-center text-red-600 text-sm">
            {error}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-gray-400 text-sm">
            Aucune note aromatique trouvée
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredNotes.slice(0, 12)}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE2D9" horizontal={false} />
                <XAxis type="number" stroke="#9A8573" tick={{ fontSize: 11, fill: '#7A6554' }} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9A8573"
                  tick={{ fontSize: 11, fill: '#7A6554' }}
                  tickLine={false}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #EAE2D9',
                    borderRadius: 8,
                    fontSize: '12px',
                  }}
                  formatter={(val: number) => [`${formatNumber(val)} fois`, 'Utilisations']}
                />
                <Bar dataKey="count" fill="#996F56" radius={[0, 4, 4, 0]}>
                  {filteredNotes.slice(0, 12).map((note) => (
                    <Cell key={`cell-${note.name}`} fill={getNoteColor(note.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* DETAILED TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 mb-4">
          Liste détaillée des notes ({filteredNotes.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
                <th className="text-left py-2.5 px-3">Rang</th>
                <th className="text-left py-2.5 px-3">Nom de l'essence</th>
                <th className="text-right py-2.5 px-3">Nombre d'utilisations</th>
                <th className="text-left py-2.5 px-4 w-1/3">Part de la sélection</th>
                <th className="text-right py-2.5 px-3">% Relatif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredNotes.map((note, idx) => {
                const pct = (note.count / (totalCount || 1)) * 100
                const noteColor = getNoteColor(note.name)
                return (
                  <tr key={note.name} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 text-gray-600 font-medium">#{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: noteColor }}
                        />
                        <span>{note.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                      {formatNumber(note.count)}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, pct)}%`,
                            backgroundColor: noteColor,
                          }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-600 font-medium">
                      {formatPercent(pct)}
                    </td>
                  </tr>
                )
              })}

              {filteredNotes.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Aucune essence ne correspond à votre recherche
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
