import { Modal } from '../ui/lylo/Modal'
import { Button } from '../ui/lylo/Button'
import type { PoluxTask, PoluxTeam, PoluxUserRef } from '../../types/polux'
import { TaskTable } from './TaskTable'

interface CompletedTasksModalProps {
  open: boolean
  tasks: PoluxTask[]
  users: PoluxUserRef[]
  teams?: PoluxTeam[]
  showProjectColumn?: boolean
  showTeamColumn?: boolean
  onClose: () => void
  onOpenTask: (task: PoluxTask) => void
}

// Les tâches terminées sont masquées des listes actives pour ne pas les polluer — cette
// modale reste le seul endroit où les retrouver (ex: pour vérifier un historique).
export function CompletedTasksModal({ open, tasks, users, teams, showProjectColumn, showTeamColumn, onClose, onOpenTask }: CompletedTasksModalProps) {
  const completedTasks = tasks.filter((t) => t.status === 'termine')

  return (
    <Modal
      open={open}
      title="Tâches terminées"
      onClose={onClose}
      maxWidthClassName="max-w-4xl"
      footer={<Button type="button" onClick={onClose}>Fermer</Button>}
    >
      {completedTasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-600">Aucune tâche terminée.</p>
      ) : (
        <TaskTable tasks={completedTasks} users={users} teams={teams} showProjectColumn={showProjectColumn} showTeamColumn={showTeamColumn} onOpenTask={onOpenTask} />
      )}
    </Modal>
  )
}
