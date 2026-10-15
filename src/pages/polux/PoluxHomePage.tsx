import { useEffect, useMemo, useState } from 'react'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxTask, PoluxTeam } from '../../types/polux'
import { deadlineClass, formatDeadline, isOverdue, STATUS_LABEL } from '../../components/polux/priority'

export default function PoluxHomePage() {
  const [teams, setTeams] = useState<PoluxTeam[]>([])
  const [tasks, setTasks] = useState<PoluxTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([poluxApi.getTeams(), poluxApi.getTasks()])
      .then(([t, tk]) => { setTeams(t); setTasks(tk) })
      .finally(() => setLoading(false))
  }, [])

  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter((t) => t.deadline && t.status !== 'termine')
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 6)
  }, [tasks])

  const teamStats = useMemo(() => {
    return teams.map((team) => {
      const teamTasks = tasks.filter((t) => t.team_id === team.id)
      const done = teamTasks.filter((t) => t.status === 'termine').length
      const overdue = teamTasks.filter((t) => isOverdue(t.deadline, t.status)).length
      return { team, total: teamTasks.length, done, overdue }
    })
  }, [teams, tasks])

  if (loading) return <div className="p-6 text-sm text-gray-500">Chargement...</div>

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-xl border border-gray-200 bg-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900">Polux</h2>
        <p className="mt-1 text-sm text-gray-500">Gestion de projets — {teams.length} équipes.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {teamStats.map(({ team, total, done, overdue }) => (
          <div key={team.id} className="rounded-xl border border-gray-200 bg-gray-100 p-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: team.color }} />
              <h3 className="text-sm font-semibold text-gray-900">{team.name}</h3>
            </div>
            <p className="mt-2 text-xs text-gray-600">{done}/{total} tâches terminées</p>
            {overdue > 0 && <p className="mt-1 text-xs font-medium text-red-700">{overdue} en retard</p>}
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
        <div className="border-b border-gray-200 bg-gray-50/20 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Échéances à venir</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {upcomingDeadlines.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-6 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{t.title}</p>
                <p className="text-xs text-gray-600">{STATUS_LABEL[t.status]}</p>
              </div>
              <span className={`text-sm font-medium ${deadlineClass(t.deadline, t.status)}`}>{formatDeadline(t.deadline)}</span>
            </div>
          ))}
          {upcomingDeadlines.length === 0 && (
            <p className="px-6 py-6 text-center text-sm text-gray-600">Aucune échéance à venir.</p>
          )}
        </div>
      </div>
    </div>
  )
}
