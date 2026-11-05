// sdp-dashboard/src/pages/lylo/lyloAnalyticsUtils.ts

/**
 * Palette chromatique harmonieuse et accessible conforme aux directives de design
 */
export const ANALYTICS_PALETTE = [
  '#6366F1', // Indigo (Primaire)
  '#8B5CF6', // Violet
  '#EC4899', // Rose
  '#3B82F6', // Bleu
  '#10B981', // Émeraude (Succès)
  '#F59E0B', // Ambre (Alerte / Attrait)
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Citron vert
  '#64748B', // Ardoise / Neutre
]

export const FORMULA_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; badgeClass: string; description: string }
> = {
  mix: {
    label: 'Mix Équilibré',
    color: '#8B5CF6',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Équilibre subtil entre fraîcheur et intensité',
  },
  frais: {
    label: 'Frais & Léger',
    color: '#3B82F6',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Accords hespéridés, verts et aériens',
  },
  puissant: {
    label: 'Puissant & Intense',
    color: '#F59E0B',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Sillages profonds, boisés et orientaux',
  },
  autre: {
    label: 'Autre / Non défini',
    color: '#94A3B8',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    description: 'Formules personnalisées ou données historiques',
  },
}

export const LANGUAGE_LABELS: Record<string, { label: string; flag: string }> = {
  fr: { label: 'Français (FR)', flag: '🇫🇷' },
  en: { label: 'English (EN)', flag: '🇬🇧' },
  es: { label: 'Español (ES)', flag: '🇪🇸' },
  de: { label: 'Deutsch (DE)', flag: '🇩🇪' },
  it: { label: 'Italiano (IT)', flag: '🇮🇹' },
  ar: { label: 'العربية (AR)', flag: '🇦🇪' },
  inconnu: { label: 'Non renseigné', flag: '🌐' },
}

/**
 * Formate un nombre selon les conventions typographiques françaises (ex: 1 240)
 */
export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '0'
  }
  return Number(value).toLocaleString('fr-FR')
}

/**
 * Formate et sécurise un pourcentage (0 à 100%, sans NaN)
 */
export const formatPercent = (value: number | null | undefined, decimals = 1): string => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '0,0%'
  }
  const clamped = Math.min(Math.max(Number(value), 0), 100)
  return `${clamped.toFixed(decimals).replace('.', ',')}%`
}

/**
 * Formate les libellés de période du graphique temporel
 */
export const formatPeriodLabel = (period: string, granularity: 'day' | 'month' | 'year'): string => {
  if (!period) return '—'
  if (granularity === 'year') {
    return period.slice(0, 4)
  }
  if (granularity === 'month') {
    const [y, m] = period.split('-')
    if (!y || !m) return period
    const date = new Date(Number(y), Number(m) - 1, 1)
    return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
  }
  // Par jour
  const parts = period.split('-')
  if (parts.length >= 3) {
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }
  return period
}

/**
 * Accords de pluriel simples
 */
export const formatPlural = (count: number, singular: string, plural: string): string => {
  const n = Number(count) || 0
  return `${formatNumber(n)} ${n > 1 ? plural : singular}`
}
