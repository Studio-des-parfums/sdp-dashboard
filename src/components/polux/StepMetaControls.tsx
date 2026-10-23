import { useRef, useState } from 'react'
import { CalendarDays, Flag } from 'lucide-react'
import type { PoluxTaskPriority, PoluxTaskStatus } from '../../types/polux'
import { deadlineClass, formatDeadline, PRIORITY_CLASS, PRIORITY_LABEL, toDateInputValue } from './priority'

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
import { FloatingPanel } from './FloatingPanel'

export interface StepMeta {
  deadline: string | null
  priority: PoluxTaskPriority | null
}

interface StepMetaControlsProps extends StepMeta {
  /** Statut utilisé pour colorer l'échéance (en retard / proche) — une étape cochée vaut "terminé". */
  status?: PoluxTaskStatus
  onChange: (patch: Partial<StepMeta>) => void
}

/** Bouton-icône des lignes d'étape : discret quand vide, coloré quand renseigné. */
export function stepIconButtonClass(active: boolean): string {
  return `inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-1.5 text-xs transition-colors ${
    active ? 'bg-white shadow-sm ring-1 ring-gray-200' : 'text-gray-400 hover:bg-white hover:text-gray-700'
  }`
}

// Échéance + priorité d'une étape de checklist, en icônes : un clic ouvre le champ correspondant.
export function StepMetaControls({ deadline, priority, status = 'a_faire', onChange }: StepMetaControlsProps) {
  const [open, setOpen] = useState<'deadline' | 'priority' | null>(null)
  const deadlineRef = useRef<HTMLButtonElement | null>(null)
  const priorityRef = useRef<HTMLButtonElement | null>(null)

  return (
    <>
      <button
        ref={deadlineRef}
        type="button"
        onClick={() => setOpen((o) => (o === 'deadline' ? null : 'deadline'))}
        className={`${stepIconButtonClass(!!deadline)} ${deadline ? deadlineClass(deadline, status) : ''}`}
        title={deadline ? `Échéance : ${formatDeadline(deadline)}` : "Ajouter une échéance"}
      >
        <CalendarDays size={15} />
        {deadline && <span>{shortDate(deadline)}</span>}
      </button>
      {open === 'deadline' && (
        <FloatingPanel anchorRef={deadlineRef} onClose={() => setOpen(null)} width={220}>
          <div className="space-y-2 px-3 py-2">
            <p className="text-xs font-medium text-gray-600">Échéance de l'étape</p>
            <input
              type="date"
              autoFocus
              value={deadline ? toDateInputValue(deadline) : ''}
              onChange={(e) => { onChange({ deadline: e.target.value ? new Date(e.target.value).toISOString() : null }); setOpen(null) }}
              className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900"
            />
            {deadline && (
              <button type="button" onClick={() => { onChange({ deadline: null }); setOpen(null) }} className="text-xs text-gray-500 hover:text-red-600">
                Retirer l'échéance
              </button>
            )}
          </div>
        </FloatingPanel>
      )}

      <button
        ref={priorityRef}
        type="button"
        onClick={() => setOpen((o) => (o === 'priority' ? null : 'priority'))}
        className={`${stepIconButtonClass(!!priority)} ${priority ? PRIORITY_CLASS[priority] : ''}`}
        title={priority ? `Priorité : ${PRIORITY_LABEL[priority]}` : 'Ajouter une priorité'}
      >
        <Flag size={15} />
      </button>
      {open === 'priority' && (
        <FloatingPanel anchorRef={priorityRef} onClose={() => setOpen(null)} width={180}>
          {(Object.entries(PRIORITY_LABEL) as [PoluxTaskPriority, string][]).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => { onChange({ priority: k }); setOpen(null) }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 ${k === priority ? 'font-medium' : ''}`}
            >
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_CLASS[k]}`}>{v}</span>
            </button>
          ))}
          {priority && (
            <button type="button" onClick={() => { onChange({ priority: null }); setOpen(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-100 hover:text-red-600">
              Retirer la priorité
            </button>
          )}
        </FloatingPanel>
      )}
    </>
  )
}
