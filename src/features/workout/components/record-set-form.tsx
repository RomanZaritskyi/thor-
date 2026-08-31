import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { setDraftSchema, stepValue, type SetDraft } from '../model'
import { ui } from '../strings'

export interface Prefill {
  weightKg: number
  reps: number
}

/**
 * Controlled inputs rather than react-hook-form: the fields must arrive
 * prefilled (FR-020), which makes them controlled anyway, and `register()` is
 * incompatible with the React Compiler (see CLAUDE.md).
 */
const WEIGHT_STEP = 2.5
const REPS_STEP = 1

/** FR-027 — a 44px target either side of the number, so no typing is needed. */
function Stepper({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string
  disabled: boolean
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="size-11 shrink-0"
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
    >
      {children}
    </Button>
  )
}

export function RecordSetForm({
  prefill,
  isSubmitting = false,
  onSubmit,
}: {
  prefill: Prefill | undefined
  isSubmitting?: boolean
  onSubmit: (draft: SetDraft) => void
}) {
  // FR-020: seeded from the most recent set. The caller keys this component on
  // the prefill, so a new one remounts the form rather than being synced into it
  // by an effect — React's own answer to "reset state when a prop changes".
  const [weight, setWeight] = useState(() =>
    prefill === undefined ? '' : String(prefill.weightKg),
  )
  const [reps, setReps] = useState(() => (prefill === undefined ? '' : String(prefill.reps)))
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    const parsed = setDraftSchema.safeParse({
      weightKg: weight.trim() === '' ? Number.NaN : Number(weight),
      reps: reps.trim() === '' ? Number.NaN : Number(reps),
      note,
    })

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? ui.errors.generic)
      return
    }

    setError(null)
    setNote('')
    onSubmit(parsed.data)
  }

  const invalid = error === null ? undefined : true

  return (
    <form
      noValidate
      aria-label={ui.record.legend}
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="set-weight">{ui.record.weightLabel}</Label>
          <div className="flex items-center gap-2">
            <Stepper
              label={ui.record.weightDown}
              disabled={Number(weight) <= 0}
              onPress={() => {
                setWeight(stepValue(weight, -WEIGHT_STEP, 0))
              }}
            >
              <Minus />
            </Stepper>
            <Input
              id="set-weight"
              type="number"
              inputMode="decimal"
              step={WEIGHT_STEP}
              min="0"
              className="h-11 text-center text-lg"
              aria-invalid={invalid}
              value={weight}
              onChange={(event) => {
                setWeight(event.target.value)
              }}
            />
            <Stepper
              label={ui.record.weightUp}
              disabled={false}
              onPress={() => {
                setWeight(stepValue(weight, WEIGHT_STEP, 0))
              }}
            >
              <Plus />
            </Stepper>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="set-reps">{ui.record.repsLabel}</Label>
          <div className="flex items-center gap-2">
            <Stepper
              label={ui.record.repsDown}
              disabled={Number(reps) <= 1}
              onPress={() => {
                setReps(stepValue(reps, -REPS_STEP, 1))
              }}
            >
              <Minus />
            </Stepper>
            <Input
              id="set-reps"
              type="number"
              inputMode="numeric"
              step={REPS_STEP}
              min="1"
              className="h-11 text-center text-lg"
              aria-invalid={invalid}
              value={reps}
              onChange={(event) => {
                setReps(event.target.value)
              }}
            />
            <Stepper
              label={ui.record.repsUp}
              disabled={false}
              onPress={() => {
                setReps(stepValue(reps, REPS_STEP, 1))
              }}
            >
              <Plus />
            </Stepper>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="set-note">{ui.record.noteLabel}</Label>
        <Input
          id="set-note"
          value={note}
          onChange={(event) => {
            setNote(event.target.value)
          }}
        />
      </div>

      {error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? ui.record.submitting : ui.record.submit}
      </Button>
    </form>
  )
}
