import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { formatWhen } from '../format'
import { historyFor } from '../model'
import { useWorkoutData } from '../queries'
import { useWorkoutRepository } from '../repository-context'
import { ui } from '../strings'
import { SetList } from './set-list'

/**
 * FR-032 — every session of one exercise. Read-only by design: today's sets are
 * deleted on the exercise screen, where the run in progress is, and a second way
 * to delete the same set would be a second way to delete the wrong one (FR-016).
 */
export function HistoryScreen({ exerciseId }: { exerciseId: string }) {
  const workout = useWorkoutData()
  const today = useWorkoutRepository().today()

  const data = workout.data?.data
  const exercise = data?.exercises.find((candidate) => candidate.id === exerciseId)

  if (workout.isPending) {
    return <p className="text-sm text-muted-foreground">{ui.picker.loading}</p>
  }

  if (exercise === undefined || data === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">{ui.exercise.notFound}</p>
        <Button asChild variant="outline">
          <Link to="/history">{ui.history.back}</Link>
        </Button>
      </div>
    )
  }

  const sessions = historyFor(data.blocks, data.sets, exerciseId)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          to="/history"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {ui.history.back}
        </Link>

        {/* The name is the way back to doing the exercise: reading history and
            then wanting to record is the common next move. */}
        <h1 className="text-2xl font-semibold tracking-tight">
          <Link
            to="/exercise/$exerciseId"
            params={{ exerciseId }}
            className="inline-flex items-center gap-1 hover:underline"
          >
            {exercise.name}
            <ChevronRight className="size-5 text-muted-foreground" />
          </Link>
        </h1>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          {ui.exercise.noHistory}
        </p>
      ) : (
        <div className="space-y-6">
          {sessions.map(({ block, sets }) => (
            // Named by its own date rather than aria-label, so the heading is not
            // read out twice.
            <section key={block.id} aria-labelledby={`session-${block.id}`} className="space-y-2">
              <h2 id={`session-${block.id}`} className="text-sm font-medium text-muted-foreground">
                {formatWhen(block.date, block.startedAt, today)}
              </h2>
              <SetList sets={sets} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
