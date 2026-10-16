// sdp-dashboard/src/pages/aglae/analytics/analyticsUtils.ts

/**
 * Formate un objet Date JavaScript en chaîne au format ISO YYYY-MM-DD
 * compatible avec les paramètres attendus par l'API FastAPI backend.
 */
export const formatDateToYMD = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Génère les raccourcis de plages temporelles usuelles :
 * - 30 derniers jours (glissant depuis aujourd'hui)
 * - Ce mois-ci (du 1er du mois courant jusqu'à aujourd'hui)
 * - Cette année (du 1er janvier jusqu'à aujourd'hui)
 * - Tout l'historique (sans restriction de date)
 */
export const getDatePresets = () => {
  const today = new Date()
  const todayStr = formatDateToYMD(today)

  // 30 derniers jours (date glissante)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)
  const thirtyDaysStr = formatDateToYMD(thirtyDaysAgo)

  // Ce mois-ci (du 1er au jour actuel)
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthStr = formatDateToYMD(firstDayOfMonth)

  // Cette année (du 1er janvier au jour actuel)
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1)
  const yearStr = formatDateToYMD(firstDayOfYear)

  return {
    last30Days: { date_from: thirtyDaysStr, date_to: todayStr, label: '30 derniers jours' },
    thisMonth: { date_from: monthStr, date_to: todayStr, label: 'Ce mois-ci' },
    thisYear: { date_from: yearStr, date_to: todayStr, label: 'Cette année' },
    all: { date_from: '', date_to: '', label: 'Tout l’historique' },
  }
}

/**
 * Calcule l'écart en nombre de jours entre deux chaînes YYYY-MM-DD.
 * Utilisé pour déterminer automatiquement la granularité la plus pertinente
 * (ex: par jour si <= 31 jours, par mois si période intermédiaire, par an si > 2 ans).
 */
export const getDaysDifference = (from?: string, to?: string): number => {
  if (!from || !to) return 9999
  const d1 = new Date(from).getTime()
  const d2 = new Date(to).getTime()
  return Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)))
}

/**
 * Formate un nombre selon les conventions typographiques françaises
 * avec des espaces insécables comme séparateurs de milliers (ex: 12 450).
 */
export const formatNumber = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0'
  return new Intl.NumberFormat('fr-FR').format(val)
}

/**
 * Formate un nombre flottant en pourcentage avec le nombre de décimales souhaité (ex: 42,5%).
 */
export const formatPercent = (val?: number | null, decimals = 1): string => {
  if (val === undefined || val === null || isNaN(val)) return '0%'
  return `${val.toFixed(decimals)}%`
}

/**
 * Exporte un tableau d'objets vers un fichier CSV téléchargeable côté client.
 * Spécificités de l'implémentation :
 * 1. Ajoute le BOM UTF-8 (`\ufeff`) pour forcer Microsoft Excel à reconnaître correctement
 *    les accents et caractères spéciaux français (é, è, ô, etc.).
 * 2. Utilise le point-virgule (`;`) comme séparateur de colonnes, standard des tableurs français.
 * 3. Échappe les guillemets internes (`"` -> `""`) conformément à la norme RFC 4180.
 * 4. Déclenche le téléchargement via un lien temporaire détaché du DOM.
 */
export const exportToCSV = (filename: string, rows: Record<string, unknown>[]) => {
  if (!rows || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const csvContent = [
    headers.join(';'),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const val = row[header]
          if (val === null || val === undefined) return '""'
          const stringVal = String(val).replace(/"/g, '""')
          return `"${stringVal}"`
        })
        .join(';')
    ),
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Palette de couleurs principale Studio des Parfums.
 * Harmonie de teintes chaudes inspirées des matières premières de la parfumerie de luxe :
 * ambre cuiré, miel doré, émeraude végétale, lavande, rose poudré.
 */
export const SDP_COLORS = [
  '#996F56', // Ambre cuiré / signature SDP
  '#D97706', // Miel / doré
  '#10B981', // Émeraude fraîche
  '#6366F1', // Lavande noble
  '#EC4899', // Rose poudré
  '#8B5CF6', // Iris violet
  '#06B6D4', // Céleste marin
  '#F59E0B', // Safran solaire
  '#855D47', // Terre de sienne / santal
  '#64748B', // Ardoise / minéral
]

/**
 * Nuancier étendu de 21 teintes aromatiques et chaleureuses spécialement
 * sélectionnées pour les notes de la pyramide olfactive (agrumes, florales, boisées, ambrées).
 */
export const NOTE_PALETTE = [
  '#996F56', // Ambre cuiré signature
  '#D97706', // Ambre doré / miel
  '#B45309', // Caramel / vanille boisée
  '#059669', // Émeraude fraîche / sauge
  '#0D9488', // Cyprès / eucalyptus
  '#0284C7', // Céleste marin / embruns
  '#6366F1', // Lavande fine
  '#7C3AED', // Iris noble / violet
  '#9333EA', // Pourpre capiteux
  '#C026D3', // Orchidée précieuse
  '#DB2777', // Rose de mai / poudré
  '#E11D48', // Baie rouge / grenat
  '#EA580C', // Mandarine / agrume chaud
  '#CA8A04', // Jasmin solaire
  '#65A30D', // Bergamote verte / cédrat
  '#16A34A', // Menthe / herbe fraîche
  '#855D47', // Bois de santal
  '#78350F', // Bois de cèdre / cuir sombre
  '#57534E', // Musc chaud / ambre gris
  '#475569', // Encens / fumé
  '#4338CA', // Patchouli / nuit
  '#BE185D', // Pivoine rose
  '#A16207', // Cannelle / épice
  '#047857', // Feuille de figuier
]

/**
 * Génère une couleur déterministe et stable pour chaque note olfactive.
 * Algorithme de hachage DJB2 (32-bit integer wrapping) :
 * 1. Nettoie la chaîne (insensible aux espaces et à la casse).
 * 2. Parcourt chaque caractère pour calculer une empreinte numérique (hash = hash * 31 + charCode).
 * 3. Utilise le modulo de la valeur absolue du hash sur la taille de `NOTE_PALETTE`.
 * Garantit qu'une même note (ex: "Bergamote", "Vanille") aura TOUJOURS la même couleur
 * sur l'ensemble des graphiques, jauges, badges et tableaux de l'application.
 */
export const getNoteColor = (nameOrId?: string | number | null): string => {
  if (nameOrId === undefined || nameOrId === null) return '#996F56'
  const clean = String(nameOrId).trim().toLowerCase()
  if (!clean) return '#996F56'

  let hash = 0
  for (let i = 0; i < clean.length; i++) {
    // Équivalent optimisé de hash * 31 + code : (hash << 5) - hash + code
    hash = (hash << 5) - hash + clean.charCodeAt(i)
    hash |= 0 // Forcer la conversion en entier signé 32 bits
  }
  const index = Math.abs(hash) % NOTE_PALETTE.length
  return NOTE_PALETTE[index]
}
