import { useEffect, useMemo, useState } from 'react'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxTask, PoluxTeam, PoluxUserRef } from '../../types/polux'
import { TaskListView } from '../../components/polux/TaskListView'
import { TaskModal } from '../../components/polux/TaskModal'
import { CreateTaskModal } from '../../components/polux/CreateTaskModal'
import { TeamMembersModal } from '../../components/polux/TeamMembersModal'
import { CompletedTasksModal } from '../../components/polux/CompletedTasksModal'
import { Button } from '../../components/ui/lylo/Button'
import { Input } from '../../components/ui/lylo/Input'

function defaultExtendedDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

export default function PoluxTeamPage({ teamSlug, isAdmin = false, onDeleted }: { teamSlug: string; isAdmin?: boolean; onDeleted?: () => void }) {
  const [teams, setTeams] = useState<PoluxTeam[]>([])
  const [tasks, setTasks] = useState<PoluxTask[]>([])
  const [users, setUsers] = useState<PoluxUserRef[]>([])
  const [selectedTask, setSelectedTask] = useState<PoluxTask | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [completedOpen, setCompletedOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [extendDate, setExtendDate] = useState(defaultExtendedDate())
  const [isExtending, setIsExtending] = useState(false)
  const [projectFilter, setProjectFilter] = useState('tous')

  useEffect(() => {
    Promise.all([poluxApi.getTeams(), poluxApi.getTasks(), poluxApi.getUsers()])
      .then(([t, tk, u]) => { setTeams(t); setTasks(tk); setUsers(u) })
      .finally(() => setLoading(false))
  }, [])

  const team = useMemo(() => teams.find((t) => t.slug === teamSlug) ?? null, [teams, teamSlug])
  const teamTasks = useMemo(() => team ? tasks.filter((t) => t.team_id === team.id) : [], [tasks, team])
  const activeTeamTasks = useMemo(() => teamTasks.filter((t) => t.status !== 'termine'), [teamTasks])
  const teamMembers = useMemo(() => team ? users.filter((u) => team.member_ids.includes(u.id)) : [], [users, team])
  const nonMembers = useMemo(() => team ? users.filter((u) => !team.member_ids.includes(u.id)) : [], [users, team])
  // Projets déjà renseignés et encore en cours (au moins une tâche non terminée) — proposés
  // dans le select "Projet" des formulaires de tâche, sans empêcher d'en taper un nouveau.
  const activeProjects = useMemo(
    () => Array.from(new Set(teamTasks.filter((t) => t.status !== 'termine' && t.project_name).map((t) => t.project_name as string))),
    [teamTasks]
  )
  const visibleTasks = useMemo(
    () => projectFilter === 'tous' ? activeTeamTasks : activeTeamTasks.filter((t) => t.project_name === projectFilter),
    [activeTeamTasks, projectFilter]
  )

  function handleMemberAdded(userId: number) {
    setTeams((prev) => prev.map((t) => (t.id === team?.id ? { ...t, member_ids: [...t.member_ids, userId] } : t)))
  }

  function handleMemberRemoved(userId: number) {
    setTeams((prev) => prev.map((t) => (t.id === team?.id ? { ...t, member_ids: t.member_ids.filter((id) => id !== userId) } : t)))
  }

  function handleCreated(task: PoluxTask) {
    setTasks((prev) => [...prev, task])
  }

  function handleUpdated(updated: PoluxTask) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSelectedTask(updated)
  }

  function handleDeleted(taskId: number) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  async function handleDeleteTeam() {
    if (!team) return
    if (!window.confirm(`Supprimer l'équipe "${team.name}" ? Toutes ses tâches seront définitivement supprimées.`)) return
    setIsDeleting(true)
    try {
      await poluxApi.deleteTeam(team.id)
      onDeleted?.()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur lors de la suppression de l\'équipe')
      setIsDeleting(false)
    }
  }

  async function handleExtendTeam() {
    if (!team || !extendDate) return
    setIsExtending(true)
    try {
      const updated = await poluxApi.updateTeam(team.id, { end_date: extendDate })
      setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur lors de la prolongation de l\'espace')
    } finally {
      setIsExtending(false)
    }
  }

  if (loading) return <div className="text-sm text-gray-500">Chargement...</div>
  if (!team) return <div className="text-sm text-gray-500">Équipe introuvable.</div>

  const isExpired = !team.is_official && !!team.end_date && new Date(team.end_date).getTime() < Date.now()

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-gray-100 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: team.color }} />
              <h2 className="text-xl font-semibold text-gray-900">{team.name}</h2>
              {team.is_official && (
                <span className="inline-flex items-center rounded-full bg-indigo-600/10 px-2 py-0.5 text-xs font-medium text-indigo-600">
                  Officielle
                </span>
              )}
              {!team.is_official && team.end_date && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${isExpired ? 'bg-red-600/10 text-red-600' : 'bg-gray-200 text-gray-600'}`}>
                  {isExpired ? 'Expiré le' : 'Expire le'} {new Date(team.end_date).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {teamMembers.map((m) => (
                <span key={m.id} className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700">
                  {m.first_name} {m.last_name}
                </span>
              ))}
              {teamMembers.length === 0 && <span className="text-sm text-gray-500">Aucun membre</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button type="button" onClick={() => setMembersOpen(true)}>
                Membres
              </Button>
            )}
            <Button type="button" onClick={() => setCompletedOpen(true)}>
              Tâches terminées
            </Button>
            <Button variant="primary" type="button" onClick={() => setCreateOpen(true)}>
              Nouvelle tâche
            </Button>
            {!team.is_official && (
              <Button variant="danger" type="button" onClick={handleDeleteTeam} disabled={isDeleting}>
                Supprimer l'équipe
              </Button>
            )}
          </div>
        </div>
      </div>

      {isExpired && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/40 p-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-red-700">
            Cet espace est arrivé à expiration le {new Date(team.end_date!).toLocaleDateString('fr-FR')}. Prolonge-le ou supprime-le — sans action, tu risques de perdre l'accès à son contenu.
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} className="w-40" />
            <Button type="button" variant="primary" onClick={handleExtendTeam} disabled={isExtending || !extendDate}>
              Prolonger
            </Button>
            <Button type="button" variant="danger" onClick={handleDeleteTeam} disabled={isDeleting}>
              Supprimer l'espace
            </Button>
          </div>
        </div>
      )}

      {activeProjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-100 p-4">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            <option value="tous">Tous les projets</option>
            {activeProjects.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}

      <TaskListView tasks={visibleTasks} users={users} showProjectColumn onOpenTask={setSelectedTask} />

      <CreateTaskModal
        open={createOpen}
        teamId={team.id}
        users={users}
        existingProjects={activeProjects}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <TaskModal task={selectedTask} users={users} existingProjects={activeProjects} onClose={() => setSelectedTask(null)} onUpdated={handleUpdated} onDeleted={handleDeleted} />
      <TeamMembersModal
        open={membersOpen}
        teamId={team.id}
        members={teamMembers}
        candidates={nonMembers}
        onClose={() => setMembersOpen(false)}
        onAdded={handleMemberAdded}
        onRemoved={handleMemberRemoved}
      />
      <CompletedTasksModal
        open={completedOpen}
        tasks={teamTasks}
        users={users}
        showProjectColumn
        onClose={() => setCompletedOpen(false)}
        onOpenTask={(task) => { setCompletedOpen(false); setSelectedTask(task) }}
      />
    </div>
  )
}
