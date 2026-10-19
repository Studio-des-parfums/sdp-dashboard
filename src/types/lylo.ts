export interface LyloClient {
  id: string | number
  first_name: string
  last_name: string
  email: string
  phone: string
  days_available: number
  sessions_available: number
  created_at?: string
  updated_at?: string
}

export interface LyloTeamMember {
  id: string | number
  first_name: string
  last_name: string
  email: string
  phone: string
  created_at?: string
  updated_at?: string
}

export interface LyloNote {
  name: string
  family?: string
  ml?: number
}

export interface LyloSizeDetail {
  target_ml: number
  formula_type: string
  top_notes: LyloNote[]
  heart_notes: LyloNote[]
  base_notes: LyloNote[]
}

export interface LyloFormula {
  id: number
  reference: string
  session_id: string
  profile: string
  formula_type: string
  top_notes: string[]
  heart_notes: string[]
  base_notes: string[]
  sizes: Record<string, LyloSizeDetail>
  customer_name: string | null
  customer_email: string | null
  language: string | null
  created_at: string | null
}

export interface LyloIngredient {
  id: number
  name: string
  type: 'top' | 'heart' | 'base'
  category: string | null
  language: string
  description: string | null
  intensity: string | null
  allergens: string[] | null
  is_active: boolean
}

export interface LyloChoice {
  id: number
  question_id: number
  text: string
  image_url: string | null
  language: string
}

export interface LyloQuestion {
  id: number
  text: string
  language: string
  is_active: boolean
  choices: LyloChoice[]
  groups: LyloQuestionGroupMini[]
}

export interface LyloQuestionGroupMini {
  id: number
  name: string
  is_active: boolean
}

export interface LyloQuestionGroup {
  id: number
  name: string
  is_active: boolean
  questions: Array<{ id: number; text: string; language: string; is_active: boolean }>
}

export interface LyloPrinter {
  id: string | number
  name: string
  location: string
  ip: string
  port: number
  is_active: boolean
  protocol?: string
  printnode_id?: string | number
}

// --- Lylo Analytics Types ---

export type LyloGranularity = 'day' | 'month' | 'year'

export interface LyloCountPeriodItem {
  period: string
  count: number
}

export interface LyloFormulaCountResponse {
  total: number
  group_by: LyloGranularity
  date_from: string | null
  date_to: string | null
  data: LyloCountPeriodItem[]
}

export interface LyloTopNoteItem {
  note: string
  category?: string | null
  count: number
  percentage: number
}

export interface LyloTopNotesResponse {
  total_formulas: number
  category: string
  limit: number
  data: LyloTopNoteItem[]
}

export interface LyloProfileStatItem {
  profile: string
  count: number
  percentage: number
}

export interface LyloProfilesResponse {
  total: number
  data: LyloProfileStatItem[]
}

export interface LyloLanguageStatItem {
  language: string
  count: number
  percentage: number
}

export interface LyloLanguagesResponse {
  total: number
  data: LyloLanguageStatItem[]
}

export interface LyloModeStatItem {
  mode: string
  count: number
  percentage: number
}

export interface LyloModesResponse {
  total: number
  data: LyloModeStatItem[]
}

export interface LyloFormulaTypeStatItem {
  formula_type: string
  count: number
  percentage: number
}

export interface LyloFormulaTypesResponse {
  total: number
  data: LyloFormulaTypeStatItem[]
}

export interface LyloAnalyticsSummaryResponse {
  total_formulas: number
  profiles: LyloProfileStatItem[]
  modes: LyloModeStatItem[]
  top_notes: LyloTopNoteItem[]
  formula_types: LyloFormulaTypeStatItem[]
  languages?: LyloLanguageStatItem[]
}

