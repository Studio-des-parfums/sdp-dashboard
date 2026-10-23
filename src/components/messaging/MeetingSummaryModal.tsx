import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ExternalLink, Loader2, Sparkles, X } from 'lucide-react'
import { messagesClient, type MeetingSummary, type MeetingTask, type MeetingTaskPatch } from '../../api/messagesClient'
import { poluxApi } from '../../api/poluxClient'
import type { PoluxTeam, PoluxUserRef } from '../../types/polux'
import { useAuth } from '../../contexts/AuthContext'
import { MEETING_TASKS_UPDATED_EVENT } from '../../contexts/MessagingContext'
import { AssigneePicker } from '../polux/AssigneePicker'
import { PRIORITY_CLASS, PRIORITY_LABEL } from '../polux/priority'
import { userDisplayName } from '../polux/userLabel'

interface MeetingSummaryModalProps {
  messageId: number
  onClose: () => void
}

interface SummaryData {
  summary: MeetingSummary
  created_at: string
  tasks: MeetingTask[]
}

const FIELD = 'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-400'

// Résumé d'une réunion : à gauche ce qui a été dit (sujets, qui a dit quoi et pourquoi,
// décisions) ; à droite les tâches détectées par l'IA, à corriger puis ajouter dans Polux
// ou refuser. Par défaut, seules les tâches qui me sont (potentiellement) attribuées.
export function MeetingSummaryModal({ messageId, onClose }: MeetingSummaryModalProps) {
  const { sdpUser } = useAuth()
  const [data, setData] = useState<SummaryData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<PoluxUserRef[]>([])
  const [teams, setTeams] = useState<PoluxTeam[]>([])
  const [showAll, setShowAll] = useState(false)

  const load = useCallback(() => {
    messagesClient.getMeetingSummary(messageId).then(setData).catch((err) => setError(err.message))
  }, [messageId])

  useEffect(() => {
    load()
    poluxApi.getUsers().then(setUsers).catch(() => {})
    poluxApi.getTeams().then(setTeams).catch(() => {})
  }, [load])

  // Un autre participant a modifié, accepté ou refusé une tâche : on recharge.
  useEffect(() => {
    const onUpdated = (e: Event) => {
      if ((e as CustomEvent<{ message_id: number }>).detail.message_id === messageId) load()
    }
    window.addEventListener(MEETING_TASKS_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(MEETING_TASKS_UPDATED_EVENT, onUpdated)
  }, [messageId, load])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const me = sdpUser?.id
  const tasks = data?.tasks ?? []
  // « Mes tâches » : celles qui me sont attribuées, et celles que l'IA n'a su attribuer à personne.
  const myTasks = useMemo(
    () => tasks.filter((t) => (me != null && t.assignee_ids.includes(me)) || (t.assignee_ids.length === 0 && t.status === 'proposee')),
    [tasks, me]
  )
  const visibleTasks = (showAll ? tasks : myTasks)
    .slice()
    .sort((a, b) => Number(a.status !== 'proposee') - Number(b.status !== 'proposee'))

  function replaceTask(task: MeetingTask) {
    setData((prev) => prev && { ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? task : t)) })
  }

  const summary = data?.summary

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-2 sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-gray-50 shadow-2xl">
        <div className="flex shrink-0 items-start gap-3 border-b border-gray-200 bg-white px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600/10 text-indigo-600"><Sparkles size={18} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-gray-900">{summary?.titre || 'Résumé de la réunion'}</h2>
            {data && (
              <p className="text-xs text-gray-500">
                {new Date(data.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                {' · généré automatiquement à partir de la transcription, à relire'}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900" aria-label="Fermer"><X size={20} /></button>
        </div>

        {error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : !data ? (
          <div className="flex flex-1 items-center justify-center text-gray-500"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_440px] md:overflow-hidden">
            {/* Ce qui a été dit */}
            <div className="space-y-5 p-5 md:overflow-y-auto">
              {summary?.resume && (
                <section>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">En bref</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{summary.resume}</p>
                </section>
              )}
              {(summary?.sujets ?? []).map((sujet, i) => (
                <section key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">{sujet.titre}</h3>
                  <ul className="space-y-2">
                    {sujet.points.map((p, j) => (
                      <li key={j} className="text-sm leading-relaxed text-gray-700">
                        {p.auteur && <span className="font-semibold text-indigo-600">{p.auteur} · </span>}
                        {p.texte}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {(summary?.decisions.length ?? 0) > 0 && (
                <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-emerald-800">Décisions</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-emerald-900">
                    {summary!.decisions.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </section>
              )}
            </div>

            {/* Tâches détectées */}
            <div className="flex min-h-0 flex-col border-t border-gray-200 bg-white md:border-l md:border-t-0">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  {showAll ? 'Toutes les tâches' : 'Mes tâches'} <span className="text-gray-500">({visibleTasks.length})</span>
                </h3>
                {tasks.length !== myTasks.length && (
                  <button onClick={() => setShowAll((s) => !s)} className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
                    {showAll ? 'Voir mes tâches' : `Voir toutes (${tasks.length})`}
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-3 p-4 md:overflow-y-auto">
                {visibleTasks.map((task) => (
                  <TaskProposal key={task.id} task={task} users={users} teams={teams} me={me} onChanged={replaceTask} />
                ))}
                {visibleTasks.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-500">
                    {showAll ? "Aucune tâche n'a été détectée dans cette réunion." : 'Aucune tâche ne vous a été attribuée.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

interface TaskProposalProps {
  task: MeetingTask
  users: PoluxUserRef[]
  teams: PoluxTeam[]
  me: number | undefined
  onChanged: (task: MeetingTask) => void
}

function TaskProposal({ task, users, teams, me, onChanged }: TaskProposalProps) {
  const { sdpUser } = useAuth()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Valeurs à jour si un autre participant a modifié la tâche.
  useEffect(() => { setTitle(task.title); setDescription(task.description) }, [task.title, task.description])

  async function save(patch: MeetingTaskPatch) {
    setError(null)
    try {
      onChanged(await messagesClient.updateMeetingTask(task.id, patch))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modification impossible')
    }
  }

  // Création de la tâche dans Polux (avec l'identité de l'utilisateur), puis marquage « acceptée ».
  async function accept() {
    setBusy(true)
    setError(null)
    try {
      const team = teams.find((t) => t.slug === task.team_slug)
      const created = await poluxApi.createTask({
        team_id: team?.id ?? null,
        title: title.trim() || task.title,
        description,
        assigned_to_ids: task.assignee_ids,
        priority: task.priority,
        color: null,
        start_date: null,
        deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
      })
      onChanged(await messagesClient.acceptMeetingTask(task.id, created.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ajouter la tâche")
    } finally {
      setBusy(false)
    }
  }

  async function reject() {
    setBusy(true)
    setError(null)
    try {
      onChanged(await messagesClient.rejectMeetingTask(task.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refus impossible')
    } finally {
      setBusy(false)
    }
  }

  const deciderName = (() => {
    const u = users.find((x) => x.id === task.decided_by)
    return u ? userDisplayName(u, sdpUser?.email) : 'un participant'
  })()

  if (task.status !== 'proposee') {
    const accepted = task.status === 'acceptee'
    return (
      <div className={`rounded-xl border p-3 ${accepted ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
        <p className={`text-sm font-medium ${accepted ? 'text-gray-900' : 'text-gray-500 line-through'}`}>{task.title}</p>
        <p className={`mt-1 flex items-center gap-1.5 text-xs ${accepted ? 'text-emerald-700' : 'text-gray-500'}`}>
          {accepted ? <><Check size={13} /> Ajoutée dans Polux par {deciderName}</> : `Refusée par ${deciderName}`}
          {accepted && task.polux_task_id && (
            <a href={`/project/polux?section=accueil&task=${task.polux_task_id}`} className="ml-auto inline-flex items-center gap-1 font-medium hover:underline">
              Ouvrir <ExternalLink size={12} />
            </a>
          )}
        </p>
      </div>
    )
  }

  const assignedToMe = me != null && task.assignee_ids.includes(me)

  return (
    <div className="space-y-2.5 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && title !== task.title && save({ title })}
        className={`${FIELD} font-medium`}
        placeholder="Titre de la tâche"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={() => description !== task.description && save({ description })}
        rows={2}
        className={`${FIELD} resize-y`}
        placeholder="Description (facultative)"
      />
      <div>
        <p className="mb-1 text-[11px] font-medium text-gray-500">Assignée à</p>
        <AssigneePicker users={users} selectedIds={task.assignee_ids} onChange={(ids) => save({ assignee_ids: ids })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-gray-500">Échéance</span>
          <input type="date" value={task.deadline ?? ''} onChange={(e) => save({ deadline: e.target.value || null })} className={FIELD} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-gray-500">Priorité</span>
          <select
            value={task.priority}
            onChange={(e) => save({ priority: e.target.value as MeetingTask['priority'] })}
            className={`${FIELD} ${PRIORITY_CLASS[task.priority]}`}
          >
            {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-gray-500">Ajouter dans</span>
        <select value={task.team_slug ?? ''} onChange={(e) => save({ team_slug: e.target.value || null })} className={FIELD}>
          <option value="">Mon espace (sans équipe)</option>
          {teams.map((t) => <option key={t.id} value={t.slug}>Espace {t.name}</option>)}
        </select>
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={reject}
          disabled={busy}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          title={assignedToMe && task.assignee_ids.length > 1 ? 'Vous retire de cette tâche (les autres la gardent)' : 'Écarter cette tâche'}
        >
          Refuser
        </button>
        <button
          onClick={accept}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Ajouter à Polux
        </button>
      </div>
    </div>
  )
}
