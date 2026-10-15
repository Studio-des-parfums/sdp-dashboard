import { useEffect, useMemo, useState } from 'react'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxTask, PoluxTeam, PoluxUserRef } from '../../types/polux'
import { TaskListView } from '../../components/polux/TaskListView'
import { TaskModal } from '../../components/polux/TaskModal'
import { useAuth } from '../../contexts/AuthContext'

export default function PoluxMyTasksPage() {
  const { sdpUser } = useAuth()
  const [tasks, setTasks] = useState<PoluxTask[]>([])
  const [users, setUsers] = useState<PoluxUserRef[]>([])
  const [teams, setTeams] = useState<PoluxTeam[]>([])
  const [selectedTask, setSelectedTask] = useState<PoluxTask | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([poluxApi.getTasks(), poluxApi.getUsers(), poluxApi.getTeams()])
      .then(([t, u, tm]) => { setTasks(t); setUsers(u); setTeams(tm) })
      .finally(() => setLoading(false))
  }, [])

  const currentUser = useMemo(() => users.find((u) => u.email === sdpUser?.email) ?? null, [users, sdpUser])
  const myTasks = useMemo(() => currentUser ? tasks.filter((t) => t.assigned_to_ids.includes(currentUser.id)) : [], [tasks, currentUser])

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

      <TaskListView tasks={myTasks} users={users} teams={teams} showProjectColumn showTeamColumn onOpenTask={setSelectedTask} />

      <TaskModal task={selectedTask} users={users} onClose={() => setSelectedTask(null)} onUpdated={handleUpdated} onDeleted={handleDeleted} />
    </div>
  )
}
