import type { PoluxLeadContactType, PoluxLeadStatus } from '../../types/polux'

export const LEAD_STATUS_LABEL: Record<PoluxLeadStatus, string> = {
  nouveau: 'Nouveau',
  a_relancer: 'À relancer',
  acompte_1_recu: '1er acompte reçu',
  acompte_2_recu: '2e acompte reçu',
  confirme: 'Confirmé',
  realise: 'Réalisé',
  perdu: 'Perdu',
}

export const LEAD_STATUS_CLASS: Record<PoluxLeadStatus, string> = {
  nouveau: 'bg-sky-500/10 text-sky-600',
  a_relancer: 'bg-amber-500/10 text-amber-600',
  acompte_1_recu: 'bg-indigo-600/10 text-indigo-600',
  acompte_2_recu: 'bg-indigo-600/10 text-indigo-600',
  confirme: 'bg-emerald-500/10 text-emerald-600',
  realise: 'bg-emerald-600/10 text-emerald-700',
  perdu: 'bg-red-500/10 text-red-700',
}

export const LEAD_CONTACT_TYPE_LABEL: Record<PoluxLeadContactType, string> = {
  particulier: 'Particulier',
  professionnel: 'Professionnel',
}

/** Un lead doit être relancé si une date de relance est passée et qu'il n'est ni confirmé, réalisé ni perdu. */
export function isLeadFollowUpDue(nextFollowUpAt: string | null, status: PoluxLeadStatus): boolean {
  if (!nextFollowUpAt) return false
  if (status === 'confirme' || status === 'realise' || status === 'perdu') return false
  return new Date(nextFollowUpAt).getTime() < Date.now()
}

export function formatLeadDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
