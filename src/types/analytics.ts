// sdp-dashboard/src/types/analytics.ts

export type Granularity = 'day' | 'month' | 'year'
export type NoteType = 'top_note' | 'heart_note' | 'base_note' | 'booster_note'

export interface AnalyticsFilterParams {
  date_from?: string
  date_to?: string
}

// 1. Formules créées
export interface FormulaCountDataPoint {
  period: string // "2026-10" ou "2026-10-07"
  count: number
}

export interface FormulaCountResponse {
  total: number
  group_by: Granularity
  period_label: string
  data: FormulaCountDataPoint[]
}

// 2. Meilleures périodes
export interface MonthPeriodItem {
  month: number // 1 - 12
  label: string // "Janvier" ... "Décembre"
  count: number
}

export interface DayOfWeekPeriodItem {
  day: number // 1 = Lundi ... 7 = Dimanche
  label: string // "Lundi" ... "Dimanche"
  count: number
}

export interface YearPeriodItem {
  year: number
  count: number
}

export interface BestPeriodsResponse {
  top_months: MonthPeriodItem[]
  top_days_of_week: DayOfWeekPeriodItem[]
  top_years: YearPeriodItem[]
}

// 3. Ateliers
export interface TopAtelierItem {
  atelier_id: number | null
  atelier_name: string
  count: number
}

// 4. Notes
export interface TopNoteItem {
  name: string
  count: number
}

export interface TopNotesResponse {
  top_note?: TopNoteItem[]
  heart_note?: TopNoteItem[]
  base_note?: TopNoteItem[]
  booster_note?: TopNoteItem[]
  all?: TopNoteItem[]
}

// 5. Options
export interface TopOptionItem {
  option_name: string
  count: number
}

// 6. Genre
export interface GenderDistributionResponse {
  male: number
  female: number
  unknown: number
  total: number
  male_pct: number
  female_pct: number
  unknown_pct: number
}

// 7. Villes et Pays
export interface LocationCountryItem {
  country: string
  count: number
}

export interface LocationCityItem {
  city: string
  count: number
}

export interface TopLocationsResponse {
  top_countries: LocationCountryItem[]
  top_cities: LocationCityItem[]
}

// 8. Fidélité
export interface LoyaltyDistributionItem {
  bucket: string // "1", "2", "3", "4", "5+"
  customer_count: number
}

export interface NewLoyalByMonthItem {
  month: string // "2026-10"
  new_loyal: number
}

export interface LoyaltyRateResponse {
  total_customers_with_formula: number
  loyal_customers: number
  loyalty_rate: number // ex: 3.39
  min_formulas_threshold: number
  distribution: LoyaltyDistributionItem[]
  new_loyal_by_month: NewLoyalByMonthItem[]
}
