import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/lylo/Button'
import { Input } from '../ui/lylo/Input'
import { Label } from '../ui/lylo/Label'
import { Modal } from '../ui/lylo/Modal'
import { poluxApi, type ChecklistAssignment, type TaskPatch } from '../../api/poluxClient'
import type { PoluxChecklistItem, PoluxTask, PoluxTeam, PoluxUserRef } from '../../types/polux'
import { formatDeadline, PRIORITY_LABEL, STATUS_CLASS, STATUS_LABEL, toDateInputValue } from './priority'
import { MentionInput } from './MentionInput'
import { AssigneePicker } from './AssigneePicker'
import { ColorPicker } from './ColorPicker'
import { ProjectPicker } from './ProjectPicker'
import { LeadPicker } from './LeadPicker'
import { toggleButtonClass } from './toggleButton'
import { StepMetaControls, type StepMeta } from './StepMetaControls'
import { AttachmentViewer, isImage } from './AttachmentViewer'
import { CommentBody } from './CommentBody'
import { userDisplayName } from './userLabel'
import { useAuth } from '../../contexts/AuthContext'

interface TaskModalProps {
  task: PoluxTask | null
  users: PoluxUserRef[]
  /** Équipes proposées pour confier une étape de la checklist. */
  teams?: PoluxTeam[]
  existingProjects?: string[]
  onClose: () => void
  onUpdated: (task: PoluxTask) => void
  onDeleted: (taskId: number) => void
  /** Liste complète rechargée : une étape confiée crée/modifie d'autres tâches (et un statut remonte au parent). */
  onTasksChanged?: (tasks: PoluxTask[]) => void
  /** Ouvre une autre tâche (tâche liée à une étape, ou tâche parente). */
  onOpenTask?: (taskId: number) => void
  /** Tâche ouverte juste avant (navigation entre tâches liées) : affiche un bouton retour. */
  previousTask?: PoluxTask | null
  onBack?: () => void
}

const NO_ASSIGNMENT: ChecklistAssignment = { team_id: null, assigned_to_ids: [] }
const NO_META: StepMeta = { deadline: null, priority: null }

