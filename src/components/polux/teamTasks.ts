import type { PoluxTask, PoluxTeam } from '../../types/polux'

/**
 * Tâches affichées dans l'espace d'une équipe : celles confiées à l'équipe, et celles assignées
 * directement (sans équipe) à l'un de ses membres. La visibilité de ces dernières (assignés,
 * créateur, responsable de l'équipe) est déjà filtrée par polux-back (GET /tasks).
 */
export function tasksForTeam(tasks: PoluxTask[], team: PoluxTeam): PoluxTask[] {
  return tasks.filter((t) =>
    t.team_id === team.id ||
    (t.team_id == null && t.owner_id == null && t.assigned_to_ids.some((id) => team.member_ids.includes(id)))
  )
}
