import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

import { downloadFile, exportFilename, type SaveFile } from '../download'
import { useReplaceAll, useWorkoutData } from '../queries'
import { ui } from '../strings'
import { exportToJson } from '../transfer'

/**
 * FR-012 — the visible half of the invariant the repository enforces. When the
 * log cannot be read, the app does not open in a state where a new set could be
 * recorded on top of data we cannot see. It says what happened, offers the rows
 * it could read as a file, and makes erasing a deliberate two-step act.
 */
export function DataGuard({
  children,
  saveFile = downloadFile,
}: {
  children: ReactNode
  saveFile?: SaveFile
}) {
  const workout = useWorkoutData()
  const replaceAll = useReplaceAll()
  const [confirming, setConfirming] = useState(false)

  if (workout.data?.status !== 'unreadable') return children

  const salvaged = workout.data.data

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-destructive">
          {ui.unreadable.title}
        </h1>
        <p className="text-muted-foreground">{ui.unreadable.body}</p>
        <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm">
          {workout.data.reason}
        </p>
      </div>

      <section className="space-y-3 border-t pt-6">
        <h2 className="font-medium">{ui.unreadable.salvageHeading}</h2>
        <p className="text-sm text-muted-foreground">
          {ui.transfer.confirmFile(salvaged.exercises.length, salvaged.sets.length)}
        </p>
        <Button
          variant="outline"
          onClick={() => {
            const now = new Date()
            saveFile(exportFilename(now), exportToJson(salvaged, now))
          }}
        >
          {ui.unreadable.salvage}
        </Button>
      </section>

      <section className="space-y-3 border-t pt-6">
        <h2 className="font-medium">{ui.unreadable.eraseHeading}</h2>
        <p className="text-sm text-muted-foreground">{ui.unreadable.eraseHint}</p>

        {confirming ? (
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={replaceAll.isPending}
              onClick={() => {
                replaceAll.mutate({ exercises: [], blocks: [], sets: [] })
              }}
            >
              {ui.unreadable.eraseConfirm}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setConfirming(false)
              }}
            >
              {ui.unreadable.cancel}
            </Button>
          </div>
        ) : (
          <Button
            variant="destructive"
            onClick={() => {
              setConfirming(true)
            }}
          >
            {ui.unreadable.erase}
          </Button>
        )}
      </section>
    </div>
  )
}
