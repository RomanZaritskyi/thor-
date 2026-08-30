import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { SetEntry } from '../model'
import { ui } from '../strings'

export function SetList({
  sets,
  onDelete,
}: {
  sets: readonly SetEntry[]
  /** Omitted for past days: only today is editable (FR-016). */
  onDelete?: (entry: SetEntry) => void
}) {
  return (
    <ol className="space-y-2">
      {sets.map((entry, index) => (
        <li key={entry.id} className="flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2">
          <span className="w-6 shrink-0 text-sm text-muted-foreground">{index + 1}</span>

          <span data-testid="set-summary" className="text-base font-medium tabular-nums">
            {ui.set.summary(entry.weightKg, entry.reps)}
          </span>

          {entry.weightKg === 0 ? (
            <span className="text-xs text-muted-foreground">{ui.set.bodyweight}</span>
          ) : null}

          {entry.note === undefined ? null : (
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              {entry.note}
            </span>
          )}

          {onDelete === undefined ? null : (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              aria-label={ui.set.delete(entry.weightKg, entry.reps)}
              onClick={() => {
                onDelete(entry)
              }}
            >
              <Trash2 />
            </Button>
          )}
        </li>
      ))}
    </ol>
  )
}
