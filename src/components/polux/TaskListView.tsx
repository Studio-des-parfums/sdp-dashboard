import { useState } from 'react'
import { List, Calendar } from 'lucide-react'
import type { PoluxTask, PoluxTeam, PoluxUserRef } from '../../types/polux'
import { TaskTable } from './TaskTable'
import { TaskCalendar } from './TaskCalendar'

type ViewMode = 'table' | 'calendar'

interface TaskListViewProps {
  tasks: PoluxTask[]
  users: PoluxUserRef[]
  teams?: PoluxTeam[]
  showProjectColumn?: boolean
  showTeamColumn?: boolean
  onOpenTask: (task: PoluxTask) => void
}

export function TaskListView({ tasks, users, teams, showProjectColumn, showTeamColumn, onOpenTask }: TaskListViewProps) {
  const [view, setView] = useState<ViewMode>('table')

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setView('table')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === 'table' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <List size={14} /> Tableau
          </button>
          <button
            type="button"
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === 'calendar' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Calendar size={14} /> Calendrier
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <TaskTable tasks={tasks} users={users} teams={teams} showProjectColumn={showProjectColumn} showTeamColumn={showTeamColumn} onOpenTask={onOpenTask} />
      ) : (
        <TaskCalendar tasks={tasks} onOpenTask={onOpenTask} />
      )}
    </div>
  )
}
