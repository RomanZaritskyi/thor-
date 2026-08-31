import {
  exerciseNameSchema,
  normalizeExerciseName,
  openBlock,
  setDraftSchema,
  todayKey,
  type Block,
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

export class ExerciseHasHistoryError extends Error {
  constructor(id: string) {
    super(`Вправа ${id} має записані підходи — її можна перейменувати, але не видалити`)
    this.name = 'ExerciseHasHistoryError'
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
  /**
   * FR-025 — the history follows, because sets and blocks key on the exercise's
   * identity rather than on what it is called.
   */
  renameExercise(id: string, name: string): Promise<Exercise>
  /** FR-026 — only while nothing is recorded against it. */
  removeExercise(id: string): Promise<void>
  recordSet(exerciseId: string, draft: unknown): Promise<SetEntry>
  /**
   * FR-024 — closes the exercise's open block, so the next set starts a fresh
   * one and this run becomes what "last time" shows. A no-op when nothing is
   * open: pressing twice must not be an error.
   */
  finishExercise(exerciseId: string): Promise<void>
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

    renameExercise: async (id, rawName) => {
      const data = await readable()
      const exercise = data.exercises.find((candidate) => candidate.id === id)

      if (exercise === undefined) throw new UnknownExerciseError(id)

      const name = exerciseNameSchema.parse(rawName)
      const normalizedName = normalizeExerciseName(name)

      // Checked here rather than left to the unique index, which would surface a
      // collision as an opaque constraint error instead of a message that says
      // which name is taken. Colliding with itself is just a re-casing.
      const taken = data.exercises.some(
        (candidate) => candidate.id !== id && candidate.normalizedName === normalizedName,
      )

      if (taken) throw new DuplicateExerciseError(name)

      const renamed: Exercise = { ...exercise, name, normalizedName }

      await store.updateExercise(renamed)

      return renamed
    },

    removeExercise: async (id) => {
      const data = await readable()

      if (!data.exercises.some((exercise) => exercise.id === id)) {
        throw new UnknownExerciseError(id)
      }

      // The guard lives here, not in the component, so no future caller can go
      // round it and delete a training record.
      if (data.sets.some((entry) => entry.exerciseId === id)) {
        throw new ExerciseHasHistoryError(id)
      }

      await store.deleteExercise(id)
    },

    recordSet: async (exerciseId, rawDraft) => {
      const data = await readable()

      if (!data.exercises.some((exercise) => exercise.id === exerciseId)) {
        throw new UnknownExerciseError(exerciseId)
      }

      const draft = setDraftSchema.parse(rawDraft)
      const at = now()
      const today = todayKey(at)
      const existing = openBlock(data.blocks, exerciseId, today)

      // FR-015: the first set after the last block closed opens the next one.
      const opened: Block | undefined =
        existing === undefined
          ? {
              id: createId(),
              exerciseId,
              date: today,
              startedAt: at.toISOString(),
              closedAt: null,
            }
          : undefined
      const block = existing ?? opened

      if (block === undefined) throw new Error('unreachable: no block to record against')

      const entry: SetEntry = {
        id: createId(),
        exerciseId,
        blockId: block.id,
        date: today,
        loggedAt: at.toISOString(),
        weightKg: draft.weightKg,
        reps: draft.reps,
        ...(draft.note === undefined ? {} : { note: draft.note }),
      }

      await store.addSet(entry, opened)

      return entry
    },

    finishExercise: async (exerciseId) => {
      const data = await readable()
      const at = now()
      const open = openBlock(data.blocks, exerciseId, todayKey(at))

      if (open === undefined) return

      await store.closeBlock(open.id, at.toISOString())
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
