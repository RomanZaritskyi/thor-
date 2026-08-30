import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { NotesPage } from '@/features/notes/components/notes-page'
import { NotesRepositoryProvider } from '@/features/notes/repository-provider'

const searchSchema = z.object({
  q: z.string().catch('').default(''),
})

export const Route = createFileRoute('/notes/')({
  validateSearch: searchSchema,
  component: NotesRoute,
})

function NotesRoute() {
  const { q } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <NotesRepositoryProvider>
      <NotesPage
        query={q}
        onQueryChange={(next) =>
          void navigate({ search: { q: next }, replace: true, resetScroll: false })
        }
      />
    </NotesRepositoryProvider>
  )
}
