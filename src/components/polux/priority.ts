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
