import { useState } from 'react'
import { Button } from '../ui/lylo/Button'
import { Input } from '../ui/lylo/Input'
import { Label } from '../ui/lylo/Label'
import { Modal } from '../ui/lylo/Modal'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxTask, PoluxUserRef } from '../../types/polux'
import { PRIORITY_LABEL } from './priority'
import { AssigneePicker } from './AssigneePicker'
import { ColorPicker } from './ColorPicker'

interface CreateTaskModalProps {
  open: boolean
  teamId: number
  users: PoluxUserRef[]
  onClose: () => void
  onCreated: (task: PoluxTask) => void
}

function emptyForm() {
  return { title: '', description: '', projectName: '', assignedToIds: [] as number[], priority: 'moyenne' as PoluxTask['priority'], color: null as string | null, startDate: '', deadline: '' }
}

export function CreateTaskModal({ open, teamId, users, onClose, onCreated }: CreateTaskModalProps) {
  const [form, setForm] = useState(emptyForm())
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!form.title.trim()) return
    setIsBusy(true)
    setError(null)
    try {
      const task = await poluxApi.createTask({
        team_id: teamId,
        title: form.title.trim(),
        description: form.description.trim(),
        project_name: form.projectName.trim() || null,
        assigned_to_ids: form.assignedToIds,
        priority: form.priority,
        color: form.color,
        start_date: form.startDate ? new Date(form.startDate).toISOString() : null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      })
      onCreated(task)
      setForm(emptyForm())
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
        <div className="space-y-2">
          <Label>Projet</Label>
          <Input value={form.projectName} onChange={(e) => setForm((s) => ({ ...s, projectName: e.target.value }))} placeholder="Nom du projet (optionnel)" />
        </div>
        <div className="space-y-2">
          <Label>Couleur</Label>
          <ColorPicker value={form.color} onChange={(color) => setForm((s) => ({ ...s, color }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Assigné à</Label>
            <AssigneePicker users={users} selectedIds={form.assignedToIds} onChange={(ids) => setForm((s) => ({ ...s, assignedToIds: ids }))} />
          </div>
          <div className="space-y-2">
            <Label>Priorité</Label>
            <select value={form.priority} onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value as PoluxTask['priority'] }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Date de début</Label>
            <Input type="date" value={form.startDate} onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))} />
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
