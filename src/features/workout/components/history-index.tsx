import { Link } from '@tanstack/react-router'

import { formatSessions } from '../format'
import { daysBetween, historyFor, sortExercisesByRecency } from '../model'
import { useWorkoutData } from '../queries'
import { useWorkoutRepository } from '../repository-context'
import { ui } from '../strings'

/**
 * FR-031 — the way into history. It lists what has history rather than what
 * exists, and says how much, which is what makes it a different screen from the
 * exercise list rather than the same one with another destination.
 */
export function HistoryIndex() {
  const workout = useWorkoutData()
  const today = useWorkoutRepository().today()

  const data = workout.data?.data
  const sets = data?.sets ?? []
  const blocks = data?.blocks ?? []

  // No useMemo: the React Compiler memoises this (see vite.config.ts).
  const recorded = sortExercisesByRecency(data?.exercises ?? [], sets).flatMap((exercise) => {
    const sessions = historyFor(blocks, sets, exercise.id)
    const latest = sessions[0]

    return latest === undefined ? [] : [{ exercise, count: sessions.length, latest }]
  })

  if (workout.isPending) {
    return <p className="text-sm text-muted-foreground">{ui.picker.loading}</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{ui.history.title}</h1>

      {recorded.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {ui.history.empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {recorded.map(({ exercise, count, latest }) => (
            <li key={exercise.id}>
              <Link
                to="/history/$exerciseId"
                params={{ exerciseId: exercise.id }}
                className="flex min-h-14 flex-col justify-center rounded-lg border px-4 py-3 transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span className="text-base">{exercise.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatSessions(count)} ·{' '}
                  {ui.exercise.daysAgo(daysBetween(latest.block.date, today))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
