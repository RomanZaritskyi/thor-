import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { downloadFile, exportFilename, type SaveFile } from '../download'
import { useReplaceAll, useWorkoutData } from '../queries'
import { ui } from '../strings'
import { exportToJson, parseImport, type WorkoutData } from '../transfer'

type Status =
  | { kind: 'idle' }
  | { kind: 'confirming'; incoming: WorkoutData }
  | { kind: 'error'; reason: string }
  | { kind: 'done'; message: string }

export function TransferPanel({ saveFile = downloadFile }: { saveFile?: SaveFile }) {
  const workout = useWorkoutData()
  const replaceAll = useReplaceAll()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const current = workout.data?.data ?? { exercises: [], blocks: [], sets: [] }

  async function chooseFile(file: File | undefined) {
    if (file === undefined) return

    const result = parseImport(await file.text())

    setStatus(
      result.ok
        ? { kind: 'confirming', incoming: result.data }
        : { kind: 'error', reason: result.reason },
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">{ui.transfer.title}</h1>

      <section className="space-y-3">
        <h2 className="font-medium">{ui.transfer.exportHeading}</h2>
        <p className="text-sm text-muted-foreground">{ui.transfer.exportHint}</p>
        <Button
          variant="outline"
          onClick={() => {
            const now = new Date()
            saveFile(exportFilename(now), exportToJson(current, now))
          }}
        >
          {ui.transfer.export}
        </Button>
      </section>

      <section className="space-y-3 border-t pt-6">
        <h2 className="font-medium">{ui.transfer.importHeading}</h2>
        <p className="text-sm text-muted-foreground">{ui.transfer.importHint}</p>

        <div className="space-y-2">
          <Label htmlFor="import-file">{ui.transfer.importLabel}</Label>
          <Input
            id="import-file"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              void chooseFile(event.target.files?.[0])
            }}
          />
        </div>

        {status.kind === 'error' ? (
          <p role="alert" className="text-sm text-destructive">
            {status.reason}
          </p>
        ) : null}

        {status.kind === 'done' ? (
          <p className="text-sm text-muted-foreground">{status.message}</p>
        ) : null}

        {status.kind === 'confirming' ? (
          <div
            role="group"
            aria-label={ui.transfer.confirmTitle}
            className="space-y-3 rounded-xl border border-destructive/40 p-4"
          >
            <p className="font-medium">{ui.transfer.confirmTitle}</p>
            {/* FR-019: name the loss before it happens, not after. */}
            <p className="text-sm text-destructive">
              {ui.transfer.confirmBody(current.exercises.length, current.sets.length)}
            </p>
            <p className="text-sm text-muted-foreground">
              {ui.transfer.confirmFile(
                status.incoming.exercises.length,
                status.incoming.sets.length,
              )}
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={replaceAll.isPending}
                onClick={() => {
                  replaceAll.mutate(status.incoming, {
                    onSuccess: () => {
                      setStatus({ kind: 'done', message: ui.transfer.imported })
                    },
                    onError: () => {
                      setStatus({ kind: 'error', reason: ui.errors.generic })
                    },
                  })
                }}
              >
                {ui.transfer.confirm}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStatus({ kind: 'done', message: ui.transfer.cancelled })
                }}
              >
                {ui.transfer.cancel}
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
