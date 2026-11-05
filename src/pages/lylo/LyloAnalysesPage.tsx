import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertCircle,
  Award,
  BarChart2,
  Calendar,
  Compass,
  FlaskConical,
  Globe,
  Layers,
  Mic,
  PieChart as PieChartIcon,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { lyloApi } from '../../api/lyloClient'
import type {
  LyloAnalyticsSummaryResponse,
  LyloFormulaCountResponse,
  LyloGranularity,
  LyloLanguagesResponse,
  LyloModesResponse,
  LyloProfilesResponse,
  LyloTopNotesResponse,
} from '../../types/lylo'
import {
  ANALYTICS_PALETTE,
  FORMULA_TYPE_CONFIG,
  LANGUAGE_LABELS,
  formatNumber,
  formatPercent,
  formatPeriodLabel,
  formatPlural,
} from './lyloAnalyticsUtils'

type DatePreset = 'all' | '7d' | '30d' | 'this_year'

export default function LyloAnalysesPage() {
  // --- Étage 1 : Filtres et fenêtre d'analyse ---
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [activePreset, setActivePreset] = useState<DatePreset>('all')

  // Granularité et type de visualisation chronologique
  const [granularity, setGranularity] = useState<LyloGranularity>('day')
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area')

  // Filtres de notes olfactives
  const [noteCategory, setNoteCategory] = useState<'all' | 'top' | 'heart' | 'base'>('all')
  const [noteLimit, setNoteLimit] = useState<number>(10)

  // États de chargement indépendants
  const [loadingGeneral, setLoadingGeneral] = useState<boolean>(true)
  const [loadingCounts, setLoadingCounts] = useState<boolean>(true)
  const [loadingNotes, setLoadingNotes] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [formulaCounts, setFormulaCounts] = useState<LyloFormulaCountResponse | null>(null)
  const [topNotes, setTopNotes] = useState<LyloTopNotesResponse | null>(null)
  const [profiles, setProfiles] = useState<LyloProfilesResponse | null>(null)
  const [modes, setModes] = useState<LyloModesResponse | null>(null)
  const [languages, setLanguages] = useState<LyloLanguagesResponse | null>(null)
  const [summary, setSummary] = useState<LyloAnalyticsSummaryResponse | null>(null)

  // Caches mémoires côté client pour navigation instantanée (0ms) entre onglets et granularités
  const notesClientCache = useRef<Map<string, LyloTopNotesResponse>>(new Map())
  const countsClientCache = useRef<Map<string, LyloFormulaCountResponse>>(new Map())
  const generalClientCache = useRef<Map<string, any>>(new Map())

  // Application des presets de période
  const applyPreset = (preset: DatePreset) => {
    setActivePreset(preset)
    const today = new Date()
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    if (preset === 'all') {
      setDateFrom('')
      setDateTo('')
      setGranularity('month')
    } else if (preset === '7d') {
      const past = new Date(today)
      past.setDate(today.getDate() - 7)
      setDateFrom(fmt(past))
      setDateTo(fmt(today))
      setGranularity('day')
    } else if (preset === '30d') {
      const past = new Date(today)
      past.setDate(today.getDate() - 30)
      setDateFrom(fmt(past))
      setDateTo(fmt(today))
      setGranularity('day')
    } else if (preset === 'this_year') {
      const start = new Date(today.getFullYear(), 0, 1)
      setDateFrom(fmt(start))
      setDateTo(fmt(today))
      setGranularity('month')
    }
  }

  // 1. Chargement des données générales (KPIs, profils, modes, types, langues)
  const fetchGeneral = useCallback(async (nocache = false) => {
    const cacheKey = `general:${dateFrom}:${dateTo}`
    if (!nocache && generalClientCache.current.has(cacheKey)) {
      const cached = generalClientCache.current.get(cacheKey)
      setProfiles(cached.profiles)
      setModes(cached.modes)
      setLanguages(cached.languages)
      setSummary(cached.summary)
      setLoadingGeneral(false)
      return
    }

    setLoadingGeneral(true)
    setError(null)
    try {
      const dateParams = {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        nocache,
      }
      const [profilesRes, modesRes, langsRes, sumRes] = await Promise.all([
        lyloApi.getAnalyticsTopProfiles({ ...dateParams, limit: 10 }),
        lyloApi.getAnalyticsModes(dateParams),
        lyloApi.getAnalyticsLanguages(dateParams),
        lyloApi.getAnalyticsSummary(dateParams),
      ])
      setProfiles(profilesRes)
      setModes(modesRes)
      setLanguages(langsRes)
      setSummary(sumRes)
      generalClientCache.current.set(cacheKey, {
        profiles: profilesRes,
        modes: modesRes,
        languages: langsRes,
        summary: sumRes,
      })
    } catch (err) {
      console.error('Erreur chargement analytics généraux:', err)
      setError(err instanceof Error ? err.message : 'Impossible de récupérer les statistiques analytiques.')
    } finally {
      setLoadingGeneral(false)
    }
  }, [dateFrom, dateTo])

  // 2. Chargement du graphique chronologique (indépendant)
  const fetchCounts = useCallback(async (nocache = false) => {
    const cacheKey = `counts:${granularity}:${dateFrom}:${dateTo}`
    if (!nocache && countsClientCache.current.has(cacheKey)) {
      setFormulaCounts(countsClientCache.current.get(cacheKey)!)
      setLoadingCounts(false)
      return
    }

    setLoadingCounts(true)
    try {
      const dateParams = {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        nocache,
      }
      const countsRes = await lyloApi.getAnalyticsFormulaCounts({ ...dateParams, group_by: granularity })
      setFormulaCounts(countsRes)
      countsClientCache.current.set(cacheKey, countsRes)
    } catch (err) {
      console.error('Erreur chargement chronologie:', err)
    } finally {
      setLoadingCounts(false)
    }
  }, [dateFrom, dateTo, granularity])

  // 3. Chargement des notes olfactives (strictement indépendant des autres blocs)
  const fetchNotes = useCallback(async (nocache = false) => {
    const cacheKey = `notes:${noteCategory}:${noteLimit}:${dateFrom}:${dateTo}`
    if (!nocache && notesClientCache.current.has(cacheKey)) {
      setTopNotes(notesClientCache.current.get(cacheKey)!)
      setLoadingNotes(false)
      return
    }

    setLoadingNotes(true)
    try {
      const dateParams = {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        nocache,
      }
      const notesRes = await lyloApi.getAnalyticsTopNotes({
        ...dateParams,
        category: noteCategory,
        limit: noteLimit,
      })
      setTopNotes(notesRes)
      notesClientCache.current.set(cacheKey, notesRes)
    } catch (err) {
      console.error('Erreur chargement notes olfactives:', err)
    } finally {
      setLoadingNotes(false)
    }
  }, [dateFrom, dateTo, noteCategory, noteLimit])

  // Déclencheur 1 : Les filtres temporels globaux rechargent les 3 sections
  useEffect(() => {
    fetchGeneral()
  }, [fetchGeneral])

  // Déclencheur 2 : Le graphique temporel se recharge uniquement si ses dates ou sa granularité changent
  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  // Déclencheur 3 : Les notes olfactives se rechargent UNIQUEMENT si la strate, la limite ou les dates changent
  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // Rafraîchissement complet manuel (vide les caches et force le recalcul serveur)
  const handleRefreshAll = () => {
    notesClientCache.current.clear()
    countsClientCache.current.clear()
    generalClientCache.current.clear()
    fetchGeneral(true)
    fetchCounts(true)
    fetchNotes(true)
  }

  // KPIs synthétiques consolidés
  const kpis = useMemo(() => {
    const total = summary?.total_formulas ?? formulaCounts?.total ?? 0
    const topProfile = summary?.profiles?.[0] || profiles?.data?.[0]
    const topMode = summary?.modes?.[0] || modes?.data?.[0]
    const topType = summary?.formula_types?.[0]

    return {
      total,
      topProfile,
      topMode,
      topType,
    }
  }, [summary, formulaCounts, profiles, modes])

  const isRefreshing = loadingGeneral || loadingCounts || loadingNotes

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* ==================================================================== */}
      {/* ÉTAGE 1 : EN-TÊTE & BARRE DE CONTRÔLE GLOBALE                       */}
      {/* ==================================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Consultation & Analyses
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 px-3 py-0.5 text-xs font-semibold text-indigo-700 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Lylo Parfums
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Métriques d'activité, profilage olfactif, notes recommandées et modes d'interaction.
            </p>
          </div>

          {/* Bouton d'actualisation manuelle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              title="Rafraîchir les métriques"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-indigo-600' : 'text-gray-500'}`} />
              <span>{isRefreshing ? 'Chargement…' : 'Actualiser'}</span>
            </button>
          </div>
        </div>

        {/* Barre de contrôle des dates */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {/* Raccourcis de périodes */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 mr-1">
              <Calendar className="h-3.5 w-3.5 text-gray-400" /> Période :
            </span>
            {(
              [
                { id: 'all', label: 'Tout l’historique' },
                { id: '7d', label: '7 derniers jours' },
                { id: '30d', label: '30 derniers jours' },
                { id: 'this_year', label: 'Cette année' },
              ] as const
            ).map((preset) => {
              const isActive = activePreset === preset.id && !dateFrom && !dateTo
                ? preset.id === 'all'
                : activePreset === preset.id

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          {/* Date Picker libre */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <span className="text-gray-400">Du</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setActivePreset('all')
                }}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-gray-400">au</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setActivePreset('all')
                }}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => applyPreset('all')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2 transition-colors"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bannière d'erreur non bloquante */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3 shadow-sm">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-800">Erreur de communication avec le serveur Lylo :</p>
            <p className="mt-0.5 text-red-600">{error}</p>
            <button
              type="button"
              onClick={handleRefreshAll}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-800 underline hover:text-red-950"
            >
              <RefreshCw className="h-3 w-3" /> Réessayer la requête
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ÉTAGE 2 : RUBAN DE CARTES KPI (EXECUTIVE SUMMARY)                    */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 : Volume global */}
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Formules générées
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <FlaskConical className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            {loadingGeneral ? (
              <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
            ) : (
              <h3 className="text-3xl font-extrabold tracking-tight text-gray-900">
                {formatNumber(kpis.total)}
              </h3>
            )}
            <p className="mt-1.5 text-xs text-gray-500">
              {dateFrom || dateTo ? 'Sur la période sélectionnée' : 'Depuis le début du projet'}
            </p>
          </div>
        </div>

        {/* KPI 2 : Profil Leader */}
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Profil Olfactif N°1
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            {loadingGeneral ? (
              <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
            ) : (
              <h3 className="text-2xl font-bold tracking-tight text-gray-900 truncate" title={kpis.topProfile?.profile}>
                {kpis.topProfile ? kpis.topProfile.profile : 'Aucun'}
              </h3>
            )}
            <p className="mt-1.5 text-xs font-medium text-purple-700">
              {kpis.topProfile
                ? `${formatPercent(kpis.topProfile.percentage)} (${formatPlural(kpis.topProfile.count, 'formule', 'formules')})`
                : 'Aucune création'}
            </p>
          </div>
        </div>

        {/* KPI 3 : Canal / Mode dominant */}
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Canal Privilégié
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              {kpis.topMode?.mode === 'voice' ? <Mic className="h-5 w-5" /> : <Layers className="h-5 w-5" />}
            </div>
          </div>
          <div className="mt-4">
            {loadingGeneral ? (
              <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
            ) : (
              <h3 className="text-2xl font-bold tracking-tight text-gray-900">
                {kpis.topMode ? (kpis.topMode.mode === 'quiz' ? 'Quiz interactif' : 'Vocal / Voice') : '—'}
              </h3>
            )}
            <p className="mt-1.5 text-xs font-medium text-blue-700">
              {kpis.topMode
                ? `${formatPercent(kpis.topMode.percentage)} (${formatPlural(kpis.topMode.count, 'session', 'sessions')})`
                : '—'}
            </p>
          </div>
        </div>

        {/* KPI 4 : Catégorie phare */}
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Formule Phare
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            {loadingGeneral ? (
              <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
            ) : (
              <h3 className="text-2xl font-bold tracking-tight text-gray-900">
                {kpis.topType ? (FORMULA_TYPE_CONFIG[kpis.topType.formula_type]?.label ?? kpis.topType.formula_type) : '—'}
              </h3>
            )}
            <p className="mt-1.5 text-xs font-medium text-amber-700">
              {kpis.topType ? `${formatPercent(kpis.topType.percentage)} du catalogue généré` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ÉTAGE 3 : GRAPHIQUE CHRONOLOGIQUE CENTRAL (TIME-SERIES)              */}
      {/* ==================================================================== */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-gray-900">
                Évolution chronologique des formules
              </h2>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Volume et tendance des créations de parfums par jour, mois ou année.
            </p>
          </div>

          {/* Double sélecteur : Granularité & Type de visualisation */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Granularité temporelle */}
            <div className="flex items-center rounded-lg bg-gray-100 p-1">
              {(
                [
                  { id: 'day', label: 'Jour' },
                  { id: 'month', label: 'Mois' },
                  { id: 'year', label: 'Année' },
                ] as const
              ).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGranularity(g.id)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    granularity === g.id
                      ? 'bg-white text-gray-900 shadow-sm font-semibold'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Visualisation (Aire, Barres, Courbe) */}
            <div className="flex items-center rounded-lg bg-gray-100 p-1">
              {(
                [
                  { id: 'area', label: 'Aire' },
                  { id: 'bar', label: 'Barres' },
                  { id: 'line', label: 'Courbe' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setChartType(t.id)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    chartType === t.id
                      ? 'bg-white text-gray-900 shadow-sm font-semibold'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Zone de rendu Recharts */}
        <div className="mt-6 h-80 w-full">
          {loadingCounts ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-400">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
              <span>Chargement des statistiques chronologiques…</span>
            </div>
          ) : !formulaCounts?.data || formulaCounts.data.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-400">
              <Calendar className="h-8 w-8 text-gray-300" />
              <p className="font-medium text-gray-600">Aucune donnée enregistrée sur cette période</p>
              <p className="text-xs text-gray-400">Essayez d'élargir la plage de dates ci-dessus.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={formulaCounts.data} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="lyloAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="period"
                    stroke="#94A3B8"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => formatPeriodLabel(val, granularity)}
                  />
                  <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      color: '#FFFFFF',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#94A3B8', fontWeight: 600, fontSize: '12px' }}
                    itemStyle={{ color: '#FFFFFF', fontSize: '12px' }}
                    labelFormatter={(val) => `Période : ${formatPeriodLabel(String(val), granularity)}`}
                    formatter={(val: any) => [
                      formatPlural(Number(val), 'formule générée', 'formules générées'),
                      'Créations',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366F1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#lyloAreaGradient)"
                  />
                </AreaChart>
              ) : chartType === 'bar' ? (
                <BarChart data={formulaCounts.data} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="period"
                    stroke="#94A3B8"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => formatPeriodLabel(val, granularity)}
                  />
                  <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      color: '#FFFFFF',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#94A3B8', fontWeight: 600, fontSize: '12px' }}
                    itemStyle={{ color: '#FFFFFF', fontSize: '12px' }}
                    labelFormatter={(val) => `Période : ${formatPeriodLabel(String(val), granularity)}`}
                    formatter={(val: any) => [
                      formatPlural(Number(val), 'formule générée', 'formules générées'),
                      'Créations',
                    ]}
                  />
                  <Bar dataKey="count" fill="#6366F1" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={formulaCounts.data} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="period"
                    stroke="#94A3B8"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => formatPeriodLabel(val, granularity)}
                  />
                  <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      color: '#FFFFFF',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#94A3B8', fontWeight: 600, fontSize: '12px' }}
                    itemStyle={{ color: '#FFFFFF', fontSize: '12px' }}
                    labelFormatter={(val) => `Période : ${formatPeriodLabel(String(val), granularity)}`}
                    formatter={(val: any) => [
                      formatPlural(Number(val), 'formule générée', 'formules générées'),
                      'Créations',
                    ]}
                  />
                  <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={3} dot={{ r: 3.5, fill: '#6366F1' }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ÉTAGE 4 : BLOCS D'ANALYSE MÉTIER ET DE RÉPARTITION                   */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* BLOC 1 : Palmarès des Notes Olfactives */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Palmarès des notes olfactives
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Occurrences et taux d'apparition sur la période sélectionnée.
                </p>
              </div>

              {/* Filtres de strate olfactive & Limite */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-lg bg-gray-100 p-0.5 text-xs">
                  {(
                    [
                      { id: 'all', label: 'Toutes' },
                      { id: 'top', label: 'Tête' },
                      { id: 'heart', label: 'Cœur' },
                      { id: 'base', label: 'Fond' },
                    ] as const
                  ).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNoteCategory(c.id)}
                      className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                        noteCategory === c.id
                          ? 'bg-white text-gray-900 shadow-sm font-semibold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <select
                  value={noteLimit}
                  onChange={(e) => setNoteLimit(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={15}>Top 15</option>
                  <option value={20}>Top 20</option>
                </select>
              </div>
            </div>

            {/* Liste ordonnée avec barres de progression */}
            <div className="mt-5 space-y-3.5">
              {loadingNotes ? (
                <div className="space-y-3 py-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-6 w-full bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : !topNotes?.data || topNotes.data.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">
                  <Compass className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p>Aucune note enregistrée pour cette strate.</p>
                </div>
              ) : (
                topNotes.data.map((item, idx) => (
                  <div key={item.note} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-800 flex items-center gap-2 truncate">
                        <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-700">
                          {idx + 1}
                        </span>
                        <span className="truncate" title={item.note}>{item.note}</span>
                      </span>
                      <span className="text-gray-500 flex-shrink-0 ml-2">
                        <strong className="text-gray-900 font-semibold">{formatNumber(item.count)}</strong>{' '}
                        <span className="text-purple-600 font-medium">({formatPercent(item.percentage)})</span>
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500"
                        style={{ width: `${Math.min(Math.max(item.percentage, 0), 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* BLOC 2 : Profils Olfactifs Plébiscités (Donut + Tableau) */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="h-4 w-4 text-indigo-600" />
                  Profils olfactifs plébiscités
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Répartition des archétypes de personnalités olfactives parmi les formules.
                </p>
              </div>
              <span className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
                Total : {formatNumber(profiles?.total ?? 0)}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Donut Chart */}
              <div className="h-56 w-full">
                {loadingGeneral ? (
                  <div className="flex h-full items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                  </div>
                ) : !profiles?.data || profiles.data.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-sm text-gray-400">
                    <PieChartIcon className="h-8 w-8 text-gray-300 mb-1" />
                    <span>Aucun profil détecté</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={profiles.data.slice(0, 6)}
                        dataKey="count"
                        nameKey="profile"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {profiles.data.slice(0, 6).map((_, index) => (
                          <Cell key={`profile-cell-${index}`} fill={ANALYTICS_PALETTE[index % ANALYTICS_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '8px',
                          border: '1px solid #334155',
                          color: '#FFFFFF',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                          fontSize: '12px',
                        }}
                        itemStyle={{ color: '#FFFFFF', fontSize: '12px' }}
                        formatter={(val: any, name: any) => [
                          formatPlural(Number(val), 'formule', 'formules'),
                          String(name ?? ''),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Liste détaillée avec puces colorées */}
              <div className="space-y-2.5">
                {profiles?.data?.slice(0, 6).map((p, index) => (
                  <div key={p.profile} className="flex items-center justify-between text-xs py-0.5">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ANALYTICS_PALETTE[index % ANALYTICS_PALETTE.length] }}
                      />
                      <span className="font-medium text-gray-800 truncate" title={p.profile}>
                        {p.profile}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className="text-gray-400 font-mono text-[11px]">{formatNumber(p.count)}</span>
                      <span className="font-semibold text-gray-900 w-12 text-right">
                        {formatPercent(p.percentage)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grille 3 colonnes : Modes, Types de Formules, Langues */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* BLOC 3 : Modes d'interaction */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Mic className="h-4 w-4 text-blue-600" />
                Modes d'interaction
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Proportion d'utilisation entre le parcours interactif et l'assistant vocal.
              </p>
            </div>

            <div className="mt-4 space-y-3.5">
              {modes?.data?.map((m) => {
                const isQuiz = m.mode === 'quiz'
                return (
                  <div
                    key={m.mode}
                    className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 transition-all hover:border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            isQuiz ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {isQuiz ? <Layers className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {isQuiz ? 'Quiz Interactif' : 'Assistant Vocal'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatPlural(m.count, 'session réalisée', 'sessions réalisées')}
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-extrabold text-gray-900">
                        {formatPercent(m.percentage)}
                      </span>
                    </div>

                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isQuiz ? 'bg-indigo-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(Math.max(m.percentage, 0), 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* BLOC 4 : Types de formules */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                Types de formules
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Équilibre entre accords frais, puissants ou mélangés.
              </p>
            </div>

            <div className="mt-4 space-y-3.5">
              {summary?.formula_types?.map((item) => {
                const conf = FORMULA_TYPE_CONFIG[item.formula_type] ?? FORMULA_TYPE_CONFIG.autre
                return (
                  <div key={item.formula_type} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-800 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: conf.color }} />
                        <span>{conf.label}</span>
                      </span>
                      <span className="text-gray-500">
                        <strong className="text-gray-900 font-semibold">{formatNumber(item.count)}</strong>{' '}
                        <span>({formatPercent(item.percentage)})</span>
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(Math.max(item.percentage, 0), 100)}%`,
                          backgroundColor: conf.color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* BLOC 5 : Répartition linguistique */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-600" />
                Répartition linguistique
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Langues choisies lors des parcours de création.
              </p>
            </div>

            <div className="mt-4 space-y-3.5">
              {languages?.data?.map((lang) => {
                const conf = LANGUAGE_LABELS[lang.language] ?? {
                  label: lang.language.toUpperCase(),
                  flag: '🌐',
                }
                return (
                  <div key={lang.language} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-800 flex items-center gap-2">
                        <span className="text-sm">{conf.flag}</span>
                        <span>{conf.label}</span>
                      </span>
                      <span className="text-gray-500">
                        <strong className="text-gray-900 font-semibold">{formatNumber(lang.count)}</strong>{' '}
                        <span className="text-emerald-700 font-medium">({formatPercent(lang.percentage)})</span>
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(Math.max(lang.percentage, 0), 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
