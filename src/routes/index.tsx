import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { ExercisePicker } from '@/features/workout/components/exercise-picker'

// Optional rather than defaulting to '': a default would be serialised into the
// URL on every visit, making `/?q=` the canonical home address for a search that
// is not happening.
const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
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
      query={q ?? ''}
      onQueryChange={(next) => {
        void navigate({
          search: { q: next === '' ? undefined : next },
          replace: true,
          resetScroll: false,
        })
      }}
    />
  )
}
