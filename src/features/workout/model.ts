import { z } from 'zod'

export const NOTE_MAX = 120
export const EXERCISE_NAME_MAX = 60

export const exerciseSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(EXERCISE_NAME_MAX),
  /** Uniqueness key behind FR-009. Stored, not recomputed, so the index can enforce it. */
  normalizedName: z.string().min(1),
  createdAt: z.iso.datetime(),
})

/**
 * A run at one exercise. `closedAt` is set by finishing it by hand; a block from
 * an earlier day counts as closed regardless, because forgetting to finish is
 * certain and an overnight block would swallow tomorrow's first attempt.
 */
export const blockSchema = z.object({
  id: z.uuid(),
  exerciseId: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startedAt: z.iso.datetime(),
  closedAt: z.iso.datetime().nullable(),
})

export const setEntrySchema = z.object({
  id: z.uuid(),
  exerciseId: z.uuid(),
  blockId: z.uuid(),
  /** Local calendar day, `YYYY-MM-DD` — see `todayKey`. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  loggedAt: z.iso.datetime(),
  weightKg: z.number().min(0),
  reps: z.number().int().min(1),
  note: z.string().max(NOTE_MAX).optional(),
})

/** How sets looked before blocks existed: one run per exercise per day, implied. */
export const legacySetEntrySchema = setEntrySchema.omit({ blockId: true })

export type Exercise = z.infer<typeof exerciseSchema>
export type Block = z.infer<typeof blockSchema>
export type SetEntry = z.infer<typeof setEntrySchema>
export type LegacySetEntry = z.infer<typeof legacySetEntrySchema>

/**
 * Reads pre-block data as what it actually was: one closed block per exercise per
 * day. Used both by the database upgrade and by importing an older export, so
 * the rule that reinterprets someone's training history exists exactly once and
 * is tested on its own.
 */
export function blocksFromLegacySets(
  legacy: readonly LegacySetEntry[],
  createId: () => string,
): { blocks: Block[]; sets: SetEntry[] } {
  const byRun = new Map<string, LegacySetEntry[]>()

  for (const entry of legacy) {
    const key = `${entry.exerciseId}|${entry.date}`
    const run = byRun.get(key)

    if (run === undefined) byRun.set(key, [entry])
    else run.push(entry)
  }

  const blocks: Block[] = []
  const sets: SetEntry[] = []

  for (const run of byRun.values()) {
    const ordered = [...run].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
    const first = ordered[0]
    const last = ordered.at(-1)

    if (first === undefined || last === undefined) continue

    const block: Block = {
      id: createId(),
      exerciseId: first.exerciseId,
      date: first.date,
      startedAt: first.loggedAt,
      // Closed: these runs are finished history, not something to append to.
      closedAt: last.loggedAt,
    }

    blocks.push(block)
    for (const entry of ordered) sets.push({ ...entry, blockId: block.id })
  }

  return { blocks, sets }
}

/** What the user types when recording. Trimmed and bounded before it reaches the store. */
export const setDraftSchema = z.object({
  weightKg: z.number().min(0, 'Вага не може бути відʼємною'),
  reps: z.number().int('Повтори — ціле число').min(1, 'Має бути щонайменше 1 повтор'),
  note: z
    .string()
    .max(NOTE_MAX, `Примітка не довша за ${NOTE_MAX} символів`)
    .optional()
    .transform((value) => {
      const trimmed = value?.trim()
      return trimmed === undefined || trimmed === '' ? undefined : trimmed
    }),
})

export type SetDraft = z.infer<typeof setDraftSchema>

export const exerciseNameSchema = z
  .string()
  .trim()
  .min(1, 'Введіть назву вправи')
  .max(EXERCISE_NAME_MAX, `Назва не довша за ${EXERCISE_NAME_MAX} символів`)

/**
 * FR-009 — the key that makes two spellings the same exercise. Case, leading and
 * trailing space, and runs of internal whitespace all collapse.
 */
export function normalizeExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

/**
 * FR-015 — the local calendar day. Deliberately not `toISOString()`: that reports
 * UTC, so a set recorded at 23:58 would jump to tomorrow for anyone east of
 * Greenwich, and "today" is the user's day, not the machine's.
 */
export function todayKey(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${String(now.getFullYear())}-${month}-${day}`
}

/** FR-002 — substring match on the name, case- and whitespace-insensitive. */
export function searchExercises(exercises: readonly Exercise[], query: string): Exercise[] {
  const needle = normalizeExerciseName(query)

  if (needle === '') return [...exercises]

  return exercises.filter((exercise) => exercise.normalizedName.includes(needle))
}

export interface BlockWithSets {
  block: Block
  sets: SetEntry[]
}

/** FR-015 — open means "not finished by hand, and still the same day". */
export function isBlockOpen(block: Block, today: string): boolean {
  return block.closedAt === null && block.date === today
}

export function openBlock(
  blocks: readonly Block[],
  exerciseId: string,
  today: string,
): Block | undefined {
  return blocks.find((block) => block.exerciseId === exerciseId && isBlockOpen(block, today))
}

/**
 * FR-006 — sets keep the order they were recorded; identical sets stay separate
 * entries, because three sets of 60 × 10 is three sets, not one.
 */
export function setsInBlock(sets: readonly SetEntry[], blockId: string): SetEntry[] {
  return sets
    .filter((entry) => entry.blockId === blockId)
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
}

/** Every block of one exercise, most recent first. */
export function blocksForExercise(
  blocks: readonly Block[],
  sets: readonly SetEntry[],
  exerciseId: string,
): BlockWithSets[] {
  return blocks
    .filter((block) => block.exerciseId === exerciseId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((block) => ({ block, sets: setsInBlock(sets, block.id) }))
}

/** The run in progress, if there is one. */
export function currentBlock(
  blocks: readonly Block[],
  sets: readonly SetEntry[],
  exerciseId: string,
  today: string,
): BlockWithSets | undefined {
  const open = openBlock(blocks, exerciseId, today)

  return open === undefined ? undefined : { block: open, sets: setsInBlock(sets, open.id) }
}

/**
 * FR-003 — what "last time" means: the most recent block that is not the one in
 * progress. Coming back to a machine an hour later, that is this morning's run;
 * coming to it fresh, it is the last day you did it.
 */
export function previousBlock(
  blocks: readonly Block[],
  sets: readonly SetEntry[],
  exerciseId: string,
  today: string,
): BlockWithSets | undefined {
  const open = openBlock(blocks, exerciseId, today)

  return blocksForExercise(blocks, sets, exerciseId).find(
    // An emptied block is not history: deleting every set of a run leaves nothing
    // to build on, and an empty "last time" panel says less than none.
    (candidate) => candidate.block.id !== open?.id && candidate.sets.length > 0,
  )
}

/**
 * FR-020 — what the weight and reps fields start with: the last set of the block
 * in progress, or of the previous one when starting fresh. The note is not
 * carried across; it describes the set that happened, not the next one.
 */
export function prefillFrom(
  blocks: readonly Block[],
  sets: readonly SetEntry[],
  exerciseId: string,
  today: string,
): { weightKg: number; reps: number } | undefined {
  const source =
    currentBlock(blocks, sets, exerciseId, today) ?? previousBlock(blocks, sets, exerciseId, today)
  const latest = source?.sets.at(-1)

  return latest === undefined ? undefined : { weightKg: latest.weightKg, reps: latest.reps }
}
