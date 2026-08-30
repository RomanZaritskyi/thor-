import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { exerciseNameSchema, searchExercises } from '../model'
import { useAddExercise, useWorkoutData } from '../queries'
import { ui } from '../strings'

export function ExercisePicker({
  query,
  onQueryChange,
}: {
  query: string
  onQueryChange: (query: string) => void
}) {
  const workout = useWorkoutData()
  const addExercise = useAddExercise()
  const [draftName, setDraftName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const exercises = workout.data?.data.exercises ?? []
  // No useMemo: the React Compiler memoises this (see vite.config.ts).
  const visible = searchExercises(exercises, query)

  function submit() {
    const parsed = exerciseNameSchema.safeParse(draftName)

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? ui.errors.generic)
      return
    }

    setError(null)
    addExercise.mutate(parsed.data, {
      onSuccess: () => {
        setDraftName('')
      },
      onError: (cause: unknown) => {
        setError(cause instanceof Error ? cause.message : ui.errors.generic)
      },
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{ui.picker.title}</h1>

      <div className="space-y-2">
        <Label htmlFor="exercise-search">{ui.picker.searchLabel}</Label>
        <Input
          id="exercise-search"
          type="search"
          inputMode="search"
          placeholder={ui.picker.searchPlaceholder}
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value)
          }}
        />
      </div>

      {workout.isPending ? (
        <p className="text-sm text-muted-foreground">{ui.picker.loading}</p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {exercises.length === 0 ? ui.picker.emptyAll : ui.picker.emptySearch(query)}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((exercise) => (
            <li key={exercise.id}>
              <Link
                to="/exercise/$exerciseId"
                params={{ exerciseId: exercise.id }}
                className="flex min-h-12 items-center rounded-lg border px-4 py-3 text-base transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {exercise.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form
        noValidate
        className="space-y-2 border-t pt-6"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Label htmlFor="new-exercise">{ui.picker.addLabel}</Label>
        <div className="flex gap-2">
          <Input
            id="new-exercise"
            value={draftName}
            aria-invalid={error === null ? undefined : true}
            aria-describedby={error === null ? undefined : 'new-exercise-error'}
            onChange={(event) => {
              setDraftName(event.target.value)
            }}
          />
          <Button type="submit" disabled={addExercise.isPending}>
            {ui.picker.add}
          </Button>
        </div>
        {error === null ? null : (
          <p id="new-exercise-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
