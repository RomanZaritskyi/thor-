import { createFileRoute } from '@tanstack/react-router'

import { HistoryIndex } from '@/features/workout/components/history-index'

export const Route = createFileRoute('/history/')({
  component: HistoryIndex,
})
