import type { PoluxTaskPriority, PoluxTaskStatus } from '../../types/polux'

export const PRIORITY_LABEL: Record<PoluxTaskPriority, string> = {
  basse: 'Basse',
  moyenne: 'Moyenne',
  haute: 'Haute',
  urgente: 'Urgente',
}

export const PRIORITY_CLASS: Record<PoluxTaskPriority, string> = {
  basse: 'bg-gray-300/10 text-gray-600',
  moyenne: 'bg-sky-500/10 text-sky-600',
  haute: 'bg-amber-500/10 text-amber-600',
  urgente: 'bg-red-500/10 text-red-700',
}

// Palette fixe proposée pour la couleur d'une tâche — pas de color picker libre pour
// garder un rendu cohérent et lisible dans le calendrier et le tableau.
export const TASK_COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f59e0b',
  '#10b981', '#ef4444', '#8b5cf6', '#0ea5e9',
] as const

/** Couleur effective d'une tâche : celle choisie, sinon un gris neutre par défaut. */
export function taskColor(color: string | null): string {
  return color ?? '#9ca3af'
}

export const STATUS_LABEL: Record<PoluxTaskStatus, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  en_revision: 'En révision',
  termine: 'Terminé',
}

export const STATUS_CLASS: Record<PoluxTaskStatus, string> = {
  a_faire: 'bg-gray-300/10 text-gray-600',
  en_cours: 'bg-indigo-600/10 text-indigo-600',
  en_revision: 'bg-amber-500/10 text-amber-600',
  termine: 'bg-emerald-500/10 text-emerald-600',
}

export function isOverdue(deadline: string | null, status: PoluxTaskStatus): boolean {
  if (!deadline || status === 'termine') return false
  return new Date(deadline).getTime() < Date.now()
}

export function formatDeadline(deadline: string | null): string {
  if (!deadline) return '—'
  return new Date(deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Convertit une date ISO (stockée en UTC) en 'YYYY-MM-DD' dans le fuseau local, pour
 * pré-remplir un <input type="date"> — un simple .slice(0, 10) sur la chaîne UTC brute
 * décale d'un jour dès que l'heure locale passe minuit avant l'heure UTC (ex: 22h UTC
 * = minuit en France), ce qui désynchronise le modal du reste de l'affichage.
 */
export function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysUntil(deadline: string): number {
  const now = new Date()
  const target = new Date(deadline)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000)
}

/**
 * Couleur de l'échéance selon la proximité : jaune à J-3, orange à J-2, rouge le jour J
 * et au-delà (dépassée) — une tâche terminée n'est jamais mise en alerte.
 */
export function deadlineClass(deadline: string | null, status: PoluxTaskStatus): string {
  if (!deadline || status === 'termine') return 'text-gray-600'
  const days = daysUntil(deadline)
  if (days <= 0) return 'text-red-700'
  if (days === 1 || days === 2) return 'text-orange-600'
  if (days === 3) return 'text-yellow-600'
  return 'text-gray-600'
}
