export interface Project {
  id: number
  name: string
  slug: string
  description: string
  color: string
  status: 'active' | 'inactive' | 'maintenance'
  created_at: string
  /** Permission de l'utilisateur courant sur ce projet ('view' | 'edit' | 'admin'). Absent = mock/dev. */
  user_permission?: 'view' | 'edit' | 'admin'
}

export interface Metric {
  id: number
  project_id: number
  name: string
  value: number
  unit: string
  type: 'number' | 'percentage' | 'currency'
  change: number
}

export interface ChartDataPoint {
  label: string
  value: number
}

export interface Chart {
  id: number
  title: string
  type: 'line' | 'bar' | 'pie' | 'area'
  data: ChartDataPoint[]
}

export interface DashboardSection {
  id: string
  name: string
  icon: string
  metricIds: number[]
  chartIds: number[]
}

export interface Notification {
  id: number
  message: string
  time: string
}

export interface Dashboard extends Project {
  metrics: Metric[]
  charts: Chart[]
  sections: DashboardSection[]
}

export interface NinnoAppConfig {
  backgroundImageUrl: string
  backgroundOtherImageUrl: string
  logoImageUrl: string
}

export interface NinnoNote {
  id: number
  name: string
  type: 'top' | 'heart' | 'base'
  imageUrl: string | null
  happyImageUrl: string | null
  sadImageUrl: string | null
  happyAnimUrl: string | null
  sadAnimUrl: string | null
}

export interface NinnoNoteInput {
  name: string
  type: 'top' | 'heart' | 'base'
  image?: File | null
  happyImage?: File | null
  sadImage?: File | null
  happyAnim?: File | null
  sadAnim?: File | null
}
