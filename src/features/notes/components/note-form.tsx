import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { noteDraftSchema, NOTE_BODY_MAX, NOTE_TITLE_MAX, type NoteDraft } from '../model'

export function NoteForm({
  onSubmit,
  isSubmitting = false,
}: {
  onSubmit: (draft: NoteDraft) => Promise<unknown>
  isSubmitting?: boolean
}) {
  // react-hook-form's `register()` mutates form state during render, which breaks
  // the Rules of React the compiler relies on: memoised JSX stops re-registering
  // fields and every submit after a `reset()` sees empty values. Opting this one
  // component out is react-hook-form's documented answer.
  'use no memo'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful },
  } = useForm<NoteDraft>({
    resolver: zodResolver(noteDraftSchema),
    defaultValues: { title: '', body: '' },
  })

  // react-hook-form finalises its state *after* the submit handler resolves, so a
  // `reset()` called inside the handler gets clobbered and the next submit sees a
  // stale, empty value. Resetting from an effect is the supported way.
  useEffect(() => {
    if (isSubmitSuccessful) reset()
  }, [isSubmitSuccessful, reset])

  return (
    <form
      noValidate
      aria-label="Create note"
      className="space-y-4 rounded-xl border p-4"
      onSubmit={handleSubmit(async (draft) => {
        await onSubmit(draft)
      })}
    >
      <div className="space-y-2">
        <Label htmlFor="note-title">Title</Label>
        <Input
          id="note-title"
          maxLength={NOTE_TITLE_MAX}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? 'note-title-error' : undefined}
          {...register('title')}
        />
        {errors.title ? (
          <p id="note-title-error" role="alert" className="text-sm text-destructive">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-body">Body</Label>
        <Textarea
          id="note-body"
          rows={3}
          maxLength={NOTE_BODY_MAX}
          aria-invalid={errors.body ? true : undefined}
          aria-describedby={errors.body ? 'note-body-error' : undefined}
          {...register('body')}
        />
        {errors.body ? (
          <p id="note-body-error" role="alert" className="text-sm text-destructive">
            {errors.body.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Adding…' : 'Add note'}
      </Button>
    </form>
  )
}
