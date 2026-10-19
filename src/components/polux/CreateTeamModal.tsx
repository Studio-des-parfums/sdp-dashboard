import { useState } from 'react'
import { Button } from '../ui/lylo/Button'
import { Input } from '../ui/lylo/Input'
import { Label } from '../ui/lylo/Label'
import { Modal } from '../ui/lylo/Modal'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxTeam } from '../../types/polux'

const DEFAULT_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#10b981', '#ef4444']

function defaultEndDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

interface CreateTeamModalProps {
  open: boolean
  onClose: () => void
  onCreated: (team: PoluxTeam) => void
}

export function CreateTeamModal({ open, onClose, onCreated }: CreateTeamModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLORS[0])
  const [endDate, setEndDate] = useState(defaultEndDate())
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed || !endDate) return
    setIsBusy(true)
    setError(null)
    try {
      const team = await poluxApi.createTeam({ name: trimmed, color, end_date: endDate })
      onCreated(team)
      setName('')
      setColor(DEFAULT_COLORS[0])
      setEndDate(defaultEndDate())
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
      title="Nouvelle équipe"
      onClose={onClose}
      maxWidthClassName="max-w-md"
      footer={
        <>
          <Button type="button" onClick={onClose}>Annuler</Button>
          <Button variant="primary" type="button" onClick={submit} disabled={isBusy || !name.trim() || !endDate}>Créer</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50/30 p-3 text-sm text-red-700">{error}</div>}
        <div className="space-y-2">
          <Label>Nom de l'équipe</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Design" />
        </div>
        <div className="space-y-2">
          <Label>Couleur</Label>
          <div className="flex gap-2">
            {DEFAULT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full border-2 ${color === c ? 'border-gray-900' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                aria-label={`Couleur ${c}`}
              />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Date de fin de l'espace</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <p className="text-xs text-gray-500">À cette date, on te proposera de prolonger ou de supprimer l'espace.</p>
        </div>
      </div>
    </Modal>
  )
}
