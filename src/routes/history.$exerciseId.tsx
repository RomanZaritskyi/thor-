import { createFileRoute } from '@tanstack/react-router'

import { HistoryScreen } from '@/features/workout/components/history-screen'

export const Route = createFileRoute('/history/$exerciseId')({
  component: HistoryRoute,
})

function HistoryRoute() {
  const { exerciseId } = Route.useParams()

  return <HistoryScreen exerciseId={exerciseId} />
}
