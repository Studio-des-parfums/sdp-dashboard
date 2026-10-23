import { useRef, useState } from 'react'
import { UserPlus, Users } from 'lucide-react'
import type { PoluxTeam, PoluxUserRef } from '../../types/polux'
import { useAuth } from '../../contexts/AuthContext'
import { currentUserFirst, userDisplayName } from './userLabel'
import { FloatingPanel } from './FloatingPanel'
import { stepIconButtonClass } from './StepMetaControls'

interface AssigneePickerProps {
  users: PoluxUserRef[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  /** Si fourni, les équipes sont proposées au-dessus des personnes (une seule équipe par tâche). */
  teams?: PoluxTeam[]
  selectedTeamId?: number | null
  onTeamChange?: (teamId: number | null) => void
  /** Affichage compact en bouton-pile (comme les boutons "+ checklist" / "Date limite"), au lieu du champ pleine largeur par défaut. */
  compact?: boolean
  /** Bouton-icône seul (lignes d'étape de checklist) : le résumé passe en infobulle. */
  iconOnly?: boolean
}

// Sélection multi-personnes façon Notion : liste déroulante avec cases à cocher,
// affichée comme un champ qui résume l'équipe et les personnes choisies.
export function AssigneePicker({ users, selectedIds, onChange, teams, selectedTeamId = null, onTeamChange, compact = false, iconOnly = false }: AssigneePickerProps) {
  const { sdpUser } = useAuth()
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const orderedUsers = currentUserFirst(users, sdpUser?.email)
  const selected = orderedUsers.filter((u) => selectedIds.includes(u.id))
  const selectedTeam = teams?.find((t) => t.id === selectedTeamId) ?? null
  const summary = [...(selectedTeam ? [selectedTeam.name] : []), ...selected.map((u) => userDisplayName(u, sdpUser?.email))]

  function toggle(userId: number) {
    onChange(selectedIds.includes(userId) ? selectedIds.filter((id) => id !== userId) : [...selectedIds, userId])
  }

  return (
    <div className="relative">
      {iconOnly ? (
        <button
          ref={anchorRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`${stepIconButtonClass(summary.length > 0)} ${summary.length > 0 ? 'text-indigo-600' : ''}`}
          title={summary.length > 0 ? `Assigné à : ${summary.join(', ')}` : 'Assigner à une équipe ou une personne'}
        >
          {summary.length > 0 ? <Users size={15} /> : <UserPlus size={15} />}
          {summary.length > 1 && <span>{summary.length}</span>}
        </button>
      ) : (
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-indigo-400 hover:text-indigo-600'
            : 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900'
        }
      >
        {compact && <span className="material-symbols-outlined text-[16px] leading-none">person</span>}
        <span className={compact ? 'max-w-[11rem] truncate' : undefined} title={summary.join(', ') || undefined}>
          {summary.length > 0 ? summary.join(', ') : compact ? 'Assigné à' : 'Non assignée'}
        </span>
      </button>
      )}
      {open && (
        <FloatingPanel anchorRef={anchorRef} onClose={() => setOpen(false)} width={compact || iconOnly ? 256 : undefined}>
            {teams && teams.length > 0 && (
              <>
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Équipes</p>
                {teams.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <input type="checkbox" checked={selectedTeamId === t.id} onChange={() => onTeamChange?.(selectedTeamId === t.id ? null : t.id)} />
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </label>
                ))}
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Personnes</p>
              </>
            )}
            {orderedUsers.map((u) => (
              <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggle(u.id)} />
                {userDisplayName(u, sdpUser?.email)}
              </label>
            ))}
            {users.length === 0 && <p className="px-3 py-2 text-sm text-gray-500">Aucun utilisateur</p>}
        </FloatingPanel>
      )}
    </div>
  )
}
