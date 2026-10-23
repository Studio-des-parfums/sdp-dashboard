import { useState } from 'react'
import { Button } from '../ui/lylo/Button'
import { Input } from '../ui/lylo/Input'
import { Label } from '../ui/lylo/Label'
import { Modal } from '../ui/lylo/Modal'
import { poluxApi, type ChecklistAssignment } from '../../api/poluxClient'
import type { PoluxTask, PoluxTeam, PoluxUserRef } from '../../types/polux'
import { useAuth } from '../../contexts/AuthContext'
import { formatDeadline, PRIORITY_LABEL } from './priority'
import { AssigneePicker } from './AssigneePicker'
import { ColorPicker } from './ColorPicker'
import { ProjectPicker } from './ProjectPicker'
import { LeadPicker } from './LeadPicker'
import { toggleButtonClass } from './toggleButton'
import { StepMetaControls, type StepMeta } from './StepMetaControls'

interface CreateTaskModalProps {
  open: boolean
  /** Équipe imposée (page d'une équipe). Sinon, l'équipe se choisit dans « Assigné à » parmi `teams`. */
  teamId?: number
  teams?: PoluxTeam[]
  users: PoluxUserRef[]
  existingProjects?: string[]
  onClose: () => void
  onCreated: (task: PoluxTask) => void
  /** Liste complète rechargée quand des étapes confiées ont créé d'autres tâches. */
  onTasksChanged?: (tasks: PoluxTask[]) => void
}

interface PendingStep extends ChecklistAssignment, StepMeta {
  label: string
}

function emptyForm() {
  return { title: '', description: '', projectName: '', leadId: null as number | null, assignedToIds: [] as number[], priority: 'moyenne' as PoluxTask['priority'], color: null as string | null, startDate: '', deadline: '' }
}

