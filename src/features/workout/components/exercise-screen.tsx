import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { currentBlock, prefillFrom, previousBlock } from '../model'
import { useDeleteSet, useFinishExercise, useRecordSet, useWorkoutData } from '../queries'
import { useWorkoutRepository } from '../repository-context'
import { ui } from '../strings'
import { RecordSetForm } from './record-set-form'
import { SetList } from './set-list'

/**
 * When a block happened, in the terms the decision needs: a run finished an hour
 * ago is "сьогодні, 10:32", one from last week is a date and a distance.
 */
function formatWhen(date: string, startedAt: string, today: string): string {
  if (date === today) {
    return ui.exercise.atTime(
      new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(startedAt),
      ),
    )
  }

  const parsed = new Date(`${date}T00:00:00`)
  const days = Math.round((new Date(`${today}T00:00:00`).getTime() - parsed.getTime()) / 86_400_000)
  const formatted = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' }).format(
    parsed,
  )

  return `${formatted} · ${ui.exercise.daysAgo(days)}`
}

export function ExerciseScreen({ exerciseId }: { exerciseId: string }) {
  const workout = useWorkoutData()
  const recordSet = useRecordSet()
  const deleteSet = useDeleteSet()
  const finishExercise = useFinishExercise()
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
          <Link to="/">{ui.exercise.back}</Link>
        </Button>
      </div>
    )
  }

  const previous = previousBlock(data.blocks, data.sets, exerciseId, today)
  const current = currentBlock(data.blocks, data.sets, exerciseId, today)
  const prefill = prefillFrom(data.blocks, data.sets, exerciseId, today)
  // Remount the form when the numbers it should start from change (FR-020).
  const prefillKey = `${String(prefill?.weightKg ?? '')}x${String(prefill?.reps ?? '')}`

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {ui.exercise.back}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{exercise.name}</h1>
      </div>

      <section aria-label={ui.exercise.lastTime} className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {ui.exercise.lastTime}
          {previous === undefined ? null : (
            <span className="ml-2 font-normal">
              {formatWhen(previous.block.date, previous.block.startedAt, today)}
            </span>
          )}
        </h2>
        {previous === undefined ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {ui.exercise.noHistory}
          </p>
        ) : (
          <SetList
            sets={previous.sets}
            onDelete={
              previous.block.date === today
                ? (entry) => {
                    deleteSet.mutate(entry.id)
                  }
                : undefined
            }
          />
        )}
      </section>

      <RecordSetForm
        key={prefillKey}
        prefill={prefill}
        isSubmitting={recordSet.isPending}
        onSubmit={(draft) => {
          recordSet.mutate({ exerciseId, draft })
        }}
      />

      <section aria-label={ui.exercise.today} className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">{ui.exercise.today}</h2>
        {current === undefined || current.sets.length === 0 ? (
          <p className="text-sm text-muted-foreground">{ui.exercise.noSetsToday}</p>
        ) : (
          <>
            <SetList
              sets={current.sets}
              onDelete={(entry) => {
                deleteSet.mutate(entry.id)
              }}
            />
            {/* FR-024 */}
            <div className="space-y-2 border-t pt-3">
              <Button
                variant="secondary"
                className="w-full"
                disabled={finishExercise.isPending}
                onClick={() => {
                  finishExercise.mutate(exerciseId)
                }}
              >
                {finishExercise.isPending ? ui.exercise.finishing : ui.exercise.finish}
              </Button>
              <p className="text-xs text-muted-foreground">{ui.exercise.finishHint}</p>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
