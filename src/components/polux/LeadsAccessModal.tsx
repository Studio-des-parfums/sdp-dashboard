import { useState } from 'react'
import { Button } from '../ui/lylo/Button'
import { Label } from '../ui/lylo/Label'
import { Modal } from '../ui/lylo/Modal'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxUserRef } from '../../types/polux'

interface LeadsAccessModalProps {
  open: boolean
  members: PoluxUserRef[]
  candidates: PoluxUserRef[]
  onClose: () => void
  onAdded: (userId: number) => void
  onRemoved: (userId: number) => void
}

// Membres de l'espace Leads/Prospects — même fonctionnement que les membres d'équipe
// (TeamMembersModal) : select pour ajouter, liste avec bouton "Retirer". Les admins ont
// toujours accès même sans figurer dans cette liste.
export function LeadsAccessModal({ open, members, candidates, onClose, onAdded, onRemoved }: LeadsAccessModalProps) {
  const [selectedId, setSelectedId] = useState<number | ''>('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!selectedId) return
    setIsBusy(true)
    setError(null)
    try {
      await poluxApi.addLeadsAccessMember(selectedId)
      onAdded(selectedId)
      setSelectedId('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleRemove(userId: number) {
    setIsBusy(true)
    setError(null)
    try {
      await poluxApi.removeLeadsAccessMember(userId)
      onRemoved(userId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Membres"
      onClose={onClose}
      maxWidthClassName="max-w-md"
      footer={<Button type="button" onClick={onClose}>Fermer</Button>}
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50/30 p-3 text-sm text-red-700">{error}</div>}
        <p className="text-xs text-gray-500">Les administrateurs ont toujours accès à cette page, en plus des personnes listées ici.</p>

        <div className="space-y-2">
          <Label>Membres actuels ({members.length})</Label>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                <span className="text-sm text-gray-900">{m.first_name} {m.last_name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(m.id)}
                  disabled={isBusy}
                  className="text-xs text-red-700 hover:text-red-600 disabled:opacity-50"
                >
                  Retirer
                </button>
              </div>
            ))}
            {members.length === 0 && <p className="text-sm text-gray-500">Aucun membre (hors admins).</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Ajouter un membre</Label>
          <div className="flex gap-2">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Sélectionner une personne</option>
              {candidates.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
            <Button variant="primary" type="button" onClick={handleAdd} disabled={isBusy || !selectedId}>Ajouter</Button>
          </div>
          {candidates.length === 0 && <p className="text-xs text-gray-500">Tout le monde est déjà membre.</p>}
        </div>
      </div>
    </Modal>
  )
}
