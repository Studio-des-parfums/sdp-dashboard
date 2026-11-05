import { useEffect, useState } from 'react'
import { Modal } from '../ui/lylo/Modal'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxTeam } from '../../types/polux'
import type { Project } from '../../types'
import { useToast } from '../ui/Toast'

interface ManageWorkspaceTeamsModalProps {
  open: boolean
  workspace: Project
  workspaces: Project[]
  onClose: () => void
  /** Appelé après un ajout ou un retrait, pour rafraîchir la sidebar. */
  onChanged: () => void
}

// Gestion des équipes d'un espace Polux (admin) : retirer une équipe, ou en reprendre depuis
// un autre espace à tout moment. Les équipes reprises sont des copies indépendantes.
export function ManageWorkspaceTeamsModal({ open, workspace, workspaces, onClose, onChanged }: ManageWorkspaceTeamsModalProps) {
  const { showSuccess, showError } = useToast()
  const [teams, setTeams] = useState<PoluxTeam[]>([])
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [sourceSlug, setSourceSlug] = useState('')
  const [sourceTeams, setSourceTeams] = useState<PoluxTeam[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const otherWorkspaces = workspaces.filter((w) => w.slug !== workspace.slug)
  const existingSlugs = new Set(teams.map((t) => t.slug))

  function loadTeams() {
    poluxApi.getWorkspaceTeams(workspace.slug).then(setTeams).catch((err: any) => showError('Équipes introuvables', err.message))
  }

  useEffect(() => {
    if (!open) return
    loadTeams()
    setConfirmRemoveId(null)
    setSourceSlug('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workspace.slug])

  useEffect(() => {
    setSourceTeams([])
    setSelectedIds([])
    if (!sourceSlug) return
    poluxApi.getWorkspaceTeams(sourceSlug).then(setSourceTeams).catch((err: any) => showError('Équipes introuvables', err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceSlug])

  async function remove(team: PoluxTeam) {
    setBusy(true)
    try {
      await poluxApi.deleteTeam(team.id)
      setTeams((prev) => prev.filter((t) => t.id !== team.id))
      setConfirmRemoveId(null)
      onChanged()
      showSuccess('Équipe retirée', team.name)
    } catch (err: any) {
      showError("Échec du retrait de l'équipe", err.message)
    } finally {
      setBusy(false)
    }
  }

  async function importSelected() {
    if (selectedIds.length === 0) return
    setBusy(true)
    try {
      const { copied } = await poluxApi.importTeams(workspace.slug, sourceSlug, selectedIds)
      setSelectedIds([])
      loadTeams()
      onChanged()
      showSuccess('Équipes ajoutées', `${copied} équipe(s) reprise(s)`)
    } catch (err: any) {
      showError("Échec de l'ajout des équipes", err.message)
    } finally {
      setBusy(false)
    }
  }

  const toggle = (id: number) => setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  return (
    <Modal open={open} title={`Équipes de ${workspace.name}`} onClose={onClose} maxWidthClassName="max-w-lg">
      <div className="space-y-6 text-sm">
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Équipes de l'espace</h3>
          {teams.length === 0 && <p className="text-gray-500">Aucune équipe pour l'instant.</p>}
          {teams.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="flex-1 text-gray-900">{t.name}</span>
              <span className="text-xs text-gray-400">{t.member_ids.length} membre(s)</span>
              {t.is_official ? (
                <span className="text-xs text-gray-400" title="Équipe officielle : gérée dans Admin → Équipes">Officielle</span>
              ) : confirmRemoveId === t.id ? (
                <>
                  <button onClick={() => remove(t)} disabled={busy} className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-500 disabled:opacity-50">Confirmer</button>
                  <button onClick={() => setConfirmRemoveId(null)} className="px-1 text-xs text-gray-500 hover:text-gray-900">Annuler</button>
                </>
              ) : (
                <button onClick={() => setConfirmRemoveId(t.id)} className="rounded-md px-2 py-1 text-xs text-red-700 hover:bg-red-600/10">Retirer</button>
              )}
            </div>
          ))}
          {confirmRemoveId !== null && <p className="text-xs text-red-700">Retirer une équipe supprime aussi ses tâches dans cet espace.</p>}
        </section>

        {otherWorkspaces.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Reprendre des équipes d'un autre espace</h3>
            <select value={sourceSlug} onChange={(e) => setSourceSlug(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
              <option value="">Choisir un espace…</option>
              {otherWorkspaces.map((w) => <option key={w.slug} value={w.slug}>{w.name}</option>)}
            </select>
            {sourceSlug && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
                {sourceTeams.map((t) => {
                  const already = existingSlugs.has(t.slug)
                  return (
                    <label key={t.id} className={`flex items-center gap-2 px-3 py-1.5 ${already ? 'text-gray-400' : 'cursor-pointer text-gray-700 hover:bg-gray-50'}`}>
                      <input type="checkbox" disabled={already} checked={selectedIds.includes(t.id)} onChange={() => toggle(t.id)} />
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                      {t.name}
                      <span className="ml-auto text-xs">{already ? 'déjà présente' : `${t.member_ids.length} membre(s)`}</span>
                    </label>
                  )
                })}
                {sourceTeams.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">Aucune équipe dans cet espace</p>}
              </div>
            )}
            {sourceSlug && (
              <button onClick={importSelected} disabled={busy || selectedIds.length === 0} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50">
                Ajouter {selectedIds.length > 0 ? `${selectedIds.length} équipe(s)` : 'les équipes'}
              </button>
            )}
          </section>
        )}
        <p className="text-xs text-gray-500">Pour créer une nouvelle équipe, utilisez « Ajouter une équipe » dans la barre latérale.</p>
      </div>
    </Modal>
  )
}
