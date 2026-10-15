export type PoluxTaskStatus = 'a_faire' | 'en_cours' | 'en_revision' | 'termine'
export type PoluxTaskPriority = 'basse' | 'moyenne' | 'haute' | 'urgente'

export interface PoluxUserRef {
  id: number
  first_name: string
  last_name: string
  email: string
}

export interface PoluxTeam {
  id: number
  slug: string
  name: string
  color: string
  member_ids: number[]
}

export interface PoluxReminder {
  id: number
  task_id: number
  remind_at: string
  sent: boolean
}

export interface PoluxAttachment {
  id: number
  task_id: number
  filename: string
  url: string
  content_type: string
  size: number
  uploaded_by: number
  created_at: string
}

export interface PoluxComment {
  id: number
  task_id: number
  user_id: number
  body: string
  /** user_id des personnes mentionnées via @ dans le commentaire — chacune reçoit une notification. */
  mentioned_user_ids: number[]
  created_at: string
}

export interface PoluxTask {
  id: number
  project_name: string | null
  team_id: number
  title: string
  description: string
  assigned_to_ids: number[]
  created_by: number
  priority: PoluxTaskPriority
  color: string | null
  status: PoluxTaskStatus
  start_date: string | null
  deadline: string | null
  created_at: string
  reminders: PoluxReminder[]
  attachments: PoluxAttachment[]
  comments: PoluxComment[]
}