export function TaskModal({ task, users, teams = [], existingProjects = [], onClose, onUpdated, onDeleted, onTasksChanged, onOpenTask, previousTask, onBack }: TaskModalProps) {
  const { sdpUser } = useAuth()
  const [form, setForm] = useState<TaskPatch>({})
  const [editingTitle, setEditingTitle] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [dateMenuOpen, setDateMenuOpen] = useState(false)
  const [checklistLabel, setChecklistLabel] = useState('')
  const [newStepAssignment, setNewStepAssignment] = useState<ChecklistAssignment>(NO_ASSIGNMENT)
  const [newStepMeta, setNewStepMeta] = useState<StepMeta>(NO_META)
  const [localChecklist, setLocalChecklist] = useState<PoluxChecklistItem[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [commentBody, setCommentBody] = useState('')
  const [mentionedUserIds, setMentionedUserIds] = useState<number[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!task) return
    setLocalChecklist(task.checklist)
    setChecklistOpen(task.checklist.length > 0)
    setLeadOpen(task.lead_id != null)
    setDateMenuOpen(false)
    setEditingTitle(false)
    setColorPickerOpen(false)
    setForm({
      title: task.title,
      description: task.description,
      project_name: task.project_name,
      assigned_to_ids: task.assigned_to_ids,
      priority: task.priority,
      color: task.color,
      status: task.status,
      start_date: task.start_date ? toDateInputValue(task.start_date) : null,
      deadline: task.deadline ? toDateInputValue(task.deadline) : null,
    })
    setCommentBody('')
    setMentionedUserIds([])
    setChecklistLabel('')
    setNewStepAssignment(NO_ASSIGNMENT)
    setNewStepMeta(NO_META)
    setViewerIndex(null)
    setError(null)
  }, [task])

  if (!task) return null

  async function savePatch(patch: TaskPatch) {
    setIsBusy(true)
    setError(null)
    try {
      const updated = await poluxApi.updateTask(task!.id, patch)
      // Terminer une étape confiée coche l'étape (et peut terminer) la tâche parente.
      if (patch.status !== undefined && updated.parent_step) onTasksChanged?.(await poluxApi.getTasks())
      onUpdated(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleSaveDates() {
    await savePatch({
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
    })
    setDateMenuOpen(false)
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer la tâche "${task!.title}" ?`)) return
    setIsBusy(true)
    try {
      await poluxApi.deleteTask(task!.id)
      onDeleted(task!.id)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleAddComment() {
    const body = commentBody.trim()
    if (!body) return
    setIsBusy(true)
    try {
      const comment = await poluxApi.addComment(task!.id, body, mentionedUserIds)
      const refreshedTask: PoluxTask = { ...task!, comments: [...task!.comments, comment] }
      onUpdated(refreshedTask)
      setCommentBody('')
      setMentionedUserIds([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  function handleAssignedMentionAdded() {
    setMentionedUserIds((prev) => Array.from(new Set([...prev, ...task!.assigned_to_ids])))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setIsBusy(true)
    setError(null)
    try {
      const updated = await poluxApi.uploadAttachments(task!.id, Array.from(files))
      onUpdated(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteAttachment(attachmentId: number) {
    setIsBusy(true)
    setError(null)
    try {
      await poluxApi.deleteAttachment(attachmentId)
      const refreshedTask: PoluxTask = { ...task!, attachments: task!.attachments.filter((a) => a.id !== attachmentId) }
      onUpdated(refreshedTask)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  const isRequester = users.find((u) => u.id === task.created_by)?.email === sdpUser?.email

  function applyFreshTasks(freshTasks: PoluxTask[]) {
    onTasksChanged?.(freshTasks)
    const updated = freshTasks.find((t) => t.id === task!.id)
    if (updated) onUpdated(updated)
  }

  async function handleStepMetaChange(item: PoluxChecklistItem, patch: Partial<StepMeta>) {
    setLocalChecklist((prev) => prev.map((c) => (c.id === item.id ? { ...c, ...patch } : c)))
    setError(null)
    try {
      applyFreshTasks(await poluxApi.updateChecklistItemMeta(task!.id, item.id, patch))
    } catch (err) {
      setLocalChecklist((prev) => prev.map((c) => (c.id === item.id ? item : c)))
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  async function handleAssignChecklistItem(item: PoluxChecklistItem, assignment: ChecklistAssignment) {
    setError(null)
    try {
      applyFreshTasks(await poluxApi.assignChecklistItem(task!.id, item.id, assignment))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  // Mise à jour optimiste : l'UI réagit immédiatement (ajout/coché/suppression), l'appel
  // réseau se fait en arrière-plan et on annule localement en cas d'échec seulement.
  async function handleAddChecklistItem() {
    const label = checklistLabel.trim()
    if (!label) return
    const tempId = -Date.now()
    const tempItem: PoluxChecklistItem = { id: tempId, task_id: task!.id, label, done: false, created_at: new Date().toISOString() }
    setLocalChecklist((prev) => [...prev, tempItem])
    setChecklistLabel('')
    const options = { ...newStepAssignment, ...newStepMeta }
    setNewStepAssignment(NO_ASSIGNMENT)
    setNewStepMeta(NO_META)
    setError(null)
    try {
      applyFreshTasks(await poluxApi.addChecklistItem(task!.id, label, options))
    } catch (err) {
      setLocalChecklist((prev) => prev.filter((c) => c.id !== tempId))
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  async function handleToggleChecklistItem(itemId: number, done: boolean) {
    setLocalChecklist((prev) => prev.map((c) => (c.id === itemId ? { ...c, done } : c)))
    setError(null)
    try {
      applyFreshTasks(await poluxApi.toggleChecklistItem(task!.id, itemId, done))
    } catch (err) {
      setLocalChecklist((prev) => prev.map((c) => (c.id === itemId ? { ...c, done: !done } : c)))
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  async function handleDeleteChecklistItem(itemId: number) {
    const removed = localChecklist.find((c) => c.id === itemId)
    setLocalChecklist((prev) => prev.filter((c) => c.id !== itemId))
    setConfirmDeleteId(null)
    setError(null)
    try {
      applyFreshTasks(await poluxApi.deleteChecklistItem(task!.id, itemId))
    } catch (err) {
      if (removed) setLocalChecklist((prev) => [...prev, removed])
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  function formatCommentDate(iso: string): string {
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  function userLabel(userId: number | null) {
    if (!userId) return null
    const u = users.find((x) => x.id === userId)
    return u ? userDisplayName(u, sdpUser?.email) : null
  }

  return (
    <Modal
      open={!!task}
      title={task.title}
      onClose={onClose}
      maxWidthClassName="max-w-6xl"
      footer={
        <>
          <Button variant="danger" type="button" onClick={handleDelete} disabled={isBusy}>Supprimer</Button>
          <div className="flex-1" />
          <Button type="button" onClick={onClose}>Fermer</Button>
        </>
      }
    >
      <div className="grid gap-6 md:items-start md:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        {error && <div className="rounded-lg border border-red-200 bg-red-50/30 p-3 text-sm text-red-700">{error}</div>}

        {previousTask && (
          <button type="button" onClick={onBack} className="-mt-1 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500">
            <span className="material-symbols-outlined text-[18px] leading-none">arrow_back</span>
            Retour à « {previousTask.title} »
          </button>
        )}

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
                <ColorPicker
                  value={form.color ?? null}
                  onChange={(color) => { setForm((s) => ({ ...s, color })); savePatch({ color }); setColorPickerOpen(false) }}
                />
              </div>
            </>
          )}
          {editingTitle ? (
            <Input
              autoFocus
              value={form.title ?? ''}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              onBlur={() => { if (form.title && form.title !== task.title) savePatch({ title: form.title }); setEditingTitle(false) }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="text-xl font-semibold"
            />
          ) : (
            <>
              <h3 className="flex-1 truncate text-xl font-semibold text-gray-900">{form.title}</h3>
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
                title="Modifier le titre"
              >
                <span className="material-symbols-outlined text-[18px] leading-none">edit</span>
              </button>
            </>
          )}
        </div>

        <p className="-mt-3 text-xs text-gray-500">
          {task.owner_id != null ? 'Tâche personnelle' : `Assignée par ${userLabel(task.created_by) ?? 'un utilisateur inconnu'}`}
          {' · le '}{new Date(task.created_at).toLocaleDateString('fr-FR')}
          {task.parent_step && (
            <>
              {' · étape de '}
              <button type="button" onClick={() => onOpenTask?.(task.parent_step!.task_id)} className="font-medium text-indigo-600 hover:underline">
                « {task.parent_step.title} »
              </button>
            </>
          )}
        </p>

        {task.parent_step && task.status === 'en_revision' && (
          isRequester ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="flex-1 text-sm text-amber-800">
                Cette étape est terminée et attend votre validation. Une fois validée, elle sera cochée dans « {task.parent_step.title} ».
              </p>
              <Button type="button" onClick={() => savePatch({ status: 'en_cours' })} disabled={isBusy}>Refuser</Button>
              <Button variant="primary" type="button" onClick={() => savePatch({ status: 'termine' })} disabled={isBusy}>Valider</Button>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              En attente de validation par {userLabel(task.created_by) ?? 'la personne qui a confié l\'étape'}.
            </div>
          )
        )}
        {task.parent_step && !isRequester && task.status !== 'en_revision' && task.status !== 'termine' && (
          <p className="-mt-2 text-xs text-gray-500">
            Étape confiée par {userLabel(task.created_by) ?? 'un collègue'} : la passer en « Terminé » lui demande sa validation.
          </p>
        )}

        <div className="-mt-2 flex flex-wrap items-center gap-2">
          {/* Une checklist qui contient déjà des sous-tâches ne se referme pas : la vider les supprimerait. */}
          <button
            type="button"
            onClick={() => (!checklistOpen || localChecklist.length === 0) && setChecklistOpen((o) => !o)}
            className={toggleButtonClass(checklistOpen)}
            title={checklistOpen && localChecklist.length > 0 ? 'Supprimez les sous-tâches pour retirer la checklist' : undefined}
          >
            + checklist
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setDateMenuOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-indigo-400 hover:text-indigo-600"
            >
              <span className="material-symbols-outlined text-[16px] leading-none">calendar_month</span>
              {task.start_date && task.deadline
                ? `${formatDeadline(task.start_date)} → ${formatDeadline(task.deadline)}`
                : task.deadline
                ? formatDeadline(task.deadline)
                : 'Date limite'}
            </button>
            {dateMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDateMenuOpen(false)} />
                <div className="absolute left-0 top-9 z-20 w-64 space-y-3 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                  <div className="space-y-1">
                    <Label>Échéance</Label>
                    <Input
                      type="date"
                      autoFocus
                      value={form.deadline ?? ''}
                      onChange={(e) => setForm((s) => ({ ...s, deadline: e.target.value || null }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Date de début (optionnel)</Label>
                    <Input
                      type="date"
                      value={form.start_date ?? ''}
                      onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value || null }))}
                    />
                  </div>
                  <Button variant="primary" type="button" onClick={handleSaveDates} className="w-full justify-center">
                    Enregistrer
                  </Button>
                </div>
              </>
            )}
          </div>

          <AssigneePicker
            compact
            users={users}
            selectedIds={form.assigned_to_ids ?? []}
            onChange={(ids) => { setForm((s) => ({ ...s, assigned_to_ids: ids })); savePatch({ assigned_to_ids: ids }) }}
          />

          <button
            type="button"
            onClick={() => {
              if (leadOpen && task.lead_id != null) savePatch({ lead_id: null })
              setLeadOpen((o) => !o)
            }}
            className={toggleButtonClass(leadOpen)}
          >
            + client
          </button>
        </div>

        {leadOpen && (
          <div className="space-y-2">
            <Label>Client</Label>
            <LeadPicker
              value={task.lead_id ?? null}
              initialLead={task.lead}
              onChange={(leadId) => leadId !== (task.lead_id ?? null) && savePatch({ lead_id: leadId })}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Description</Label>
          <textarea
            value={form.description ?? ''}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            onBlur={() => form.description !== task.description && savePatch({ description: form.description })}
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            placeholder="Description de la tâche..."
          />
        </div>

        <div className="space-y-2">
          <Label>Projet</Label>
          <ProjectPicker
            value={form.project_name ?? ''}
            existingProjects={existingProjects}
            onChange={(v) => setForm((s) => ({ ...s, project_name: v }))}
            onCommit={(v) => v !== (task.project_name ?? '') && savePatch({ project_name: v || null })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Priorité</Label>
            <select
              value={form.priority}
              onChange={(e) => { const v = e.target.value as PoluxTask['priority']; setForm((s) => ({ ...s, priority: v })); savePatch({ priority: v }) }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Statut</Label>
            <select
              value={form.status}
              onChange={(e) => { const v = e.target.value as PoluxTask['status']; setForm((s) => ({ ...s, status: v })); savePatch({ status: v }) }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

        </div>

        {checklistOpen && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Checklist{localChecklist.length > 0 && ` (${localChecklist.filter((c) => c.done).length}/${localChecklist.length})`}</Label>
          </div>
          <div className="space-y-1">
            {localChecklist.map((c) => (
              <div key={c.id} className="group flex flex-wrap items-center gap-2 rounded-lg px-1 py-1 hover:bg-white/60">
                <label className="flex min-w-[10rem] flex-1 items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={c.done}
                    onChange={(e) => handleToggleChecklistItem(c.id, e.target.checked)}
                    style={{ accentColor: '#10b981' }}
                    className="h-4 w-4 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <span className={`flex-1 text-sm transition-colors ${c.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{c.label}</span>
                </label>
                {c.linked_task && (
                  <button
                    type="button"
                    onClick={() => onOpenTask?.(c.linked_task!.id)}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80 ${
                      c.linked_task.status === 'en_revision' ? 'bg-amber-500 text-white' : STATUS_CLASS[c.linked_task.status]
                    }`}
                    title="Ouvrir la tâche de cette étape"
                  >
                    {c.linked_task.status === 'en_revision' ? 'À valider' : STATUS_LABEL[c.linked_task.status]} ↗
                  </button>
                )}
                {c.id > 0 && (
                  <StepMetaControls
                    deadline={c.deadline ?? null}
                    priority={c.priority ?? null}
                    status={c.done ? 'termine' : 'a_faire'}
                    onChange={(patch) => handleStepMetaChange(c, patch)}
                  />
                )}
                {c.id > 0 && (
                  <AssigneePicker
                    iconOnly
                    users={users}
                    teams={teams}
                    selectedTeamId={c.linked_task?.team_id ?? null}
                    selectedIds={c.linked_task?.assigned_to_ids ?? []}
                    onTeamChange={(team_id) => handleAssignChecklistItem(c, { team_id, assigned_to_ids: c.linked_task?.assigned_to_ids ?? [] })}
                    onChange={(assigned_to_ids) => handleAssignChecklistItem(c, { team_id: c.linked_task?.team_id ?? null, assigned_to_ids })}
                  />
                )}
                <button
                  type="button"
                  onClick={() => (confirmDeleteId === c.id ? handleDeleteChecklistItem(c.id) : setConfirmDeleteId(c.id))}
                  onBlur={() => setConfirmDeleteId((id) => (id === c.id ? null : id))}
                  className={
                    confirmDeleteId === c.id
                      ? 'shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white transition-colors'
                      : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600'
                  }
                  title="Supprimer"
                >
                  {confirmDeleteId === c.id ? 'Supprimer' : <span className="material-symbols-outlined text-[18px] leading-none">more_vert</span>}
                </button>
              </div>
            ))}
            {localChecklist.length === 0 && <p className="text-sm text-gray-600">Aucune sous-tâche.</p>}
          </div>
          {localChecklist.length > 0 && (
            <p className="text-xs text-gray-500">
              Une étape confiée à une équipe ou à une personne devient une tâche dans son espace ; elle se coche quand cette tâche est terminée.
              Une fois toutes les étapes validées, la tâche passe automatiquement en "Terminé".
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={checklistLabel}
              onChange={(e) => setChecklistLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
              placeholder="Ajouter une sous-tâche..."
              className="min-w-[12rem] flex-1"
            />
            <StepMetaControls
              deadline={newStepMeta.deadline}
              priority={newStepMeta.priority}
              onChange={(patch) => setNewStepMeta((m) => ({ ...m, ...patch }))}
            />
            <AssigneePicker
              iconOnly
              users={users}
              teams={teams}
              selectedTeamId={newStepAssignment.team_id}
              selectedIds={newStepAssignment.assigned_to_ids}
              onTeamChange={(team_id) => setNewStepAssignment((a) => ({ ...a, team_id }))}
              onChange={(assigned_to_ids) => setNewStepAssignment((a) => ({ ...a, assigned_to_ids }))}
            />
            <Button variant="primary" type="button" onClick={handleAddChecklistItem} disabled={!checklistLabel.trim()}>Ajouter</Button>
          </div>
        </div>
        )}

        <div className="space-y-2">
          <Label>Pièces jointes</Label>
          <div className="space-y-1">
            {task.attachments.map((a, i) => (
              <div key={a.id} className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setViewerIndex(i)} className="flex min-w-0 items-center gap-2 text-left text-sm text-indigo-600 hover:text-indigo-500">
                  {isImage(a) ? (
                    <img src={a.url} alt="" className="h-9 w-9 shrink-0 rounded object-cover ring-1 ring-gray-200" />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white text-[10px] font-semibold uppercase text-gray-500 ring-1 ring-gray-200">
                      {a.filename.split('.').pop()?.slice(0, 4) ?? 'fichier'}
                    </span>
                  )}
                  <span className="truncate">{a.filename}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(a.id)}
                  disabled={isBusy}
                  className="text-xs text-red-700 hover:text-red-600 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            ))}
            {task.attachments.length === 0 && <p className="text-sm text-gray-600">Aucune pièce jointe.</p>}
          </div>
          <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="text-xs text-gray-600" disabled={isBusy} />
          {viewerIndex !== null && (
            <AttachmentViewer
              attachments={task.attachments}
              index={viewerIndex}
              onIndexChange={setViewerIndex}
              onClose={() => setViewerIndex(null)}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col border-l border-gray-200 pl-6 md:h-[560px]">
        <Label>Discussion</Label>
        <div className="mt-2 shrink-0 flex flex-col gap-2">
          <MentionInput
            value={commentBody}
            onChange={setCommentBody}
            users={users}
            placeholder="Ajouter un commentaire..."
            onMentionAdded={(userId) => setMentionedUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]))}
            onAssignedMentionAdded={handleAssignedMentionAdded}
          />
          {commentBody.trim() && (
            <Button variant="primary" type="button" onClick={handleAddComment} disabled={isBusy}>Envoyer</Button>
          )}
          <p className="text-xs text-gray-500">Tape @ pour mentionner une personne, ou @Personnes assignées pour notifier tous les assignés.</p>
        </div>
        <div className="mt-3 flex-1 space-y-2 overflow-y-auto border-t border-gray-200 pt-3">
          {[...task.comments].reverse().map((c) => (
            <div key={c.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-medium text-gray-900">{userLabel(c.user_id) ?? 'Utilisateur'}</p>
                <p className="text-[11px] text-gray-400">{formatCommentDate(c.created_at)}</p>
              </div>
              <p className="text-sm text-gray-700"><CommentBody body={c.body} users={users} /></p>
            </div>
          ))}
          {task.comments.length === 0 && <p className="text-sm text-gray-600">Aucun commentaire.</p>}
        </div>
      </div>
      </div>
    </Modal>
  )
}
