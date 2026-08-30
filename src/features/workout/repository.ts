import {
  exerciseNameSchema,
  normalizeExerciseName,
  setDraftSchema,
  todayKey,
  type Exercise,
  type SetEntry,
} from './model'
import type { LoadResult, WorkoutStore } from './store'
import type { WorkoutData } from './transfer'

export class UnreadableStoreError extends Error {
  readonly reason: string

  constructor(reason: string) {
    super(`Сховище не читається: ${reason}`)
    this.name = 'UnreadableStoreError'
    this.reason = reason
  }
}

export class DuplicateExerciseError extends Error {
  readonly name_: string

  constructor(name: string) {
    super(`Вправа «${name}» вже існує`)
    this.name = 'DuplicateExerciseError'
    this.name_ = name
  }
}

export class UnknownExerciseError extends Error {
  constructor(id: string) {
    super(`Вправу ${id} не знайдено`)
    this.name = 'UnknownExerciseError'
  }
}

export class ImmutablePastError extends Error {
  constructor(date: string) {
    super(`Підхід за ${date} не можна змінити — редагується лише сьогоднішній день`)
    this.name = 'ImmutablePastError'
  }
}

export interface WorkoutRepository {
  /**
   * The current local day, from the same clock every write uses. Screens must ask
   * for it rather than calling `new Date()` themselves: two clocks disagree at
   * midnight, and the disagreement would put a set on a day the screen is not
   * showing.
   */
  today(): string
  load(): Promise<LoadResult>
  addExercise(name: string): Promise<Exercise>
  recordSet(exerciseId: string, draft: unknown): Promise<SetEntry>
  deleteSet(id: string): Promise<void>
  replaceAll(data: WorkoutData): Promise<void>
}

export interface WorkoutRepositoryDeps {
  store: WorkoutStore
  /** Injected so tests can pin "today" instead of racing the wall clock. */
  now?: () => Date
  /** Injected so tests can produce stable ids. */
  createId?: () => string
}

export function createWorkoutRepository({
  store,
  now = () => new Date(),
  createId = () => crypto.randomUUID(),
}: WorkoutRepositoryDeps): WorkoutRepository {
  /**
   * FR-012 — the single gate every write passes through. If the log could not be
   * read, we do not know what is in it, and writing on top of an unknown is how
   * training history gets quietly destroyed. `replaceAll` is the one deliberate
   * exception: it is the user choosing, with confirmation, to start over.
   */
  async function readable(): Promise<WorkoutData> {
    const result = await store.load()

    if (result.status === 'unreadable') throw new UnreadableStoreError(result.reason)

    return result.data
  }

  return {
    today: () => todayKey(now()),

    load: () => store.load(),

    addExercise: async (rawName) => {
      const data = await readable()
      const name = exerciseNameSchema.parse(rawName)
      const normalizedName = normalizeExerciseName(name)

      if (data.exercises.some((exercise) => exercise.normalizedName === normalizedName)) {
        throw new DuplicateExerciseError(name)
      }

      const exercise: Exercise = {
        id: createId(),
        name,
        normalizedName,
        createdAt: now().toISOString(),
      }

      await store.addExercise(exercise)

      return exercise
    },

    recordSet: async (exerciseId, rawDraft) => {
      const data = await readable()

      if (!data.exercises.some((exercise) => exercise.id === exerciseId)) {
        throw new UnknownExerciseError(exerciseId)
      }

      const draft = setDraftSchema.parse(rawDraft)
      const at = now()
      const entry: SetEntry = {
        id: createId(),
        exerciseId,
        date: todayKey(at),
        loggedAt: at.toISOString(),
        weightKg: draft.weightKg,
        reps: draft.reps,
        ...(draft.note === undefined ? {} : { note: draft.note }),
      }

      await store.addSet(entry)

      return entry
    },

    deleteSet: async (id) => {
      const data = await readable()
      const entry = data.sets.find((candidate) => candidate.id === id)

      if (entry === undefined) return

      if (entry.date !== todayKey(now())) throw new ImmutablePastError(entry.date)

      await store.deleteSet(id)
    },

    replaceAll: (data) => store.replaceAll(data),
  }
}
