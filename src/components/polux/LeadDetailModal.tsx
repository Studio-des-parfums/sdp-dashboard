import { useState } from 'react'
import { Button } from '../ui/lylo/Button'
import { Input } from '../ui/lylo/Input'
import { Label } from '../ui/lylo/Label'
import { Modal } from '../ui/lylo/Modal'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxLead, PoluxUserRef } from '../../types/polux'
import { LEAD_CONTACT_TYPE_LABEL, LEAD_STATUS_LABEL, formatLeadDate } from './leadStatus'
import { toDateInputValue } from './priority'

interface LeadDetailModalProps {
  lead: PoluxLead | null
  users: PoluxUserRef[]
  onClose: () => void
  onUpdated: (lead: PoluxLead) => void
  onDeleted: (leadId: number) => void
}

export function LeadDetailModal({ lead, users, onClose, onUpdated, onDeleted }: LeadDetailModalProps) {
  const [newNote, setNewNote] = useState('')
  const [nextFollowUp, setNextFollowUp] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  if (!lead) return null

  const author = (id: number) => users.find((u) => u.id === id)

  async function changeStatus(status: PoluxLead['status']) {
    setIsBusy(true)
    try {
      const updated = await poluxApi.updateLead(lead!.id, { status })
      onUpdated(updated)
    } finally {
      setIsBusy(false)
    }
  }

  async function changeAssignee(assigned_to_id: number | null) {
    setIsBusy(true)
    try {
      const updated = await poluxApi.updateLead(lead!.id, { assigned_to_id })
      onUpdated(updated)
    } finally {
      setIsBusy(false)
    }
  }

  async function saveFollowUp() {
    if (!nextFollowUp) return
    setIsBusy(true)
    try {
      const updated = await poluxApi.updateLead(lead!.id, { next_follow_up_at: new Date(nextFollowUp).toISOString() })
      onUpdated(updated)
      setNextFollowUp('')
    } finally {
      setIsBusy(false)
    }
  }

  async function addNote() {
    if (!newNote.trim()) return
    setIsBusy(true)
    try {
      const interaction = await poluxApi.addLeadInteraction(lead!.id, newNote.trim())
      onUpdated({ ...lead!, interactions: [...lead!.interactions, interaction] })
      setNewNote('')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Supprimer définitivement ce lead ?')) return
    setIsBusy(true)
    try {
      await poluxApi.deleteLead(lead!.id)
      onDeleted(lead!.id)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Modal
      open={!!lead}
      title={`${lead.first_name} ${lead.last_name}`}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      footer={
        <>
          <Button variant="danger" type="button" onClick={handleDelete} disabled={isBusy}>Supprimer</Button>
          <Button type="button" onClick={onClose}>Fermer</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700">
            {LEAD_CONTACT_TYPE_LABEL[lead.contact_type]}
          </span>
          {lead.company && (
            <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700">
              {lead.company}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Numéro : </span><span className="text-gray-900">{lead.phone}</span></div>
          <div><span className="text-gray-500">Mail : </span><span className="text-gray-900">{lead.email || '—'}</span></div>
          <div><span className="text-gray-500">Projet : </span><span className="text-gray-900">{lead.project_name || '—'}</span></div>
          <div><span className="text-gray-500">Date du projet : </span><span className="text-gray-900">{formatLeadDate(lead.project_date)}</span></div>
          <div><span className="text-gray-500">1er acompte : </span><span className="text-gray-900">{formatLeadDate(lead.first_deposit_date)}</span></div>
          <div><span className="text-gray-500">2e acompte : </span><span className="text-gray-900">{formatLeadDate(lead.second_deposit_date)}</span></div>
          <div><span className="text-gray-500">Date de l'appel : </span><span className="text-gray-900">{formatLeadDate(lead.call_date)}</span></div>
        </div>

        {lead.info && (
          <div>
            <Label>Information</Label>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{lead.info}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Statut</Label>
            <select
              value={lead.status}
              disabled={isBusy}
              onChange={(e) => changeStatus(e.target.value as PoluxLead['status'])}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              {Object.entries(LEAD_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Assigné à</Label>
            <select
              value={lead.assigned_to_id ?? ''}
              disabled={isBusy}
              onChange={(e) => changeAssignee(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Non assigné</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Prochaine relance</Label>
          <div className="flex gap-2">
            <Input type="date" value={nextFollowUp || toDateInputValue(lead.next_follow_up_at)} onChange={(e) => setNextFollowUp(e.target.value)} />
            <Button type="button" onClick={saveFollowUp} disabled={isBusy || !nextFollowUp}>Enregistrer</Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Suivi</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
            {lead.interactions.length === 0 && <p className="text-sm text-gray-500">Aucune interaction enregistrée.</p>}
            {lead.interactions.map((i) => (
              <div key={i.id} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                <p className="text-sm text-gray-900">{i.body}</p>
                <p className="text-xs text-gray-500">{author(i.author_id)?.first_name ?? 'Utilisateur'} — {formatLeadDate(i.created_at)}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Ajouter une note de suivi (relance, échange...)" />
            <Button type="button" onClick={addNote} disabled={isBusy || !newNote.trim()}>Ajouter</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
