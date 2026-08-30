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

export const setEntrySchema = z.object({
  id: z.uuid(),
  exerciseId: z.uuid(),
  /** Local calendar day, `YYYY-MM-DD` — see `todayKey`. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  loggedAt: z.iso.datetime(),
  weightKg: z.number().min(0),
  reps: z.number().int().min(1),
  note: z.string().max(NOTE_MAX).optional(),
})

export type Exercise = z.infer<typeof exerciseSchema>
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

/** FR-002 — substring match on the name, case- and whitespace-insensitive. */
export function searchExercises(exercises: readonly Exercise[], query: string): Exercise[] {
  const needle = normalizeExerciseName(query)

  if (needle === '') return [...exercises]

  return exercises.filter((exercise) => exercise.normalizedName.includes(needle))
}

export interface DaySets {
  date: string
  sets: SetEntry[]
}

/**
 * FR-006 — days most recent first; within a day, the order they were recorded.
 * Identical sets stay separate entries, because three sets of 60 × 10 is three
 * sets, not one.
 */
export function groupSetsByDate(sets: readonly SetEntry[]): DaySets[] {
  const byDate = new Map<string, SetEntry[]>()

  for (const entry of sets) {
    const day = byDate.get(entry.date)

    if (day === undefined) {
      byDate.set(entry.date, [entry])
    } else {
      day.push(entry)
    }
  }

  return [...byDate.entries()]
    .map(([date, daySets]) => ({
      date,
      sets: [...daySets].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)),
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * FR-003 — the most recent day *before* today. Today is excluded on purpose:
 * "what did I lift last time" is a question about a previous session, and the
 * sets being added right now are already on screen.
 */
export function lastSession(sets: readonly SetEntry[], today: string): DaySets | undefined {
  return groupSetsByDate(sets).find((day) => day.date < today)
}

/**
 * FR-020 — what the weight and reps fields start with: the most recent set of
 * this exercise, today's if there is one. The note is not carried across; it
 * describes the set that happened, not the next one.
 */
export function prefillFrom(
  sets: readonly SetEntry[],
  today: string,
): { weightKg: number; reps: number } | undefined {
  const days = groupSetsByDate(sets)
  const day = days.find((candidate) => candidate.date === today) ?? days[0]
  const latest = day?.sets.at(-1)

  return latest === undefined ? undefined : { weightKg: latest.weightKg, reps: latest.reps }
}
