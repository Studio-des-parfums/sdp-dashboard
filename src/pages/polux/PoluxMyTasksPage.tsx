import { useEffect, useMemo, useState } from 'react'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxProject, PoluxTask, PoluxTeam, PoluxUserRef } from '../../types/polux'
import { TaskTable } from '../../components/polux/TaskTable'
import { TaskModal } from '../../components/polux/TaskModal'
import { useAuth } from '../../contexts/AuthContext'

export default function PoluxMyTasksPage() {
  const { sdpUser } = useAuth()
  const [tasks, setTasks] = useState<PoluxTask[]>([])
  const [users, setUsers] = useState<PoluxUserRef[]>([])
  const [projects, setProjects] = useState<PoluxProject[]>([])
  const [teams, setTeams] = useState<PoluxTeam[]>([])
  const [selectedTask, setSelectedTask] = useState<PoluxTask | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([poluxApi.getTasks(), poluxApi.getUsers(), poluxApi.getProjects(), poluxApi.getTeams()])
      .then(([t, u, p, tm]) => { setTasks(t); setUsers(u); setProjects(p); setTeams(tm) })
      .finally(() => setLoading(false))
  }, [])

  const currentUser = useMemo(() => users.find((u) => u.email === sdpUser?.email) ?? null, [users, sdpUser])
  const myTasks = useMemo(() => currentUser ? tasks.filter((t) => t.assigned_to === currentUser.id) : [], [tasks, currentUser])
  const selectedTaskTeamMemberIds = useMemo(() => teams.find((t) => t.id === selectedTask?.team_id)?.member_ids ?? [], [teams, selectedTask])

  function handleUpdated(updated: PoluxTask) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSelectedTask(updated)
  }

  function handleDeleted(taskId: number) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Chargement...</div>

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-xl border border-gray-200 bg-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900">Mes tâches</h2>
        <p className="mt-1 text-sm text-gray-500">
          {currentUser ? `Tâches assignées à ${currentUser.first_name} ${currentUser.last_name}.` : 'Utilisateur non reconnu dans Polux.'}
        </p>
      </div>

      <TaskTable tasks={myTasks} users={users} projects={projects} teams={teams} showProjectColumn showTeamColumn onOpenTask={setSelectedTask} />

      <TaskModal task={selectedTask} users={users} teamMemberIds={selectedTaskTeamMemberIds} onClose={() => setSelectedTask(null)} onUpdated={handleUpdated} onDeleted={handleDeleted} />
    </div>
  )
}
