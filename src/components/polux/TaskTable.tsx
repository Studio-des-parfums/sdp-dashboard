import { useMemo, useState } from 'react'
import type { PoluxTask, PoluxTeam, PoluxUserRef } from '../../types/polux'
import { useAuth } from '../../contexts/AuthContext'
import { userDisplayName } from './userLabel'
import { deadlineClass, formatDeadline, PRIORITY_CLASS, PRIORITY_LABEL, STATUS_CLASS, STATUS_LABEL } from './priority'

type SortKey = 'deadline' | 'priority' | 'status' | 'title'

const PRIORITY_ORDER: Record<string, number> = { urgente: 0, haute: 1, moyenne: 2, basse: 3 }

interface TaskTableProps {
  tasks: PoluxTask[]
  users: PoluxUserRef[]
  teams?: PoluxTeam[]
  showProjectColumn?: boolean
  showTeamColumn?: boolean
  onOpenTask: (task: PoluxTask) => void
}

export function TaskTable({ tasks, users, teams = [], showProjectColumn, showTeamColumn, onOpenTask }: TaskTableProps) {
  const { sdpUser } = useAuth()
  const [sortKey, setSortKey] = useState<SortKey>('deadline')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [deadlineFrom, setDeadlineFrom] = useState('')
  const [deadlineTo, setDeadlineTo] = useState('')

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams])

  const filtered = useMemo(() => {
    const from = deadlineFrom ? new Date(deadlineFrom).getTime() : null
    const to = deadlineTo ? new Date(deadlineTo).getTime() + 86_400_000 : null
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      if (from || to) {
        if (!t.deadline) return false
        const time = new Date(t.deadline).getTime()
        if (from && time < from) return false
        if (to && time >= to) return false
      }
      return true
    })
  }, [tasks, statusFilter, priorityFilter, deadlineFrom, deadlineTo])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title)
      if (sortKey === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (sortKey === 'status') return a.status.localeCompare(b.status)
      const aTime = a.deadline ? new Date(a.deadline).getTime() : Infinity
      const bTime = b.deadline ? new Date(b.deadline).getTime() : Infinity
      return aTime - bTime
    })
    return copy
  }, [filtered, sortKey])

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
      <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50/20 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm font-semibold text-gray-900">
          Tâches <span className="text-gray-600">({sorted.length})</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700">
            <option value="all">Tous les statuts</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700">
            <option value="all">Toutes priorités</option>
            {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700">
            <option value="deadline">Trier par échéance</option>
            <option value="priority">Trier par priorité</option>
            <option value="status">Trier par statut</option>
            <option value="title">Trier par titre</option>
          </select>
          <div className="flex items-center gap-1.5">
            <input type="date" value={deadlineFrom} onChange={(e) => setDeadlineFrom(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700" title="Échéance à partir du" />
            <span className="text-xs text-gray-500">→</span>
            <input type="date" value={deadlineTo} onChange={(e) => setDeadlineTo(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700" title="Échéance jusqu'au" />
            {(deadlineFrom || deadlineTo) && (
              <button type="button" onClick={() => { setDeadlineFrom(''); setDeadlineTo('') }} className="text-xs text-gray-500 hover:text-gray-900">
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/40">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Titre</th>
              {showProjectColumn && <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Projet</th>}
              {showTeamColumn && <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Équipe</th>}
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Assigné à</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Assignée par</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Priorité</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Début</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Échéance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sorted.map((task) => {
              const assignees = task.assigned_to_ids.map((id) => userById.get(id)).filter((u): u is PoluxUserRef => !!u)
              const creator = userById.get(task.created_by)
              return (
                <tr key={task.id} className="cursor-pointer transition-colors hover:bg-gray-100/60" onClick={() => onOpenTask(task)}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <span className="flex items-center gap-2">
                      {task.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: task.color }} />}
                      {task.title}
                    </span>
                  </td>
                  {showProjectColumn && <td className="px-6 py-4 text-sm text-gray-600">{task.project_name ?? '—'}</td>}
                  {showTeamColumn && (
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {task.team_id != null ? teamById.get(task.team_id)?.name ?? '—' : (
                        <span className="inline-flex items-center rounded-full bg-gray-300/10 px-2 py-1 text-[11px] font-medium text-gray-600">Personnel</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-600">{assignees.length > 0 ? assignees.map((u) => userDisplayName(u, sdpUser?.email)).join(', ') : task.team_id != null ? 'Équipe' : 'Non assignée'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{creator ? userDisplayName(creator, sdpUser?.email) : '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${PRIORITY_CLASS[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${STATUS_CLASS[task.status]}`}>{STATUS_LABEL[task.status]}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDeadline(task.start_date)}</td>
                  <td className={`px-6 py-4 text-sm font-medium ${deadlineClass(task.deadline, task.status)}`}>{formatDeadline(task.deadline)}</td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td className="px-6 py-10 text-center text-sm text-gray-600" colSpan={7 + (showProjectColumn ? 1 : 0) + (showTeamColumn ? 1 : 0)}>
                  Aucune tâche trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
