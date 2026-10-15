import { useEffect, useMemo, useState } from 'react'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxTask, PoluxTeam, PoluxUserRef } from '../../types/polux'
import { TaskListView } from '../../components/polux/TaskListView'
import { TaskModal } from '../../components/polux/TaskModal'
import { CreateTaskModal } from '../../components/polux/CreateTaskModal'
import { TeamMembersModal } from '../../components/polux/TeamMembersModal'
import { Button } from '../../components/ui/lylo/Button'

export default function PoluxTeamPage({ teamSlug, onDeleted }: { teamSlug: string; onDeleted?: () => void }) {
  const [teams, setTeams] = useState<PoluxTeam[]>([])
  const [tasks, setTasks] = useState<PoluxTask[]>([])
  const [users, setUsers] = useState<PoluxUserRef[]>([])
  const [selectedTask, setSelectedTask] = useState<PoluxTask | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    Promise.all([poluxApi.getTeams(), poluxApi.getTasks(), poluxApi.getUsers()])
      .then(([t, tk, u]) => { setTeams(t); setTasks(tk); setUsers(u) })
      .finally(() => setLoading(false))
  }, [])

  const team = useMemo(() => teams.find((t) => t.slug === teamSlug) ?? null, [teams, teamSlug])
  const teamTasks = useMemo(() => team ? tasks.filter((t) => t.team_id === team.id) : [], [tasks, team])
  const teamMembers = useMemo(() => team ? users.filter((u) => team.member_ids.includes(u.id)) : [], [users, team])
  const nonMembers = useMemo(() => team ? users.filter((u) => !team.member_ids.includes(u.id)) : [], [users, team])

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

  if (loading) return <div className="p-6 text-sm text-gray-500">Chargement...</div>
  if (!team) return <div className="p-6 text-sm text-gray-500">Équipe introuvable.</div>

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-xl border border-gray-200 bg-gray-100 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: team.color }} />
              <h2 className="text-xl font-semibold text-gray-900">{team.name}</h2>
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
            <Button type="button" onClick={() => setMembersOpen(true)}>
              Membres
            </Button>
            <Button variant="primary" type="button" onClick={() => setCreateOpen(true)}>
              Nouvelle tâche
            </Button>
            <Button variant="danger" type="button" onClick={handleDeleteTeam} disabled={isDeleting}>
              Supprimer l'équipe
            </Button>
          </div>
        </div>
      </div>

      <TaskListView tasks={teamTasks} users={users} showProjectColumn onOpenTask={setSelectedTask} />

      <CreateTaskModal
        open={createOpen}
        teamId={team.id}
        users={users}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <TaskModal task={selectedTask} users={users} onClose={() => setSelectedTask(null)} onUpdated={handleUpdated} onDeleted={handleDeleted} />
      <TeamMembersModal
        open={membersOpen}
        teamId={team.id}
        members={teamMembers}
        candidates={nonMembers}
        onClose={() => setMembersOpen(false)}
        onAdded={handleMemberAdded}
        onRemoved={handleMemberRemoved}
      />
    </div>
  )
}
