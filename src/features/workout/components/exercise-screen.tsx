import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { formatWhen } from '../format'
import { currentBlock, nextSet, previousBlock, setRows } from '../model'
import { useDeleteSet, useFinishExercise, useRecordSet, useWorkoutData } from '../queries'
import { useWorkoutRepository } from '../repository-context'
import { ui } from '../strings'
import { ExerciseHeading } from './exercise-heading'
import { RecordSetForm } from './record-set-form'
import { SetList } from './set-list'
import { SetTable } from './set-table'

export function ExerciseScreen({ exerciseId }: { exerciseId: string }) {
  const workout = useWorkoutData()
  const recordSet = useRecordSet()
  const deleteSet = useDeleteSet()
  const finishExercise = useFinishExercise()
  const today = useWorkoutRepository().today()
  const navigate = useNavigate()
  const [fixingPrevious, setFixingPrevious] = useState(false)

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
  const rows = setRows(current, previous)
  const next = nextSet(current, previous)
  // Remount the form when the numbers it should start from change (FR-020).
  const prefillKey = `${String(next.prefill?.weightKg ?? '')}x${String(next.prefill?.reps ?? '')}`

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
        <ExerciseHeading
          exercise={exercise}
          hasHistory={data.sets.some((entry) => entry.exerciseId === exerciseId)}
          onRemoved={() => {
            void navigate({ to: '/' })
          }}
        />
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
        ) : null}

        {rows.length === 0 ? null : (
          <SetTable
            rows={rows}
            nextPosition={next.position}
            onDelete={(entry) => {
              deleteSet.mutate(entry.id)
            }}
          />
        )}

        {/* FR-016 — a block closed earlier today is still fixable. Its sets live
            in the Previous column, where a second delete per row would be
            ambiguous, so they get their own place instead. */}
        {previous?.block.date === today ? (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-11"
              aria-expanded={fixingPrevious}
              onClick={() => {
                setFixingPrevious(!fixingPrevious)
              }}
            >
              {fixingPrevious ? ui.exercise.hidePrevious : ui.exercise.fixPrevious}
            </Button>
            {fixingPrevious ? (
              <SetList
                sets={previous.sets}
                onDelete={(entry) => {
                  deleteSet.mutate(entry.id)
                }}
              />
            ) : null}
          </div>
        ) : null}
        {/* FR-032 — the slower question, one tap from the faster one. */}
        {previous === undefined ? null : (
          <Link
            to="/history/$exerciseId"
            params={{ exerciseId }}
            className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {ui.history.all}
            <ChevronRight className="size-4" />
          </Link>
        )}
      </section>

      <RecordSetForm
        key={prefillKey}
        prefill={next.prefill}
        caption={ui.record.forPosition(
          next.position,
          next.previous === undefined
            ? undefined
            : ui.set.summary(next.previous.weightKg, next.previous.reps),
        )}
        isSubmitting={recordSet.isPending}
        onSubmit={(draft) => {
          recordSet.mutate({ exerciseId, draft })
        }}
      />

      {/* FR-024. Below the form: closing a run should take a deliberate reach,
          not sit under the thumb that taps «Записати підхід». */}
      {current === undefined || current.sets.length === 0 ? null : (
        <div className="space-y-2">
          <Button
            variant="secondary"
            className="h-11 w-full"
            disabled={finishExercise.isPending}
            onClick={() => {
              finishExercise.mutate(exerciseId)
            }}
          >
            {finishExercise.isPending ? ui.exercise.finishing : ui.exercise.finish}
          </Button>
          <p className="text-xs text-muted-foreground">{ui.exercise.finishHint}</p>
        </div>
      )}
    </div>
  )
}