export function CreateTaskModal({ open, teamId, teams = [], users, existingProjects = [], onClose, onCreated, onTasksChanged }: CreateTaskModalProps) {
  const [form, setForm] = useState(emptyForm())
  const { sdpUser } = useAuth()
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const effectiveTeamId = teamId ?? selectedTeamId
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [dateMenuOpen, setDateMenuOpen] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [checklistLabel, setChecklistLabel] = useState('')
  const [pendingChecklist, setPendingChecklist] = useState<PendingStep[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addPendingChecklistItem() {
    const label = checklistLabel.trim()
    if (!label) return
    setPendingChecklist((prev) => [...prev, { label, team_id: null, assigned_to_ids: [], deadline: null, priority: null }])
    setChecklistLabel('')
  }

  // Re-cliquer sur un bouton ouvert vide son champ et le referme.
  function toggleChecklist() {
    if (checklistOpen) {
      setPendingChecklist([])
      setChecklistLabel('')
    }
    setChecklistOpen((o) => !o)
  }

  function toggleLead() {
    if (leadOpen) setForm((s) => ({ ...s, leadId: null }))
    setLeadOpen((o) => !o)
  }

  function assignPendingStep(index: number, patch: Partial<ChecklistAssignment & StepMeta>) {
    setPendingChecklist((prev) => prev.map((step, i) => (i === index ? { ...step, ...patch } : step)))
  }

  function removePendingChecklistItem(index: number) {
    setPendingChecklist((prev) => prev.filter((_, i) => i !== index))
  }

  async function submit() {
    if (!form.title.trim()) return
    setIsBusy(true)
    setError(null)
    try {
      const common = {
        lead_id: form.leadId,
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        color: form.color,
        start_date: form.startDate ? new Date(form.startDate).toISOString() : null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      }
      // Sans équipe et assignée à personne d'autre que soi : tâche personnelle.
      const myId = users.find((u) => u.email === sdpUser?.email)?.id
      const isPersonal = effectiveTeamId == null && form.assignedToIds.every((id) => id === myId)
      const task = isPersonal
        ? await poluxApi.createPersonalTask(common)
        : await poluxApi.createTask({
            ...common,
            team_id: effectiveTeamId,
            project_name: form.projectName.trim() || null,
            assigned_to_ids: form.assignedToIds,
          })
      let finalTask = task
      if (pendingChecklist.length > 0) {
        let freshTasks: PoluxTask[] = []
        for (const { label, ...options } of pendingChecklist) {
          freshTasks = await poluxApi.addChecklistItem(task.id, label, options)
        }
        finalTask = freshTasks.find((t) => t.id === task.id) ?? task
        onTasksChanged?.(freshTasks.filter((t) => t.id !== task.id))
      }
      onCreated(finalTask)
      setForm(emptyForm())
      setSelectedTeamId(null)
      setPendingChecklist([])
      setChecklistOpen(false)
      setLeadOpen(false)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  function handleClose() {
    setForm(emptyForm())
    setSelectedTeamId(null)
    setPendingChecklist([])
    setChecklistLabel('')
    setChecklistOpen(false)
    setLeadOpen(false)
    setColorPickerOpen(false)
    setDateMenuOpen(false)
    setError(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      title="Nouvelle tâche"
      onClose={handleClose}
      maxWidthClassName="max-w-3xl"
      footer={
        <>
          <Button type="button" onClick={handleClose}>Annuler</Button>
          <Button variant="primary" type="button" onClick={submit} disabled={isBusy || !form.title.trim()}>Créer</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50/30 p-3 text-sm text-red-700">{error}</div>}

        <div className="relative flex items-center gap-3">
          <button
            type="button"
            onClick={() => setColorPickerOpen((o) => !o)}
            className="h-5 w-5 shrink-0 rounded-full border-2 border-white shadow ring-1 ring-gray-200"
            style={{ backgroundColor: form.color ?? '#d1d5db' }}
            title="Changer la couleur"
          />
          {colorPickerOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setColorPickerOpen(false)} />
              <div className="absolute left-0 top-7 z-20 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                <ColorPicker value={form.color} onChange={(color) => { setForm((s) => ({ ...s, color })); setColorPickerOpen(false) }} />
              </div>
            </>
          )}
          <Input
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            placeholder="Titre de la tâche"
            className="text-xl font-semibold"
          />
        </div>

        <div className="-mt-1 flex flex-wrap items-center gap-2">
          <button type="button" onClick={toggleChecklist} className={toggleButtonClass(checklistOpen)}>
            + checklist
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setDateMenuOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-indigo-400 hover:text-indigo-600"
            >
              <span className="material-symbols-outlined text-[16px] leading-none">calendar_month</span>
              {form.startDate && form.deadline
                ? `${formatDeadline(new Date(form.startDate).toISOString())} → ${formatDeadline(new Date(form.deadline).toISOString())}`
                : form.deadline
                ? formatDeadline(new Date(form.deadline).toISOString())
                : 'Date limite'}
            </button>
            {dateMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDateMenuOpen(false)} />
                <div className="absolute left-0 top-9 z-20 w-64 space-y-3 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                  <div className="space-y-1">
                    <Label>Échéance</Label>
                    <Input type="date" autoFocus value={form.deadline} onChange={(e) => setForm((s) => ({ ...s, deadline: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Date de début (optionnel)</Label>
                    <Input type="date" value={form.startDate} onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))} />
                  </div>
                  <Button variant="primary" type="button" onClick={() => setDateMenuOpen(false)} className="w-full justify-center">
                    Enregistrer
                  </Button>
                </div>
              </>
            )}
          </div>

          <AssigneePicker
            compact
            users={users}
            selectedIds={form.assignedToIds}
            onChange={(ids) => setForm((s) => ({ ...s, assignedToIds: ids }))}
            teams={teamId == null ? teams : undefined}
            selectedTeamId={selectedTeamId}
            onTeamChange={setSelectedTeamId}
          />

          <button type="button" onClick={toggleLead} className={toggleButtonClass(leadOpen)}>
            + client
          </button>
        </div>

        {leadOpen && (
          <div className="space-y-2">
            <Label>Client</Label>
            <LeadPicker value={form.leadId} onChange={(leadId) => setForm((s) => ({ ...s, leadId }))} />
          </div>
        )}

        <div className="space-y-2">
          <Label>Description</Label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </div>
        <div className="space-y-2">
          <Label>Projet</Label>
          <ProjectPicker
            value={form.projectName}
            existingProjects={existingProjects}
            onChange={(v) => setForm((s) => ({ ...s, projectName: v }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Priorité</Label>
          <select value={form.priority} onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value as PoluxTask['priority'] }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
            {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {checklistOpen && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Checklist{pendingChecklist.length > 0 && ` (${pendingChecklist.length})`}</Label>
            </div>
            <div className="space-y-1">
              {pendingChecklist.map((step, i) => (
                <div key={i} className="group flex flex-wrap items-center gap-2 rounded-lg px-1 py-1 hover:bg-white/60">
                  <span className="min-w-[8rem] flex-1 text-sm text-gray-900">{step.label}</span>
                  <StepMetaControls deadline={step.deadline} priority={step.priority} onChange={(patch) => assignPendingStep(i, patch)} />
                  <AssigneePicker
                    iconOnly
                    users={users}
                    teams={teams}
                    selectedTeamId={step.team_id}
                    selectedIds={step.assigned_to_ids}
                    onTeamChange={(team_id) => assignPendingStep(i, { team_id })}
                    onChange={(assigned_to_ids) => assignPendingStep(i, { assigned_to_ids })}
                  />
                  <button
                    type="button"
                    onClick={() => removePendingChecklistItem(i)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Supprimer"
                  >
                    <span className="material-symbols-outlined text-[18px] leading-none">more_vert</span>
                  </button>
                </div>
              ))}
              {pendingChecklist.length === 0 && <p className="text-sm text-gray-600">Aucune sous-tâche.</p>}
            </div>
            <div className="flex gap-2">
              <Input
                value={checklistLabel}
                onChange={(e) => setChecklistLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPendingChecklistItem())}
                placeholder="Ajouter une sous-tâche..."
              />
              <Button variant="primary" type="button" onClick={addPendingChecklistItem} disabled={!checklistLabel.trim()}>Ajouter</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
