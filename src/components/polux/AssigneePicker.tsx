import { useState } from 'react'
import type { PoluxUserRef } from '../../types/polux'

interface AssigneePickerProps {
  users: PoluxUserRef[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  /** Affichage compact en bouton-pile (comme les boutons "+ checklist" / "Date limite"), au lieu du champ pleine largeur par défaut. */
  compact?: boolean
}

// Sélection multi-personnes façon Notion : liste déroulante avec cases à cocher,
// affichée comme un champ qui résume les personnes choisies.
export function AssigneePicker({ users, selectedIds, onChange, compact = false }: AssigneePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = users.filter((u) => selectedIds.includes(u.id))

  function toggle(userId: number) {
    onChange(selectedIds.includes(userId) ? selectedIds.filter((id) => id !== userId) : [...selectedIds, userId])
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-indigo-400 hover:text-indigo-600'
            : 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900'
        }
      >
        {compact && <span className="material-symbols-outlined text-[16px] leading-none">person</span>}
        {selected.length > 0 ? selected.map((u) => `${u.first_name} ${u.last_name}`).join(', ') : compact ? 'Assigné à' : 'Non assignée'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className={`absolute left-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1 ${compact ? 'w-56' : 'w-full'}`}>
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggle(u.id)} />
                {u.first_name} {u.last_name}
              </label>
            ))}
            {users.length === 0 && <p className="px-3 py-2 text-sm text-gray-500">Aucun utilisateur</p>}
          </div>
        </>
      )}
    </div>
  )
}
