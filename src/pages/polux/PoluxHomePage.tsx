import { useEffect, useMemo, useState } from 'react'
import { ListTodo, AlertTriangle, LayoutGrid, ChevronRight, CheckCircle2 } from 'lucide-react'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxTask, PoluxTeam, PoluxUserRef } from '../../types/polux'
import { TaskListView } from '../../components/polux/TaskListView'
import { TaskModal } from '../../components/polux/TaskModal'
import { CompletedTasksModal } from '../../components/polux/CompletedTasksModal'
import { CreatePersonalTaskModal } from '../../components/polux/CreatePersonalTaskModal'
import { Button } from '../../components/ui/lylo/Button'
import { useAuth } from '../../contexts/AuthContext'
import { isOverdue } from '../../components/polux/priority'

interface PoluxHomePageProps {
  onOpenTeam?: (teamSlug: string) => void
  isAdmin?: boolean
}

export default function PoluxHomePage({ onOpenTeam, isAdmin = false }: PoluxHomePageProps) {
  const { sdpUser } = useAuth()
  const [teams, setTeams] = useState<PoluxTeam[]>([])
  const [tasks, setTasks] = useState<PoluxTask[]>([])
  const [users, setUsers] = useState<PoluxUserRef[]>([])
  const [selectedTask, setSelectedTask] = useState<PoluxTask | null>(null)
  const [completedOpen, setCompletedOpen] = useState(false)
  const [createPersonalOpen, setCreatePersonalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [projectFilter, setProjectFilter] = useState('tous')

  useEffect(() => {
    Promise.all([poluxApi.getTeams(), poluxApi.getTasks(), poluxApi.getUsers()])
      .then(([t, tk, u]) => { setTeams(t); setTasks(tk); setUsers(u) })
      .finally(() => setLoading(false))
  }, [])

  const currentUser = useMemo(() => users.find((u) => u.email === sdpUser?.email) ?? null, [users, sdpUser])
  const myTasks = useMemo(
    () => currentUser ? tasks.filter((t) => t.assigned_to_ids.includes(currentUser.id) || t.owner_id === currentUser.id) : [],
    [tasks, currentUser]
  )
  const myActiveTasks = useMemo(() => myTasks.filter((t) => t.status !== 'termine'), [myTasks])
  const myProjects = useMemo(
    () => Array.from(new Set(myActiveTasks.filter((t) => t.project_name).map((t) => t.project_name as string))),
    [myActiveTasks]
  )
  const visibleMyTasks = useMemo(
    () => projectFilter === 'tous' ? myActiveTasks : myActiveTasks.filter((t) => t.project_name === projectFilter),
    [myActiveTasks, projectFilter]
  )
  const activeProjects = useMemo(
    () => Array.from(new Set(tasks.filter((t) => t.status !== 'termine' && t.project_name).map((t) => t.project_name as string))),
    [tasks]
  )

  // Un utilisateur non-admin ne doit voir, sur "Mon espace", que les espaces dont il est
  // membre — même règle d'accès que la sidebar (voir DashboardView.tsx).
  const visibleTeams = useMemo(
    () => isAdmin ? teams : teams.filter((t) => !!currentUser && t.member_ids.includes(currentUser.id)),
    [teams, isAdmin, currentUser]
  )

  const teamStats = useMemo(() => {
    return visibleTeams.map((team) => {
      const teamTasks = tasks.filter((t) => t.team_id === team.id)
      const remaining = teamTasks.filter((t) => t.status !== 'termine').length
      const overdue = teamTasks.filter((t) => isOverdue(t.deadline, t.status)).length
      return { team, remaining, overdue }
    })
  }, [visibleTeams, tasks])

  const totalRemaining = useMemo(() => teamStats.reduce((sum, s) => sum + s.remaining, 0), [teamStats])
  const totalOverdue = useMemo(() => teamStats.reduce((sum, s) => sum + s.overdue, 0), [teamStats])

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

  if (loading) return <div className="text-sm text-gray-500">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {currentUser ? `Bonjour ${currentUser.first_name} 👋` : 'Mon espace'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {visibleTeams.length} espace{visibleTeams.length > 1 ? 's' : ''} actif{visibleTeams.length > 1 ? 's' : ''} — voici où vous en êtes.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl bg-indigo-600/10 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/15 text-indigo-600">
              <LayoutGrid size={18} />
            </div>
            <div>
              <p className="text-lg font-bold leading-none text-gray-900">{visibleTeams.length}</p>
              <p className="text-xs text-gray-600">Espaces</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-sky-500/10 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600">
              <ListTodo size={18} />
            </div>
            <div>
              <p className="text-lg font-bold leading-none text-gray-900">{totalRemaining}</p>
              <p className="text-xs text-gray-600">Tâches à faire</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-red-500/10 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15 text-red-700">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-lg font-bold leading-none text-gray-900">{totalOverdue}</p>
              <p className="text-xs text-gray-600">En retard</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Espaces</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teamStats.map(({ team, remaining, overdue }) => (
            <button
              key={team.id}
              type="button"
              onClick={() => onOpenTeam?.(team.slug)}
              className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-100 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderTopWidth: '3px', borderTopColor: team.color }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{team.name}</p>
                    {team.is_official && <p className="text-[11px] font-medium text-indigo-600">Officielle</p>}
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400 transition-transform group-hover:translate-x-0.5" />
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-600">
                  <ListTodo size={13} />
                  {remaining} à faire
                </span>
                {overdue > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-700">
                    <AlertTriangle size={13} />
                    {overdue} en retard
                  </span>
                )}
                {remaining === 0 && overdue === 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 size={13} />
                    À jour
                  </span>
                )}
              </div>
            </button>
          ))}
          {teamStats.length === 0 && (
            <p className="text-sm text-gray-500">Aucun espace pour le moment.</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Mes tâches</h3>
          <div className="flex gap-2">
            <Button type="button" onClick={() => setCompletedOpen(true)}>
              Tâches terminées
            </Button>
            <Button variant="primary" type="button" onClick={() => setCreatePersonalOpen(true)}>
              Nouvelle tâche personnelle
            </Button>
          </div>
        </div>
        {myProjects.length > 0 && (
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            <option value="tous">Tous les projets</option>
            {myProjects.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        <TaskListView tasks={visibleMyTasks} users={users} teams={teams} showProjectColumn showTeamColumn onOpenTask={setSelectedTask} />
      </div>

      <TaskModal task={selectedTask} users={users} existingProjects={activeProjects} onClose={() => setSelectedTask(null)} onUpdated={handleUpdated} onDeleted={handleDeleted} />
      <CreatePersonalTaskModal open={createPersonalOpen} onClose={() => setCreatePersonalOpen(false)} onCreated={handleCreated} />
      <CompletedTasksModal
        open={completedOpen}
        tasks={myTasks}
        users={users}
        teams={teams}
        showProjectColumn
        showTeamColumn
        onClose={() => setCompletedOpen(false)}
        onOpenTask={(task) => { setCompletedOpen(false); setSelectedTask(task) }}
      />
    </div>
  )
}
