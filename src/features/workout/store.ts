import { openDB, type IDBPDatabase } from 'idb'

import { exerciseSchema, setEntrySchema } from './model'
import type { WorkoutData } from './transfer'

export const DB_NAME = 'thor-workout'
const DB_VERSION = 1
const EXERCISES = 'exercises'
const SETS = 'sets'

/**
 * FR-012 — a read either succeeds or says so. There is deliberately no third
 * shape that quietly means "empty": an empty log and an unreadable log look
 * identical on screen and could not be more different in consequence.
 */
export type LoadResult =
  { status: 'ok'; data: WorkoutData } | { status: 'unreadable'; reason: string; data: WorkoutData }

/** Persistence port. Swap the adapter, leave every rule above it untouched. */
export interface WorkoutStore {
  load(): Promise<LoadResult>
  addExercise(exercise: WorkoutData['exercises'][number]): Promise<void>
  addSet(entry: WorkoutData['sets'][number]): Promise<void>
  deleteSet(id: string): Promise<void>
  replaceAll(data: WorkoutData): Promise<void>
}

export function createMemoryStore(
  seed: WorkoutData = { exercises: [], sets: [] },
  options: { unreadable?: string } = {},
): WorkoutStore {
  let data: WorkoutData = { exercises: [...seed.exercises], sets: [...seed.sets] }
  const copy = (): WorkoutData => ({ exercises: [...data.exercises], sets: [...data.sets] })

  return {
    load: async () =>
      options.unreadable === undefined
        ? { status: 'ok', data: copy() }
        : { status: 'unreadable', reason: options.unreadable, data: copy() },
    addExercise: async (exercise) => {
      data.exercises.push(exercise)
    },
    addSet: async (entry) => {
      data.sets.push(entry)
    },
    deleteSet: async (id) => {
      data.sets = data.sets.filter((entry) => entry.id !== id)
    },
    replaceAll: async (next) => {
      data = { exercises: [...next.exercises], sets: [...next.sets] }
    },
  }
}

export function createIndexedDbStore(name: string = DB_NAME): WorkoutStore {
  async function db(): Promise<IDBPDatabase> {
    return openDB(name, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(EXERCISES)) {
          const store = database.createObjectStore(EXERCISES, { keyPath: 'id' })
          // FR-009 is enforced in the repository, but the index makes a duplicate
          // impossible to write even by a future code path that forgets.
          store.createIndex('normalizedName', 'normalizedName', { unique: true })
        }

        if (!database.objectStoreNames.contains(SETS)) {
          const store = database.createObjectStore(SETS, { keyPath: 'id' })
          store.createIndex('exerciseId', 'exerciseId')
        }
      },
    })
  }

  return {
    load: async () => {
      let rows: { exercises: unknown[]; sets: unknown[] }

      try {
        const database = await db()
        rows = {
          exercises: await database.getAll(EXERCISES),
          sets: await database.getAll(SETS),
        }
        database.close()
      } catch (error) {
        // The database itself would not open. Report it; never start empty.
        return {
          status: 'unreadable',
          reason: `Сховище не відкривається: ${error instanceof Error ? error.message : 'невідома помилка'}`,
          data: { exercises: [], sets: [] },
        }
      }

      const exercises = rows.exercises.map((row) => exerciseSchema.safeParse(row))
      const sets = rows.sets.map((row) => setEntrySchema.safeParse(row))
      const badExercises = exercises.filter((result) => !result.success).length
      const badSets = sets.filter((result) => !result.success).length

      const data: WorkoutData = {
        exercises: exercises.flatMap((result) => (result.success ? [result.data] : [])),
        sets: sets.flatMap((result) => (result.success ? [result.data] : [])),
      }

      if (badExercises + badSets === 0) return { status: 'ok', data }

      // The bad rows are left exactly where they are: reading must never repair,
      // because "repair" here means deleting training history to look tidy.
      return {
        status: 'unreadable',
        reason:
          `Не вдалося прочитати ${String(badExercises)} вправ(и) та ${String(badSets)} підход(ів). ` +
          'Дані не змінено.',
        data,
      }
    },

    addExercise: async (exercise) => {
      const database = await db()
      await database.add(EXERCISES, exercise)
      database.close()
    },

    addSet: async (entry) => {
      const database = await db()
      await database.add(SETS, entry)
      database.close()
    },

    deleteSet: async (id) => {
      const database = await db()
      await database.delete(SETS, id)
      database.close()
    },

    replaceAll: async (data) => {
      const database = await db()
      const tx = database.transaction([EXERCISES, SETS], 'readwrite')

      await tx.objectStore(EXERCISES).clear()
      await tx.objectStore(SETS).clear()
      for (const exercise of data.exercises) await tx.objectStore(EXERCISES).add(exercise)
      for (const entry of data.sets) await tx.objectStore(SETS).add(entry)
      await tx.done

      database.close()
    },
  }
}
