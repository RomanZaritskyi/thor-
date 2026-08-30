import { z } from 'zod'

import { exerciseSchema, setEntrySchema, type Exercise, type SetEntry } from './model'

export const TRANSFER_VERSION = 1

export interface WorkoutData {
  exercises: Exercise[]
  sets: SetEntry[]
}

const transferFileSchema = z.object({
  version: z.literal(TRANSFER_VERSION),
  exportedAt: z.iso.datetime(),
  exercises: z.array(exerciseSchema),
  sets: z.array(setEntrySchema),
})

export type ImportResult = { ok: true; data: WorkoutData } | { ok: false; reason: string }

/**
 * FR-017 — a versioned envelope, indented so it stays readable in any text
 * editor. The version is written from the first release so a later format change
 * has somewhere to branch instead of guessing.
 */
export function exportToJson(data: WorkoutData, exportedAt: Date): string {
  return JSON.stringify(
    {
      version: TRANSFER_VERSION,
      exportedAt: exportedAt.toISOString(),
      exercises: data.exercises,
      sets: data.sets,
    },
    null,
    2,
  )
}

/**
 * FR-018 — everything crossing this boundary is parsed, never trusted. A file
 * this function accepts is one the app can fully restore; anything else is
 * refused with a reason rather than partially applied.
 */
export function parseImport(text: string): ImportResult {
  let raw: unknown

  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'Файл не є коректним JSON' }
  }

  const version: unknown = (raw as { version?: unknown } | null)?.version

  if (version !== TRANSFER_VERSION) {
    return {
      ok: false,
      reason: `Непідтримувана версія файлу: ${String(version)}. Ця версія читає ${String(TRANSFER_VERSION)}`,
    }
  }

  const parsed = transferFileSchema.safeParse(raw)

  if (!parsed.success) {
    return { ok: false, reason: 'Записи у файлі не відповідають очікуваному формату' }
  }

  // A set whose exercise is missing would restore as an entry nothing can show.
  const known = new Set(parsed.data.exercises.map((exercise) => exercise.id))
  const orphans = parsed.data.sets.filter((entry) => !known.has(entry.exerciseId))

  if (orphans.length > 0) {
    return {
      ok: false,
      reason: `У файлі ${String(orphans.length)} підход(ів) без вправи, до якої вони належать`,
    }
  }

  return { ok: true, data: { exercises: parsed.data.exercises, sets: parsed.data.sets } }
}
