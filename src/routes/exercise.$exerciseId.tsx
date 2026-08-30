import { createFileRoute } from '@tanstack/react-router'

import { ExerciseScreen } from '@/features/workout/components/exercise-screen'

export const Route = createFileRoute('/exercise/$exerciseId')({
  component: ExerciseRoute,
})

function ExerciseRoute() {
  const { exerciseId } = Route.useParams()

  return <ExerciseScreen exerciseId={exerciseId} />
}
