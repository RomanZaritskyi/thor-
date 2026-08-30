import { createFileRoute } from '@tanstack/react-router'

import { TransferPanel } from '@/features/workout/components/transfer-panel'

export const Route = createFileRoute('/data')({
  component: TransferPanel,
})
