import { useState } from 'react'
import type { PoluxTask } from '../../types/polux'

// Navigation entre tâches liées dans la modale (étape → tâche confiée, et retour) : garde la pile
// des tâches précédemment ouvertes pour proposer un bouton « Retour ».
export function useTaskHistory(tasks: PoluxTask[], selectedTask: PoluxTask | null, setSelectedTask: (task: PoluxTask | null) => void) {
  const [history, setHistory] = useState<number[]>([])

  function openLinked(taskId: number) {
    const next = tasks.find((t) => t.id === taskId)
    if (!next) return
    if (selectedTask) setHistory((h) => [...h, selectedTask.id])
    setSelectedTask(next)
  }

  const previous = history.length > 0 ? tasks.find((t) => t.id === history[history.length - 1]) ?? null : null

  function back() {
    setHistory((h) => h.slice(0, -1))
    setSelectedTask(previous)
  }

  function close() {
    setHistory([])
    setSelectedTask(null)
  }

  return { openLinked, previous, back, close }
}
