import { useState } from 'react'
import { Button } from '../ui/lylo/Button'
import { Input } from '../ui/lylo/Input'
import { Label } from '../ui/lylo/Label'
import { Modal } from '../ui/lylo/Modal'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxProject, PoluxTask, PoluxUserRef } from '../../types/polux'
import { PRIORITY_LABEL } from './priority'

interface CreateTaskModalProps {
  open: boolean
  teamId: number
  projects: PoluxProject[]
  users: PoluxUserRef[]
  onClose: () => void
  onCreated: (task: PoluxTask) => void
}

function emptyForm(projectId: number) {
  return { title: '', description: '', project_id: projectId, assigned_to: '' as number | '', priority: 'moyenne' as PoluxTask['priority'], deadline: '' }
}

export function CreateTaskModal({ open, teamId, projects, users, onClose, onCreated }: CreateTaskModalProps) {
  const [form, setForm] = useState(emptyForm(projects[0]?.id ?? 0))
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!form.title.trim() || !form.project_id) return
    setIsBusy(true)
    setError(null)
    try {
      const task = await poluxApi.createTask({
        project_id: form.project_id,
        team_id: teamId,
        title: form.title.trim(),
        description: form.description.trim(),
        assigned_to: form.assigned_to === '' ? null : form.assigned_to,
        priority: form.priority,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      })
      onCreated(task)
      setForm(emptyForm(projects[0]?.id ?? 0))
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Nouvelle tâche"
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <Button type="button" onClick={onClose}>Annuler</Button>
          <Button variant="primary" type="button" onClick={submit} disabled={isBusy || !form.title.trim()}>Créer</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50/30 p-3 text-sm text-red-700">{error}</div>}
        <div className="space-y-2">
          <Label>Titre</Label>
          <Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="Titre de la tâche" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Projet</Label>
            <select value={form.project_id} onChange={(e) => setForm((s) => ({ ...s, project_id: Number(e.target.value) }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Assigné à</Label>
            <select value={form.assigned_to} onChange={(e) => setForm((s) => ({ ...s, assigned_to: e.target.value ? Number(e.target.value) : '' }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
              <option value="">Non assignée</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Priorité</Label>
            <select value={form.priority} onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value as PoluxTask['priority'] }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Échéance</Label>
            <Input type="date" value={form.deadline} onChange={(e) => setForm((s) => ({ ...s, deadline: e.target.value }))} />
          </div>
        </div>
      </div>
    </Modal>
  )
}
