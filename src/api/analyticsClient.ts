// sdp-dashboard/src/api/analyticsClient.ts

import type {
  FormulaCountResponse,
  BestPeriodsResponse,
  TopAtelierItem,
  TopNotesResponse,
  TopOptionItem,
  GenderDistributionResponse,
  TopLocationsResponse,
  LoyaltyRateResponse,
  Granularity,
  NoteType,
} from '../types/analytics'

/**
 * URL de base de l'API backend FastAPI.
 * Priorise la variable d'environnement VITE_OCR_API_URL, puis VITE_API_URL,
 * avec repli sur localhost:8000 pour le développement local.
 */
const OCR_API_URL = import.meta.env.VITE_OCR_API_URL || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

/**
 * Traite la réponse HTTP de manière centralisée.
 * Détecte les erreurs HTTP (4xx, 5xx), extrait le message renvoyé par FastAPI
 * (champ `detail` ou `message`), et parse le JSON en cas de succès.
 */
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || error.message || `Erreur HTTP : statut ${response.status}`)
  }
  return response.json()
}

/**
 * Construit une chaîne de requête URL (?param1=val1&param2=val2) propre.
 * Élimine automatiquement les paramètres nuls, indéfinis ou vides ('')
 * pour éviter d'envoyer des filtres superflus au serveur backend.
 */
const buildQueryString = (params?: Record<string, string | number | undefined | null>): string => {
  if (!params) return ''
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ''
}

/**
 * Client API Analytics Studio des Parfums.
 * Fournit les méthodes d'accès typées aux 8 endpoints du module de statistiques.
 */
export const analyticsApi = {
  /**
   * 1. Évolution temporelle du nombre de formules créées.
   * Filtre possible par plage de dates et granularité (jour, mois, année).
   */
  getFormulaCount: async (params?: {
    date_from?: string
    date_to?: string
    group_by?: Granularity
  }): Promise<FormulaCountResponse> => {
    const qs = buildQueryString(params)
    const res = await fetch(`${OCR_API_URL}/api/v1/analytics/formulas/count${qs}`)
    return handleResponse<FormulaCountResponse>(res)
  },

  /**
   * 2. Analyse de saisonnalité et identification des meilleures périodes d'activité.
   * Retourne le top des mois de l'année, des jours de la semaine (1=Lundi à 7=Dimanche)
   * et le comparatif pluriannuel.
   */
  getBestPeriods: async (limit: number = 10): Promise<BestPeriodsResponse> => {
    const qs = buildQueryString({ limit })
    const res = await fetch(`${OCR_API_URL}/api/v1/analytics/formulas/best-periods${qs}`)
    return handleResponse<BestPeriodsResponse>(res)
  },

  /**
   * 3. Fréquentation et volumes de création par atelier olfactif.
   * Permet de comparer les performances des 3 ateliers du Studio des Parfums.
   */
  getTopAteliers: async (params?: {
    limit?: number
    date_from?: string
    date_to?: string
  }): Promise<TopAtelierItem[]> => {
    const qs = buildQueryString(params)
    const res = await fetch(`${OCR_API_URL}/api/v1/analytics/ateliers/top${qs}`)
    return handleResponse<TopAtelierItem[]>(res)
  },

  /**
   * 4. Palmarès des notes (essences) olfactives les plus sélectionnées.
   * Filtre possible par position dans la pyramide : note_type ('top_note', 'heart_note', etc.).
   * Exclut automatiquement côté serveur les slots vides ou non renseignés.
   */
  getTopNotes: async (params?: {
    limit?: number
    note_type?: NoteType
    date_from?: string
    date_to?: string
  }): Promise<TopNotesResponse> => {
    const qs = buildQueryString(params)
    const res = await fetch(`${OCR_API_URL}/api/v1/analytics/notes/top${qs}`)
    return handleResponse<TopNotesResponse>(res)
  },

  /**
   * 5. Options et compléments souscrits lors de la formulation.
   * Analyse des extras : flacons murano, champagne, coffrets, rubans, etc.
   */
  getTopOptions: async (params?: {
    limit?: number
    date_from?: string
    date_to?: string
  }): Promise<TopOptionItem[]> => {
    const qs = buildQueryString(params)
    const res = await fetch(`${OCR_API_URL}/api/v1/analytics/options/top${qs}`)
    return handleResponse<TopOptionItem[]>(res)
  },

  /**
   * 6. Répartition démographique par civilité / genre des clients inscrits.
   * Retourne la part Homme / Femme / Non renseigné ainsi que les ratios calculés.
   */
  getGenderDistribution: async (params?: {
    date_from?: string
    date_to?: string
  }): Promise<GenderDistributionResponse> => {
    const qs = buildQueryString(params)
    const res = await fetch(`${OCR_API_URL}/api/v1/analytics/customers/gender${qs}`)
    return handleResponse<GenderDistributionResponse>(res)
  },

  /**
   * 7. Répartition géographique des clients : pays de résidence et villes principales.
   * Permet d'évaluer le rayonnement local vs la part de clientèle internationale.
   */
  getTopLocations: async (params?: {
    limit?: number
    date_from?: string
    date_to?: string
  }): Promise<TopLocationsResponse> => {
    const qs = buildQueryString(params)
    const res = await fetch(`${OCR_API_URL}/api/v1/analytics/customers/locations${qs}`)
    return handleResponse<TopLocationsResponse>(res)
  },

  /**
   * 8. Fidélité et récurrence client (Repeat Business).
   * Analyse la proportion de clients ayant créé au moins `min_formulas` parfums,
   * avec segmentation en tranches (1, 2, 3-5, 6-10, 10+) et cohorte mensuelle.
   */
  getLoyaltyRate: async (params?: {
    min_formulas?: number
    date_from?: string
    date_to?: string
  }): Promise<LoyaltyRateResponse> => {
    const qs = buildQueryString(params)
    const res = await fetch(`${OCR_API_URL}/api/v1/analytics/customers/loyalty${qs}`)
    return handleResponse<LoyaltyRateResponse>(res)
  },
}
