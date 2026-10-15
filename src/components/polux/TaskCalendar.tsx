import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PoluxTask } from '../../types/polux'
import { taskColor } from './priority'

interface TaskCalendarProps {
  tasks: PoluxTask[]
  onOpenTask: (task: PoluxTask) => void
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTH_LABEL = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
const MAX_LANES = 3

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface TaskRange {
  task: PoluxTask
  start: Date
  end: Date
}

function taskRange(task: PoluxTask): TaskRange | null {
  if (!task.deadline) return null
  const end = startOfDay(new Date(task.deadline))
  const start = task.start_date ? startOfDay(new Date(task.start_date)) : end
  return start.getTime() > end.getTime() ? { task, start: end, end } : { task, start, end }
}

// Découpe chaque tâche en un segment par semaine affichée (une barre continue ne peut
// pas traverser une ligne de la grille), puis assigne à chaque segment une "piste"
// verticale pour empiler sans chevauchement les tâches qui se superposent dans le temps.
interface WeekSegment {
  task: PoluxTask
  startCol: number // 1-7
  span: number
  lane: number
  isRangeStart: boolean
}

function layoutWeek(week: Date[], ranges: TaskRange[]): { segments: WeekSegment[]; laneCount: number } {
  const weekStart = week[0]
  const weekEnd = week[6]
  const overlapping = ranges.filter((r) => r.start.getTime() <= weekEnd.getTime() && r.end.getTime() >= weekStart.getTime())
  overlapping.sort((a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime())

  const laneEndCol: number[] = []
  const segments: WeekSegment[] = []

  for (const r of overlapping) {
    const clampedStart = r.start.getTime() < weekStart.getTime() ? weekStart : r.start
    const clampedEnd = r.end.getTime() > weekEnd.getTime() ? weekEnd : r.end
    const startCol = Math.round((clampedStart.getTime() - weekStart.getTime()) / 86_400_000) + 1
    const endCol = Math.round((clampedEnd.getTime() - weekStart.getTime()) / 86_400_000) + 1
    const span = endCol - startCol + 1

    let lane = laneEndCol.findIndex((endC) => endC < startCol)
    if (lane === -1) { lane = laneEndCol.length; laneEndCol.push(endCol) }
    else laneEndCol[lane] = endCol

    segments.push({ task: r.task, startCol, span, lane, isRangeStart: clampedStart.getTime() === r.start.getTime() })
  }

  return { segments, laneCount: laneEndCol.length }
}

export function TaskCalendar({ tasks, onOpenTask }: TaskCalendarProps) {
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))

  const ranges = useMemo(() => tasks.map(taskRange).filter((r): r is TaskRange => r !== null), [tasks])

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const startWeekday = (firstOfMonth.getDay() + 6) % 7 // lundi = 0
    const gridStart = new Date(firstOfMonth)
    gridStart.setDate(gridStart.getDate() - startWeekday)

    const days: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      days.push(d)
    }
    const result: Date[][] = []
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7))
    return result
  }, [cursor])

  const today = startOfDay(new Date())

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/20 px-6 py-4">
        <h3 className="text-sm font-semibold capitalize text-gray-900">{MONTH_LABEL.format(cursor)}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-200"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setCursor(startOfDay(new Date()))}
            className="rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-200"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/40">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">{d}</div>
        ))}
      </div>

      {weeks.map((week) => {
        const { segments, laneCount } = layoutWeek(week, ranges)
        const visibleLanes = Math.min(laneCount, MAX_LANES)
        const overflowByCol = new Map<number, number>()
        if (laneCount > MAX_LANES) {
          for (const seg of segments) {
            if (seg.lane >= MAX_LANES) {
              for (let c = seg.startCol; c < seg.startCol + seg.span; c++) overflowByCol.set(c, (overflowByCol.get(c) ?? 0) + 1)
            }
          }
        }

        return (
          <div key={week[0].toISOString()} className="border-b border-gray-200">
            <div className="grid grid-cols-7">
              {week.map((day) => {
                const isCurrentMonth = day.getMonth() === cursor.getMonth()
                const isToday = day.getTime() === today.getTime()
                return (
                  <div key={toKey(day)} className={`border-r border-gray-200 px-1.5 pt-1.5 last:border-r-0 ${isCurrentMonth ? 'bg-gray-100' : 'bg-gray-50/30'}`}>
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${isToday ? 'bg-indigo-600 text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                      {day.getDate()}
                    </span>
                  </div>
                )
              })}
            </div>

            <div
              className="relative grid grid-cols-7 gap-y-1 px-1.5 pb-1.5"
              style={{ gridAutoRows: '20px', minHeight: `${visibleLanes * 22 + 4}px` }}
            >
              {segments.filter((s) => s.lane < MAX_LANES).map((seg) => (
                <button
                  key={`${seg.task.id}-${seg.startCol}`}
                  type="button"
                  onClick={() => onOpenTask(seg.task)}
                  className="flex items-center truncate rounded px-1.5 text-left text-[11px] font-medium text-white hover:opacity-85"
                  style={{
                    gridColumn: `${seg.startCol} / span ${seg.span}`,
                    gridRow: seg.lane + 1,
                    backgroundColor: taskColor(seg.task.color),
                  }}
                  title={seg.task.title}
                >
                  {seg.isRangeStart ? seg.task.title : ' '}
                </button>
              ))}
            </div>

            {overflowByCol.size > 0 && (
              <div className="grid grid-cols-7 px-1.5 pb-1">
                {week.map((day, i) => {
                  const count = overflowByCol.get(i + 1)
                  return <div key={toKey(day)} className="text-[10px] text-gray-500">{count ? `+${count} autre(s)` : ''}</div>
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
