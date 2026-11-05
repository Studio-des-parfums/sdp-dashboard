import { useEffect, useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { adminClient } from '../../api/adminClient'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxTeam } from '../../types/polux'
import type { Project } from '../../types'
import { useToast } from '../ui/Toast'

// Nouvel espace Polux : crée le projet (accès gérés ensuite sur la carte de chaque utilisateur,
// « Accès projets »), puis l'espace dans Polux — vide ou avec une copie des équipes d'un espace.
interface NewWorkspaceButtonProps {
  projects: Project[]
  onCreated: (p: Project) => void
  /** Bouton déclencheur : par défaut le gros bouton de l'admin ; `renderTrigger` pour un autre rendu (menu). */
  renderTrigger?: (toggle: () => void) => ReactNode
}

export function NewWorkspaceButton({ projects, onCreated, renderTrigger }: NewWorkspaceButtonProps) {
  const { showSuccess, showError } = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', color: '#6366f1', copyTeamsFrom: '' })
  const [sourceTeams, setSourceTeams] = useState<PoluxTeam[]>([])
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([])
  const poluxProjects = projects.filter(p => p.kind === 'polux')

  // Espace source choisi : on charge ses équipes, toutes cochées par défaut.
  useEffect(() => {
    setSourceTeams([])
    setSelectedTeamIds([])
    if (!form.copyTeamsFrom) return
    poluxApi.getWorkspaceTeams(form.copyTeamsFrom)
      .then(teams => { setSourceTeams(teams); setSelectedTeamIds(teams.map(t => t.id)) })
      .catch((err: any) => showError('Équipes introuvables', err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.copyTeamsFrom])

  const toggleTeam = (id: number) =>
    setSelectedTeamIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])

  const create = async () => {
    if (!form.name.trim()) {
      showError('Nom requis', "Donnez un nom à l'espace.")
      return
    }
    setSaving(true)
    let project: Project | null = null
    try {
      project = await adminClient.createPoluxWorkspace({ name: form.name.trim(), color: form.color })
      await poluxApi.createWorkspace({ slug: project.slug, name: project.name, color: form.color, copy_teams_from: form.copyTeamsFrom && selectedTeamIds.length > 0 ? form.copyTeamsFrom : null, copy_team_ids: selectedTeamIds })
      onCreated(project)
      setOpen(false)
      setForm({ name: '', color: '#6366f1', copyTeamsFrom: '' })
      showSuccess('Espace créé', `${project.name} — donnez l'accès aux personnes depuis l'onglet Utilisateurs`)
    } catch (err: any) {
      if (project) await adminClient.deletePoluxWorkspace(project.id).catch(() => {})
      showError("Échec de la création de l'espace", err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative">
      {renderTrigger ? renderTrigger(() => setOpen(o => !o)) : (
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm transition-colors"><Plus size={14} /> Nouvel espace Polux</button>
      )}
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
          <label className="block text-sm">
            <span className="text-gray-600">Nom de l'espace</span>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex. Salon 2027" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Couleur</span>
            <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-8 w-12 rounded border border-gray-300" />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Équipes</span>
            <select value={form.copyTeamsFrom} onChange={e => setForm(f => ({ ...f, copyTeamsFrom: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
              <option value="">Partir de zéro</option>
              {poluxProjects.map(p => <option key={p.slug} value={p.slug}>Reprendre des équipes de {p.name}</option>)}
            </select>
          </label>
          {form.copyTeamsFrom && (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
              {sourceTeams.length > 1 && (
                <button type="button" onClick={() => setSelectedTeamIds(selectedTeamIds.length === sourceTeams.length ? [] : sourceTeams.map(t => t.id))} className="w-full px-3 py-1.5 text-left text-xs text-indigo-600 hover:bg-gray-50">
                  {selectedTeamIds.length === sourceTeams.length ? 'Tout décocher' : 'Tout cocher'}
                </button>
              )}
              {sourceTeams.map(t => (
                <label key={t.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                  <input type="checkbox" checked={selectedTeamIds.includes(t.id)} onChange={() => toggleTeam(t.id)} />
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                  <span className="ml-auto text-xs text-gray-400">{t.member_ids.length}</span>
                </label>
              ))}
              {sourceTeams.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">Aucune équipe dans cet espace</p>}
            </div>
          )}
          <p className="text-xs text-gray-500">Les équipes reprises sont copiées : les modifier n'affecte pas l'espace d'origine.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg text-sm transition-colors">Annuler</button>
            <button onClick={create} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">{saving ? 'Création…' : "Créer l'espace"}</button>
          </div>
        </div>
      )}
    </div>
  )
}
