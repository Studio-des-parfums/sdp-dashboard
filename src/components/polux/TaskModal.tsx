import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/lylo/Button'
import { Input } from '../ui/lylo/Input'
import { Label } from '../ui/lylo/Label'
import { Modal } from '../ui/lylo/Modal'
import { poluxApi, type TaskPatch } from '../../api/poluxClient'
import type { PoluxChecklistItem, PoluxTask, PoluxUserRef } from '../../types/polux'
import { formatDeadline, PRIORITY_LABEL, STATUS_LABEL, toDateInputValue } from './priority'
import { MentionInput } from './MentionInput'
import { AssigneePicker } from './AssigneePicker'
import { ColorPicker } from './ColorPicker'
import { ProjectPicker } from './ProjectPicker'
import { CommentBody } from './CommentBody'

interface TaskModalProps {
  task: PoluxTask | null
  users: PoluxUserRef[]
  existingProjects?: string[]
  onClose: () => void
  onUpdated: (task: PoluxTask) => void
  onDeleted: (taskId: number) => void
}

export function TaskModal({ task, users, existingProjects = [], onClose, onUpdated, onDeleted }: TaskModalProps) {
  const [form, setForm] = useState<TaskPatch>({})
  const [editingTitle, setEditingTitle] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [dateMenuOpen, setDateMenuOpen] = useState(false)
  const [checklistLabel, setChecklistLabel] = useState('')
  const [localChecklist, setLocalChecklist] = useState<PoluxChecklistItem[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [commentBody, setCommentBody] = useState('')
  const [mentionedUserIds, setMentionedUserIds] = useState<number[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!task) return
    setLocalChecklist(task.checklist)
    setChecklistOpen(task.checklist.length > 0)
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
    setError(null)
  }, [task])

  if (!task) return null

  async function savePatch(patch: TaskPatch) {
    setIsBusy(true)
    setError(null)
    try {
      const updated = await poluxApi.updateTask(task!.id, patch)
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

  // Mise à jour optimiste : l'UI réagit immédiatement (ajout/coché/suppression), l'appel
  // réseau se fait en arrière-plan et on annule localement en cas d'échec seulement.
  async function handleAddChecklistItem() {
    const label = checklistLabel.trim()
    if (!label) return
    const tempId = -Date.now()
    const tempItem: PoluxChecklistItem = { id: tempId, task_id: task!.id, label, done: false, created_at: new Date().toISOString() }
    setLocalChecklist((prev) => [...prev, tempItem])
    setChecklistLabel('')
    setError(null)
    try {
      const updated = await poluxApi.addChecklistItem(task!.id, label)
      onUpdated(updated)
    } catch (err) {
      setLocalChecklist((prev) => prev.filter((c) => c.id !== tempId))
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  async function handleToggleChecklistItem(itemId: number, done: boolean) {
    setLocalChecklist((prev) => prev.map((c) => (c.id === itemId ? { ...c, done } : c)))
    setError(null)
    try {
      const updated = await poluxApi.toggleChecklistItem(task!.id, itemId, done)
      onUpdated(updated)
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
      const updated = await poluxApi.deleteChecklistItem(task!.id, itemId)
      onUpdated(updated)
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
    return u ? `${u.first_name} ${u.last_name}` : null
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

        <div className="-mt-2 flex flex-wrap items-center gap-2">
          {!checklistOpen && (
            <button
              type="button"
              onClick={() => setChecklistOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-indigo-400 hover:text-indigo-600"
            >
              + checklist
            </button>
          )}

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
        </div>

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
            {localChecklist.length === 0 && (
              <button type="button" onClick={() => setChecklistOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">
                Annuler
              </button>
            )}
          </div>
          <div className="space-y-1">
            {localChecklist.map((c) => (
              <div key={c.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-white/60">
                <label className="flex flex-1 items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={c.done}
                    onChange={(e) => handleToggleChecklistItem(c.id, e.target.checked)}
                    style={{ accentColor: '#10b981' }}
                    className="h-4 w-4 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <span className={`flex-1 text-sm transition-colors ${c.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{c.label}</span>
                </label>
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
            <p className="text-xs text-gray-500">Une fois toutes les sous-tâches validées, la tâche passe automatiquement en "Terminé".</p>
          )}
          <div className="flex gap-2">
            <Input
              value={checklistLabel}
              onChange={(e) => setChecklistLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
              placeholder="Ajouter une sous-tâche..."
            />
            <Button variant="primary" type="button" onClick={handleAddChecklistItem} disabled={!checklistLabel.trim()}>Ajouter</Button>
          </div>
        </div>
        )}

        <div className="space-y-2">
          <Label>Pièces jointes</Label>
          <div className="space-y-1">
            {task.attachments.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <a href={a.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:text-indigo-500">
                  {a.filename}
                </a>
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
