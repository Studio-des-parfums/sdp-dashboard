import { useEffect, useMemo, useState } from 'react'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxProject, PoluxTask, PoluxTeam, PoluxUserRef } from '../../types/polux'
import { TaskTable } from '../../components/polux/TaskTable'
import { TaskModal } from '../../components/polux/TaskModal'
import { CreateTaskModal } from '../../components/polux/CreateTaskModal'
import { Button } from '../../components/ui/lylo/Button'

export default function PoluxTeamPage({ teamSlug }: { teamSlug: string }) {
  const [teams, setTeams] = useState<PoluxTeam[]>([])
  const [projects, setProjects] = useState<PoluxProject[]>([])
  const [tasks, setTasks] = useState<PoluxTask[]>([])
  const [users, setUsers] = useState<PoluxUserRef[]>([])
  const [selectedTask, setSelectedTask] = useState<PoluxTask | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([poluxApi.getTeams(), poluxApi.getProjects(), poluxApi.getTasks(), poluxApi.getUsers()])
      .then(([t, p, tk, u]) => { setTeams(t); setProjects(p); setTasks(tk); setUsers(u) })
      .finally(() => setLoading(false))
  }, [])

  const team = useMemo(() => teams.find((t) => t.slug === teamSlug) ?? null, [teams, teamSlug])
  const teamProjects = useMemo(() => team ? projects.filter((p) => p.team_id === team.id) : [], [projects, team])
  const teamTasks = useMemo(() => team ? tasks.filter((t) => t.team_id === team.id) : [], [tasks, team])
  const teamMembers = useMemo(() => team ? users.filter((u) => team.member_ids.includes(u.id)) : [], [users, team])

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
            <p className="mt-1 text-sm text-gray-500">
              {teamMembers.map((m) => `${m.first_name} ${m.last_name}`).join(', ') || 'Aucun membre'}
            </p>
          </div>
          <Button variant="primary" type="button" onClick={() => setCreateOpen(true)} disabled={teamProjects.length === 0}>
            Nouvelle tâche
          </Button>
        </div>
      </div>

      <TaskTable tasks={teamTasks} users={users} projects={teamProjects} showProjectColumn onOpenTask={setSelectedTask} />

      <CreateTaskModal
        open={createOpen}
        teamId={team.id}
        projects={teamProjects}
        users={users}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <TaskModal task={selectedTask} users={users} teamMemberIds={team.member_ids} onClose={() => setSelectedTask(null)} onUpdated={handleUpdated} onDeleted={handleDeleted} />
    </div>
  )
}
