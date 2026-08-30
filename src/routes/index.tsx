import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { ExercisePicker } from '@/features/workout/components/exercise-picker'

const searchSchema = z.object({
  q: z.string().catch('').default(''),
})

export const Route = createFileRoute('/')({
  validateSearch: searchSchema,
  component: PickerRoute,
})

function PickerRoute() {
  const { q } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <ExercisePicker
      query={q}
      onQueryChange={(next) => {
        void navigate({ search: { q: next }, replace: true, resetScroll: false })
      }}
    />
  )
}
