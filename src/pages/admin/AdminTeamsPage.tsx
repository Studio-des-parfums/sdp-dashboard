import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Pencil, Users } from 'lucide-react'
import { adminClient, type AdminUser } from '../../api/adminClient'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxTask, PoluxTeam } from '../../types/polux'
import { useToast } from '../../components/ui/Toast'
import { TASK_COLORS } from '../../components/polux/priority'

// Équipes = espaces officiels Polux (base polux). Le nom et la couleur sont modifiables, pas le
// slug : il sert d'identifiant dans les URLs et dans les équipes des utilisateurs (base globale).

interface TeamForm {
  name: string
  color: string
  manager_user_id: number | null
}

const EMPTY_FORM: TeamForm = { name: '', color: TASK_COLORS[0], manager_user_id: null }

function ColorChoice({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TASK_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`h-6 w-6 rounded-full border-2 ${value === c ? 'border-gray-900' : 'border-transparent'}`}
          style={{ backgroundColor: c }}
          aria-label={`Couleur ${c}`}
        />
      ))}
    </div>
  )
}

export default function AdminTeamsPage() {
  const { showSuccess, showError } = useToast()
  const [teams, setTeams] = useState<PoluxTeam[]>([])
  const [tasks, setTasks] = useState<PoluxTask[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<PoluxTeam | 'new' | null>(null)
  const [form, setForm] = useState<TeamForm>(EMPTY_FORM)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([poluxApi.getTeams(), poluxApi.getTasks(), adminClient.getUsers()])
      .then(([t, tk, u]) => { setTeams(t.filter(team => team.is_official)); setTasks(tk); setUsers(u) })
      .catch(err => showError('Chargement impossible', err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const taskCountByTeam = useMemo(() => {
    const counts = new Map<number, number>()
    for (const t of tasks) if (t.team_id != null) counts.set(t.team_id, (counts.get(t.team_id) ?? 0) + 1)
    return counts
  }, [tasks])

  const userName = (id: number | null | undefined) => {
    const u = users.find(x => x.id === id)
    return u ? `${u.first_name} ${u.last_name}` : null
  }

  function openNew() {
    setEditing('new')
    setForm(EMPTY_FORM)
  }

  function openEdit(team: PoluxTeam) {
    setEditing(team)
    setForm({ name: team.name, color: team.color, manager_user_id: team.manager_user_id ?? null })
  }

  // Le responsable appartient à l'équipe : on l'ajoute aussi à ses équipes (base globale).
  async function ensureManagerInTeam(managerId: number | null, teamSlug: string) {
    if (!managerId) return
    const manager = users.find(u => u.id === managerId)
    if (!manager || (manager.team_slugs ?? []).includes(teamSlug)) return
    const updated = await adminClient.updateUser(manager.id, { team_slugs: [...(manager.team_slugs ?? []), teamSlug] })
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)))
  }

  async function save() {
    if (!form.name.trim()) {
      showError('Nom manquant', "Le nom de l'équipe est requis.")
      return
    }
    setSaving(true)
    try {
      const team = editing === 'new'
        ? await poluxApi.createOfficialTeam({ name: form.name.trim(), color: form.color, manager_user_id: form.manager_user_id })
        : await poluxApi.updateTeam((editing as PoluxTeam).id, { name: form.name.trim(), color: form.color, manager_user_id: form.manager_user_id })
      await ensureManagerInTeam(form.manager_user_id, team.slug)
      setTeams(prev => (editing === 'new' ? [...prev, team] : prev.map(t => (t.id === team.id ? team : t))))
      setEditing(null)
      showSuccess(editing === 'new' ? 'Équipe créée' : 'Équipe mise à jour', team.name)
    } catch (err: any) {
      showError("Échec de l'enregistrement", err.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(team: PoluxTeam) {
    setSaving(true)
    try {
      await poluxApi.deleteTeam(team.id)
      await adminClient.removeTeamFromAllUsers(team.slug)
      setTeams(prev => prev.filter(t => t.id !== team.id))
      setUsers(prev => prev.map(u => ({ ...u, team_slugs: (u.team_slugs ?? []).filter(s => s !== team.slug) })))
      setConfirmDeleteId(null)
      showSuccess('Équipe supprimée', team.name)
    } catch (err: any) {
      showError('Échec de la suppression', err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="py-12 text-center text-sm text-gray-600">Chargement...</p>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestion des équipes</h1>
          <p className="mt-1 text-sm text-gray-600">Chaque équipe correspond à un espace officiel dans Polux.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white transition-colors hover:bg-indigo-500">
          <Plus size={16} /> Ajouter
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map(team => {
          const memberCount = users.filter(u => (u.team_slugs ?? []).includes(team.slug)).length
          const taskCount = taskCountByTeam.get(team.id) ?? 0
          const confirming = confirmDeleteId === team.id
          return (
            <div key={team.id} className="rounded-xl border border-gray-200 bg-gray-100 p-4" style={{ borderTopWidth: '3px', borderTopColor: team.color }}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: team.color }}>
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{team.name}</p>
                  <p className="text-xs text-gray-600">Responsable : {userName(team.manager_user_id) ?? <span className="text-amber-600">non défini</span>}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1"><Users size={13} /> {memberCount} membre{memberCount > 1 ? 's' : ''}</span>
                <span>{taskCount} tâche{taskCount > 1 ? 's' : ''}</span>
              </div>
              {confirming ? (
                <div className="mt-3 space-y-2 rounded-lg bg-red-50 p-3">
                  <p className="text-xs text-red-700">
                    Supprimer « {team.name} » supprime aussi ses {taskCount} tâche{taskCount > 1 ? 's' : ''} (commentaires et pièces jointes compris) et la retire des utilisateurs. Action irréversible.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => remove(team)} disabled={saving} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50">Confirmer la suppression</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900">Annuler</button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => openEdit(team)} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs text-gray-900 transition-colors hover:bg-gray-200"><Pencil size={13} /> Modifier</button>
                  <button onClick={() => setConfirmDeleteId(team.id)} className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-600/20 px-3 py-1.5 text-xs text-red-700 transition-colors hover:bg-red-600/30"><Trash2 size={13} /> Supprimer</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {teams.length === 0 && <p className="py-12 text-center text-sm text-gray-600">Aucune équipe</p>}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md space-y-4 rounded-xl border border-gray-200 bg-gray-100 p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900">{editing === 'new' ? 'Nouvelle équipe' : `Modifier « ${editing.name} »`}</h2>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Nom</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Couleur</label>
              <ColorChoice value={form.color} onChange={color => setForm({ ...form, color })} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Responsable</label>
              <select
                value={form.manager_user_id ?? ''}
                onChange={e => setForm({ ...form, manager_user_id: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                <option value="">Aucun</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-gray-500">Le responsable est automatiquement ajouté à l'équipe.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-500 disabled:opacity-50">
                {saving ? 'Enregistrement...' : editing === 'new' ? 'Créer' : 'Enregistrer'}
              </button>
              <button onClick={() => setEditing(null)} className="rounded-lg px-4 py-2 text-sm text-gray-500 transition-colors hover:text-gray-900">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
