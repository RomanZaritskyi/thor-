import { daysBetween } from './model'
import { ui } from './strings'

/**
 * When a session happened, in the terms the decision needs: a run finished an
 * hour ago is "сьогодні, 10:32", one from last week is a date and a distance.
 */
export function formatWhen(date: string, startedAt: string, today: string): string {
  if (date === today) {
    return ui.exercise.atTime(
      new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(startedAt),
      ),
    )
  }

  const formatted = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' }).format(
    new Date(`${date}T00:00:00`),
  )

  return `${formatted} · ${ui.exercise.daysAgo(daysBetween(date, today))}`
}

/**
 * FR-031 — how many sessions an exercise holds. Ukrainian needs two forms here:
 * 1 and 2 тренування, but 5 and 11 тренувань.
 */
export function formatSessions(count: number): string {
  const withinHundred = count % 100
  const last = count % 10
  const many = (withinHundred >= 11 && withinHundred <= 14) || last === 0 || last >= 5

  return `${String(count)} ${many ? ui.history.sessions.many : ui.history.sessions.few}`
}
