import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/lylo/Button'
import { Input } from '../ui/lylo/Input'
import { Label } from '../ui/lylo/Label'
import { Modal } from '../ui/lylo/Modal'
import { poluxApi, type TaskPatch } from '../../api/poluxClient'
import type { PoluxTask, PoluxUserRef } from '../../types/polux'
import { PRIORITY_LABEL, STATUS_LABEL, toDateInputValue } from './priority'
import { MentionInput } from './MentionInput'
import { AssigneePicker } from './AssigneePicker'
import { ColorPicker } from './ColorPicker'
import { CommentBody } from './CommentBody'

interface TaskModalProps {
  task: PoluxTask | null
  users: PoluxUserRef[]
  onClose: () => void
  onUpdated: (task: PoluxTask) => void
  onDeleted: (taskId: number) => void
}

export function TaskModal({ task, users, onClose, onUpdated, onDeleted }: TaskModalProps) {
  const [form, setForm] = useState<TaskPatch>({})
  const [checklistLabel, setChecklistLabel] = useState('')
  const [commentBody, setCommentBody] = useState('')
  const [mentionedUserIds, setMentionedUserIds] = useState<number[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!task) return
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

  async function handleAddChecklistItem() {
    const label = checklistLabel.trim()
    if (!label) return
    setIsBusy(true)
    setError(null)
    try {
      const updated = await poluxApi.addChecklistItem(task!.id, label)
      onUpdated(updated)
      setChecklistLabel('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleToggleChecklistItem(itemId: number, done: boolean) {
    setIsBusy(true)
    setError(null)
    try {
      const updated = await poluxApi.toggleChecklistItem(task!.id, itemId, done)
      onUpdated(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleDeleteChecklistItem(itemId: number) {
    setIsBusy(true)
    setError(null)
    try {
      const updated = await poluxApi.deleteChecklistItem(task!.id, itemId)
      onUpdated(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
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
      maxWidthClassName="max-w-2xl"
      footer={
        <>
          <Button variant="danger" type="button" onClick={handleDelete} disabled={isBusy}>Supprimer</Button>
          <div className="flex-1" />
          <Button type="button" onClick={onClose}>Fermer</Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <div className="rounded-lg border border-red-200 bg-red-50/30 p-3 text-sm text-red-700">{error}</div>}

        <div className="space-y-2">
          <Label>Titre</Label>
          <Input
            value={form.title ?? ''}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            onBlur={() => form.title && form.title !== task.title && savePatch({ title: form.title })}
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
          <Input
            value={form.project_name ?? ''}
            onChange={(e) => setForm((s) => ({ ...s, project_name: e.target.value }))}
            onBlur={() => form.project_name !== task.project_name && savePatch({ project_name: form.project_name || null })}
            placeholder="Nom du projet (optionnel)"
          />
        </div>

        <div className="space-y-2">
          <Label>Couleur</Label>
          <ColorPicker value={form.color ?? null} onChange={(color) => { setForm((s) => ({ ...s, color })); savePatch({ color }) }} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Assigné à</Label>
            <AssigneePicker
              users={users}
              selectedIds={form.assigned_to_ids ?? []}
              onChange={(ids) => { setForm((s) => ({ ...s, assigned_to_ids: ids })); savePatch({ assigned_to_ids: ids }) }}
            />
          </div>

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

          <div className="space-y-2">
            <Label>Date de début</Label>
            <Input
              type="date"
              value={form.start_date ?? ''}
              onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value || null }))}
              onBlur={() => savePatch({ start_date: form.start_date ? new Date(form.start_date).toISOString() : null })}
            />
          </div>

          <div className="space-y-2">
            <Label>Échéance</Label>
            <Input
              type="date"
              value={form.deadline ?? ''}
              onChange={(e) => setForm((s) => ({ ...s, deadline: e.target.value || null }))}
              onBlur={() => savePatch({ deadline: form.deadline ? new Date(form.deadline).toISOString() : null })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Checklist{task.checklist.length > 0 && ` (${task.checklist.filter((c) => c.done).length}/${task.checklist.length})`}</Label>
          <div className="space-y-1">
            {task.checklist.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={(e) => handleToggleChecklistItem(c.id, e.target.checked)}
                  disabled={isBusy}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={`flex-1 text-sm ${c.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{c.label}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteChecklistItem(c.id)}
                  disabled={isBusy}
                  className="text-xs text-red-700 hover:text-red-600 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            ))}
            {task.checklist.length === 0 && <p className="text-sm text-gray-600">Aucune sous-tâche.</p>}
          </div>
          {task.checklist.length > 0 && (
            <p className="text-xs text-gray-500">Une fois toutes les sous-tâches validées, la tâche passe automatiquement en "Terminé".</p>
          )}
          <div className="flex gap-2">
            <Input
              value={checklistLabel}
              onChange={(e) => setChecklistLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
              placeholder="Ajouter une sous-tâche..."
            />
            <Button variant="primary" type="button" onClick={handleAddChecklistItem} disabled={isBusy || !checklistLabel.trim()}>Ajouter</Button>
          </div>
        </div>

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

        <div className="space-y-2">
          <Label>Commentaires</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {task.comments.map((c) => (
              <div key={c.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                <p className="text-xs font-medium text-gray-900">{userLabel(c.user_id) ?? 'Utilisateur'}</p>
                <p className="text-sm text-gray-700"><CommentBody body={c.body} users={users} /></p>
              </div>
            ))}
            {task.comments.length === 0 && <p className="text-sm text-gray-600">Aucun commentaire.</p>}
          </div>
          <p className="text-xs text-gray-500">Tape @ pour mentionner une personne, ou @Personnes assignées pour notifier tous les assignés.</p>
          <div className="flex gap-2">
            <MentionInput
              value={commentBody}
              onChange={setCommentBody}
              users={users}
              placeholder="Ajouter un commentaire..."
              onMentionAdded={(userId) => setMentionedUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]))}
              onAssignedMentionAdded={handleAssignedMentionAdded}
            />
            <Button variant="primary" type="button" onClick={handleAddComment} disabled={isBusy || !commentBody.trim()}>Envoyer</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
