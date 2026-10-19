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
  /** Équipe officielle (ex: Informatique) — ne peut pas être supprimée, même par qui l'a créée. */
  is_official: boolean
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
  /** Null pour une tâche personnelle (voir owner_id) — sinon l'équipe qui la porte. */
  team_id: number | null
  title: string
  description: string
  assigned_to_ids: number[]
  created_by: number
  /** Si non-null, tâche personnelle visible uniquement par cet utilisateur (team_id est alors null). */
  owner_id: number | null
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

/** Type d'appelant — conditionne l'affichage du champ société sur la fiche lead. */
export type PoluxLeadContactType = 'particulier' | 'professionnel'

/**
 * Pipeline de suivi d'un lead, de l'appel initial jusqu'à la venue sur place (ou l'abandon).
 * Permet de savoir qui relancer et quand, sans dépendre du statut des tâches projet.
 */
export type PoluxLeadStatus =
  | 'nouveau'
  | 'a_relancer'
  | 'acompte_1_recu'
  | 'acompte_2_recu'
  | 'confirme'
  | 'realise'
  | 'perdu'

/** Une entrée de l'historique de suivi d'un lead (appel, relance, email, note libre). */
export interface PoluxLeadInteraction {
  id: number
  lead_id: number
  author_id: number
  body: string
  created_at: string
}

export interface PoluxLead {
  id: number
  contact_type: PoluxLeadContactType
  last_name: string
  first_name: string
  phone: string
  email: string
  /** Obligatoire si contact_type === 'professionnel', sinon null. */
  company: string | null
  info: string
  project_name: string
  project_date: string | null
  first_deposit_date: string | null
  second_deposit_date: string | null
  status: PoluxLeadStatus
  call_date: string
  next_follow_up_at: string | null
  assigned_to_id: number | null
  created_by: number
  created_at: string
  interactions: PoluxLeadInteraction[]
}
