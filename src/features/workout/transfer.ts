import { z } from 'zod'

import {
  blocksFromLegacySets,
  blockSchema,
  legacySetEntrySchema,
  exerciseSchema,
  setEntrySchema,
  type Block,
  type Exercise,
  type SetEntry,
} from './model'

export const TRANSFER_VERSION = 2
const LEGACY_VERSION = 1

export interface WorkoutData {
  exercises: Exercise[]
  blocks: Block[]
  sets: SetEntry[]
}

/** Version 1 predates blocks; its sets are reinterpreted on the way in. */
const legacyFileSchema = z.object({
  version: z.literal(LEGACY_VERSION),
  exportedAt: z.iso.datetime(),
  exercises: z.array(exerciseSchema),
  sets: z.array(legacySetEntrySchema),
})

const transferFileSchema = z.object({
  version: z.literal(TRANSFER_VERSION),
  exportedAt: z.iso.datetime(),
  exercises: z.array(exerciseSchema),
  blocks: z.array(blockSchema),
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
      blocks: data.blocks,
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
export function parseImport(
  text: string,
  createId: () => string = () => crypto.randomUUID(),
): ImportResult {
  let raw: unknown

  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'Файл не є коректним JSON' }
  }

  const version: unknown = (raw as { version?: unknown } | null)?.version

  if (version !== TRANSFER_VERSION && version !== LEGACY_VERSION) {
    return {
      ok: false,
      reason:
        `Непідтримувана версія файлу: ${String(version)}. ` +
        `Ця версія читає ${String(LEGACY_VERSION)} і ${String(TRANSFER_VERSION)}`,
    }
  }

  const malformed = {
    ok: false,
    reason: 'Записи у файлі не відповідають очікуваному формату',
  } as const
  let data: WorkoutData

  if (version === LEGACY_VERSION) {
    // Version 1 predates blocks. Its sets are reinterpreted as one closed block
    // per exercise per day — the same rule the database upgrade applies.
    const parsed = legacyFileSchema.safeParse(raw)

    if (!parsed.success) return malformed

    const upgraded = blocksFromLegacySets(parsed.data.sets, createId)
    data = { exercises: parsed.data.exercises, ...upgraded }
  } else {
    const parsed = transferFileSchema.safeParse(raw)

    if (!parsed.success) return malformed

    data = { exercises: parsed.data.exercises, blocks: parsed.data.blocks, sets: parsed.data.sets }
  }

  // A set whose exercise is missing would restore as an entry nothing can show.
  const known = new Set(data.exercises.map((exercise) => exercise.id))
  const orphans = data.sets.filter((entry) => !known.has(entry.exerciseId))

  if (orphans.length > 0) {
    return {
      ok: false,
      reason: `У файлі ${String(orphans.length)} підход(ів) без вправи, до якої вони належать`,
    }
  }

  return { ok: true, data }
}
