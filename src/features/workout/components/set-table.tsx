import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { SetEntry, SetRow } from '../model'
import { ui } from '../strings'

/**
 * The numbers of one set, plus whatever qualifies them. The summary carries the
 * test id on its own, so an assertion on the recorded values is not polluted by
 * a note or the bodyweight hint sitting beside it.
 */
function SetCell({ entry, testId }: { entry: SetEntry; testId: string }) {
  return (
    <div className="space-y-0.5">
      <span data-testid={testId} className="tabular-nums">
        {ui.set.summary(entry.weightKg, entry.reps)}
      </span>
      {entry.weightKg === 0 ? (
        <span className="block text-xs text-muted-foreground">{ui.set.bodyweight}</span>
      ) : null}
      {/* FR-014 — a note shows wherever its set shows, on either side. */}
      {entry.note === undefined ? null : (
        <span className="block text-xs break-words text-muted-foreground">{entry.note}</span>
      )}
    </div>
  )
}

/**
 * FR-030 — the comparison, side by side. Reading across a row answers the only
 * question the app exists for: am I ahead of last time on this set?
 */
export function SetTable({
  rows,
  nextPosition,
  onDelete,
}: {
  rows: readonly SetRow[]
  /** The set about to be recorded, marked when last time reached that far. */
  nextPosition: number
  onDelete: (entry: SetEntry) => void
}) {
  return (
    <table aria-label={ui.sets.tableLabel} className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs font-medium text-muted-foreground">
          <th scope="col" className="w-8 pb-1 font-medium">
            {ui.sets.position}
          </th>
          <th scope="col" className="pb-1 font-medium">
            {ui.sets.previousColumn}
          </th>
          <th scope="col" className="pb-1 font-medium">
            {ui.sets.todayColumn}
          </th>
          <th scope="col" className="w-11">
            <span className="sr-only">{ui.sets.actions}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.position}
            aria-current={row.position === nextPosition ? 'step' : undefined}
            className="border-t aria-[current]:bg-accent/40"
          >
            <th scope="row" className="py-2 align-top font-normal text-muted-foreground">
              {row.position}
            </th>

            <td className="py-2 pr-2 align-top text-muted-foreground">
              {row.previous === undefined ? (
                ui.sets.none
              ) : (
                <SetCell entry={row.previous} testId="set-previous" />
              )}
            </td>

            <td className="py-2 pr-2 align-top font-medium">
              {row.today === undefined ? (
                <span className="font-normal text-muted-foreground">
                  {row.position === nextPosition ? ui.sets.next : ui.sets.none}
                </span>
              ) : (
                <SetCell entry={row.today} testId="set-summary" />
              )}
            </td>

            <td className="align-top">
              {/* FR-016 — today's sets are deletable; the previous block has its
                  own place below, so one button never means two things. */}
              {row.today === undefined ? null : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label={ui.set.delete(row.today.weightKg, row.today.reps)}
                  onClick={() => {
                    if (row.today !== undefined) onDelete(row.today)
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
