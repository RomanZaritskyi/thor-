import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { groupSetsByDate, lastSession, prefillFrom, type SetEntry } from '../model'
import { useDeleteSet, useRecordSet, useWorkoutData } from '../queries'
import { useWorkoutRepository } from '../repository-context'
import { ui } from '../strings'
import { RecordSetForm } from './record-set-form'
import { SetList } from './set-list'

function formatDay(date: string, today: string): string {
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
  const today = useWorkoutRepository().today()
  const data = workout.data?.data
  const exercise = data?.exercises.find((candidate) => candidate.id === exerciseId)
  const sets: SetEntry[] = data?.sets.filter((entry) => entry.exerciseId === exerciseId) ?? []

  if (workout.isPending) {
    return <p className="text-sm text-muted-foreground">{ui.picker.loading}</p>
  }

  if (exercise === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">{ui.exercise.notFound}</p>
        <Button asChild variant="outline">
          <Link to="/">{ui.exercise.back}</Link>
        </Button>
      </div>
    )
  }

  const previous = lastSession(sets, today)
  const prefill = prefillFrom(sets, today)
  // Remount the form when the numbers it should start from change (FR-020).
  const prefillKey = `${String(prefill?.weightKg ?? '')}x${String(prefill?.reps ?? '')}`
  const todaySets = groupSetsByDate(sets).find((day) => day.date === today)?.sets ?? []

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
            <span className="ml-2 font-normal">{formatDay(previous.date, today)}</span>
          )}
        </h2>
        {previous === undefined ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {ui.exercise.noHistory}
          </p>
        ) : (
          <SetList sets={previous.sets} />
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

      <section aria-label={ui.exercise.today} className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">{ui.exercise.today}</h2>
        {todaySets.length === 0 ? (
          <p className="text-sm text-muted-foreground">{ui.exercise.noSetsToday}</p>
        ) : (
          <SetList
            sets={todaySets}
            onDelete={(entry) => {
              deleteSet.mutate(entry.id)
            }}
          />
        )}
      </section>
    </div>
  )
}
