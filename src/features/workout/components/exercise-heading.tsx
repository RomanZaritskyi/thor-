import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { exerciseNameSchema, type Exercise } from '../model'
import { useRemoveExercise, useRenameExercise } from '../queries'
import { ui } from '../strings'

/**
 * FR-025, FR-026 — the name is fixed where the mistake is noticed. Removal is
 * offered only when nothing is recorded; the repository enforces that too, so
 * hiding the button is convenience, not the guard.
 */
export function ExerciseHeading({
  exercise,
  hasHistory,
  onRemoved,
}: {
  exercise: Exercise
  hasHistory: boolean
  onRemoved: () => void
}) {
  const rename = useRenameExercise()
  const remove = useRemoveExercise()
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (draft === null) {
    return (
      <div className="flex items-start gap-2">
        <h1 className="flex-1 text-2xl font-semibold tracking-tight">{exercise.name}</h1>

        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={ui.exercise.rename}
          onClick={() => {
            setError(null)
            setDraft(exercise.name)
          }}
        >
          <Pencil />
        </Button>

        {hasHistory ? null : (
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={ui.exercise.remove}
            disabled={remove.isPending}
            onClick={() => {
              remove.mutate(exercise.id, { onSuccess: onRemoved })
            }}
          >
            <Trash2 />
          </Button>
        )}
      </div>
    )
  }

  function save() {
    const parsed = exerciseNameSchema.safeParse(draft)

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? ui.errors.generic)
      return
    }

    rename.mutate(
      { id: exercise.id, name: parsed.data },
      {
        onSuccess: () => {
          setDraft(null)
          setError(null)
        },
        onError: (cause: unknown) => {
          setError(cause instanceof Error ? cause.message : ui.errors.generic)
        },
      },
    )
  }

  return (
    <form
      noValidate
      aria-label={ui.exercise.rename}
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <Label htmlFor="exercise-name">{ui.exercise.renameLabel}</Label>
      <Input
        id="exercise-name"
        autoFocus
        value={draft}
        aria-invalid={error === null ? undefined : true}
        onChange={(event) => {
          setDraft(event.target.value)
        }}
      />
      {error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={rename.isPending}>
          {ui.exercise.renameSave}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDraft(null)
            setError(null)
          }}
        >
          {ui.exercise.renameCancel}
        </Button>
      </div>
    </form>
  )
}
