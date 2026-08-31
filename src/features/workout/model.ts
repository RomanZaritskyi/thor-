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

export type Exercise = z.infer<typeof exerciseSchema>
export type Block = z.infer<typeof blockSchema>
export type SetEntry = z.infer<typeof setEntrySchema>

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

/**
 * FR-027 — the arithmetic behind the −/+ controls, kept out of the component so
 * the awkward parts are testable: an empty field, a value that is not a number,
 * and floating-point dust from fractional steps.
 *
 * An empty field starts at its minimum, so the first press always produces a
 * valid value rather than jumping a step past it.
 */
export function stepValue(current: string, step: number, min: number): string {
  const parsed = Number(current)
  const next =
    current.trim() === '' || !Number.isFinite(parsed) ? min : Math.max(min, parsed + step)

  return String(Math.round(next * 10) / 10)
}

/** Calendar days between two `YYYY-MM-DD` keys. */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000,
  )
}

/** The most recent set of one exercise. Serves both FR-028's order and FR-029's label. */
export function lastRecordedSet(
  sets: readonly SetEntry[],
  exerciseId: string,
): SetEntry | undefined {
  return sets
    .filter((entry) => entry.exerciseId === exerciseId)
    .reduce<SetEntry | undefined>(
      (latest, entry) =>
        latest === undefined || entry.loggedAt > latest.loggedAt ? entry : latest,
      undefined,
    )
}

/**
 * FR-028 — what you used recently is what you are most likely to use now. Applied
 * after `searchExercises`, so filtering and ordering stay separable.
 */
export function sortExercisesByRecency(
  exercises: readonly Exercise[],
  sets: readonly SetEntry[],
): Exercise[] {
  const lastAt = new Map(
    exercises.map((exercise) => [exercise.id, lastRecordedSet(sets, exercise.id)?.loggedAt]),
  )

  return [...exercises].sort((a, b) => {
    const left = lastAt.get(a.id)
    const right = lastAt.get(b.id)

    if (left !== undefined && right !== undefined) return right.localeCompare(left)
    // Recorded exercises lead; among the rest the newest addition does, because
    // an exercise just added is about to be used.
    if (left !== undefined) return -1
    if (right !== undefined) return 1

    return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
  })
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
 * FR-032 — every session of one exercise, newest first. An emptied block is not a
 * session: deleting every set of a run leaves nothing to read, and an empty entry
 * in a history says less than no entry.
 */
export function historyFor(
  blocks: readonly Block[],
  sets: readonly SetEntry[],
  exerciseId: string,
): BlockWithSets[] {
  return blocksForExercise(blocks, sets, exerciseId).filter((run) => run.sets.length > 0)
}

/**
 * FR-003 — what "last time" means: the most recent session that is not the one in
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

  return historyFor(blocks, sets, exerciseId).find((run) => run.block.id !== open?.id)
}

/**
 * FR-030 — one row per set position, today's set beside the one done at the same
 * position last time. Rows run to whichever block is longer: a position last time
 * reached and today has not still shows what was done there, because how much is
 * left to match is part of the decision.
 */
export interface SetRow {
  /** 1-based, as it reads on screen. */
  position: number
  today: SetEntry | undefined
  previous: SetEntry | undefined
}

export function setRows(
  current: BlockWithSets | undefined,
  previous: BlockWithSets | undefined,
): SetRow[] {
  const today = current?.sets ?? []
  const before = previous?.sets ?? []

  return Array.from({ length: Math.max(today.length, before.length) }, (_unused, index) => ({
    position: index + 1,
    today: today[index],
    previous: before[index],
  }))
}

export interface NextSet {
  position: number
  /** What was done at this position last time, for the caption above the fields. */
  previous: SetEntry | undefined
  prefill: { weightKg: number; reps: number } | undefined
}

/**
 * FR-020 — the set about to be recorded. The fields start from the set at the
 * same position last time, so repeating a ramp needs no typing; past the end of
 * that block there is no counterpart, and the set just recorded is the only thing
 * left that is about today.
 *
 * The note is not carried across: it describes the set that happened, not the
 * next one.
 */
export function nextSet(
  current: BlockWithSets | undefined,
  previous: BlockWithSets | undefined,
): NextSet {
  const position = (current?.sets.length ?? 0) + 1
  const counterpart = previous?.sets[position - 1]
  const source = counterpart ?? current?.sets.at(-1)

  return {
    position,
    previous: counterpart,
    prefill: source === undefined ? undefined : { weightKg: source.weightKg, reps: source.reps },
  }
}
