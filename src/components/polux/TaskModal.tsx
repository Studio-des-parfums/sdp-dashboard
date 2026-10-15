import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/lylo/Button'
import { Input } from '../ui/lylo/Input'
import { Label } from '../ui/lylo/Label'
import { Modal } from '../ui/lylo/Modal'
import { poluxApi, type TaskPatch } from '../../api/poluxClient'
import type { PoluxTask, PoluxUserRef } from '../../types/polux'
import { PRIORITY_LABEL, STATUS_LABEL } from './priority'
import { MentionInput } from './MentionInput'

interface TaskModalProps {
  task: PoluxTask | null
  users: PoluxUserRef[]
  /** Membres de l'équipe propriétaire de la tâche, pour "Notifier toute l'équipe". */
  teamMemberIds?: number[]
  onClose: () => void
  onUpdated: (task: PoluxTask) => void
  onDeleted: (taskId: number) => void
}

export function TaskModal({ task, users, teamMemberIds = [], onClose, onUpdated, onDeleted }: TaskModalProps) {
  const [form, setForm] = useState<TaskPatch>({})
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
      assigned_to: task.assigned_to,
      priority: task.priority,
      status: task.status,
      deadline: task.deadline ? task.deadline.slice(0, 10) : null,
    })
    setCommentBody('')
    setMentionedUserIds([])
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

  async function handleNotifyTeam() {
    const body = commentBody.trim()
    setIsBusy(true)
    try {
      const comment = await poluxApi.addComment(task!.id, body || '(Attire l\'attention de l\'équipe sur cette tâche)', [])
      await poluxApi.notifyTeam(task!.id, teamMemberIds, comment.id)
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsBusy(true)
    setError(null)
    try {
      const updated = await poluxApi.uploadAttachment(task!.id, file)
      onUpdated(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Assigné à</Label>
            <select
              value={form.assigned_to ?? ''}
              onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setForm((s) => ({ ...s, assigned_to: v })); savePatch({ assigned_to: v }) }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Non assignée</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
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
          <Label>Pièces jointes</Label>
          <div className="space-y-1">
            {task.attachments.map((a) => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block text-sm text-indigo-600 hover:text-indigo-500">
                {a.filename}
              </a>
            ))}
            {task.attachments.length === 0 && <p className="text-sm text-gray-600">Aucune pièce jointe.</p>}
          </div>
          <input ref={fileInputRef} type="file" onChange={handleFileChange} className="text-xs text-gray-600" disabled={isBusy} />
        </div>

        <div className="space-y-2">
          <Label>Commentaires</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {task.comments.map((c) => (
              <div key={c.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                <p className="text-xs font-medium text-gray-900">{userLabel(c.user_id) ?? 'Utilisateur'}</p>
                <p className="text-sm text-gray-700">{c.body}</p>
              </div>
            ))}
            {task.comments.length === 0 && <p className="text-sm text-gray-600">Aucun commentaire.</p>}
          </div>
          <p className="text-xs text-gray-500">Tape @ pour mentionner et notifier une personne précise.</p>
          <div className="flex gap-2">
            <MentionInput
              value={commentBody}
              onChange={setCommentBody}
              users={users}
              placeholder="Ajouter un commentaire..."
              onMentionAdded={(userId) => setMentionedUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]))}
            />
            <Button variant="primary" type="button" onClick={handleAddComment} disabled={isBusy || !commentBody.trim()}>Envoyer</Button>
          </div>
          {teamMemberIds.length > 0 && (
            <button
              type="button"
              onClick={handleNotifyTeam}
              disabled={isBusy}
              className="text-xs text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
            >
              Notifier toute l'équipe de ce commentaire
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
