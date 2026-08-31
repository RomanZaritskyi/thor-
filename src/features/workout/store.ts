import { openDB, type IDBPDatabase } from 'idb'

import {
  blocksFromLegacySets,
  blockSchema,
  exerciseSchema,
  legacySetEntrySchema,
  setEntrySchema,
} from './model'
import type { WorkoutData } from './transfer'

export const DB_NAME = 'thor-workout'
const DB_VERSION = 2
const EXERCISES = 'exercises'
const SETS = 'sets'
const BLOCKS = 'blocks'

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
  /** A set and the block it opens arrive together, or neither does. */
  addSet(
    entry: WorkoutData['sets'][number],
    openedBlock?: WorkoutData['blocks'][number],
  ): Promise<void>
  closeBlock(id: string, closedAt: string): Promise<void>
  deleteSet(id: string): Promise<void>
  replaceAll(data: WorkoutData): Promise<void>
}

export function createMemoryStore(
  seed: WorkoutData = { exercises: [], blocks: [], sets: [] },
  options: { unreadable?: string } = {},
): WorkoutStore {
  let data: WorkoutData = {
    exercises: [...seed.exercises],
    blocks: [...seed.blocks],
    sets: [...seed.sets],
  }
  const copy = (): WorkoutData => ({
    exercises: [...data.exercises],
    blocks: [...data.blocks],
    sets: [...data.sets],
  })

  return {
    load: async () =>
      options.unreadable === undefined
        ? { status: 'ok', data: copy() }
        : { status: 'unreadable', reason: options.unreadable, data: copy() },
    addExercise: async (exercise) => {
      data.exercises.push(exercise)
    },
    addSet: async (entry, openedBlock) => {
      if (openedBlock !== undefined) data.blocks.push(openedBlock)
      data.sets.push(entry)
    },
    closeBlock: async (id, closedAt) => {
      data.blocks = data.blocks.map((block) => (block.id === id ? { ...block, closedAt } : block))
    },
    deleteSet: async (id) => {
      data.sets = data.sets.filter((entry) => entry.id !== id)
    },
    replaceAll: async (next) => {
      data = { exercises: [...next.exercises], blocks: [...next.blocks], sets: [...next.sets] }
    },
  }
}

export function createIndexedDbStore(name: string = DB_NAME): WorkoutStore {
  async function db(): Promise<IDBPDatabase> {
    return openDB(name, DB_VERSION, {
      upgrade(database, oldVersion, _newVersion, tx) {
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

        if (!database.objectStoreNames.contains(BLOCKS)) {
          const store = database.createObjectStore(BLOCKS, { keyPath: 'id' })
          store.createIndex('exerciseId', 'exerciseId')
        }

        // Version 1 had no blocks. Its sets were one run per exercise per day, so
        // that is what they become — closed, because they are finished history.
        // Reinterpreting somebody's training log is not something to improvise,
        // which is why the rule lives in one tested function.
        if (oldVersion === 1) {
          void (async () => {
            const rows = await tx.objectStore(SETS).getAll()
            const legacy = rows.flatMap((row) => {
              const parsed = legacySetEntrySchema.safeParse(row)
              return parsed.success ? [parsed.data] : []
            })
            const { blocks, sets } = blocksFromLegacySets(legacy, () => crypto.randomUUID())

            for (const block of blocks) await tx.objectStore(BLOCKS).put(block)
            for (const entry of sets) await tx.objectStore(SETS).put(entry)
          })()
        }
      },
    })
  }

  return {
    load: async () => {
      let rows: { exercises: unknown[]; blocks: unknown[]; sets: unknown[] }

      try {
        const database = await db()
        rows = {
          exercises: await database.getAll(EXERCISES),
          blocks: await database.getAll(BLOCKS),
          sets: await database.getAll(SETS),
        }
        database.close()
      } catch (error) {
        // The database itself would not open. Report it; never start empty.
        return {
          status: 'unreadable',
          reason: `Сховище не відкривається: ${error instanceof Error ? error.message : 'невідома помилка'}`,
          data: { exercises: [], blocks: [], sets: [] },
        }
      }

      const exercises = rows.exercises.map((row) => exerciseSchema.safeParse(row))
      const blocks = rows.blocks.map((row) => blockSchema.safeParse(row))
      const sets = rows.sets.map((row) => setEntrySchema.safeParse(row))
      const badExercises = exercises.filter((result) => !result.success).length
      const badBlocks = blocks.filter((result) => !result.success).length
      const badSets = sets.filter((result) => !result.success).length

      const data: WorkoutData = {
        exercises: exercises.flatMap((result) => (result.success ? [result.data] : [])),
        blocks: blocks.flatMap((result) => (result.success ? [result.data] : [])),
        sets: sets.flatMap((result) => (result.success ? [result.data] : [])),
      }

      if (badExercises + badBlocks + badSets === 0) return { status: 'ok', data }

      // The bad rows are left exactly where they are: reading must never repair,
      // because "repair" here means deleting training history to look tidy.
      return {
        status: 'unreadable',
        reason:
          `Не вдалося прочитати ${String(badExercises)} вправ(и), ${String(badBlocks)} блок(ів) та ${String(badSets)} підход(ів). ` +
          'Дані не змінено.',
        data,
      }
    },

    addExercise: async (exercise) => {
      const database = await db()
      await database.add(EXERCISES, exercise)
      database.close()
    },

    addSet: async (entry, openedBlock) => {
      const database = await db()
      const tx = database.transaction([BLOCKS, SETS], 'readwrite')

      // One transaction: a set must never exist without the block it belongs to.
      if (openedBlock !== undefined) await tx.objectStore(BLOCKS).add(openedBlock)
      await tx.objectStore(SETS).add(entry)
      await tx.done

      database.close()
    },

    closeBlock: async (id, closedAt) => {
      const database = await db()
      const existing: unknown = await database.get(BLOCKS, id)
      const parsed = blockSchema.safeParse(existing)

      if (parsed.success) await database.put(BLOCKS, { ...parsed.data, closedAt })

      database.close()
    },

    deleteSet: async (id) => {
      const database = await db()
      await database.delete(SETS, id)
      database.close()
    },

    replaceAll: async (data) => {
      const database = await db()
      const tx = database.transaction([EXERCISES, BLOCKS, SETS], 'readwrite')

      await tx.objectStore(EXERCISES).clear()
      await tx.objectStore(BLOCKS).clear()
      await tx.objectStore(SETS).clear()
      for (const exercise of data.exercises) await tx.objectStore(EXERCISES).add(exercise)
      for (const block of data.blocks) await tx.objectStore(BLOCKS).add(block)
      for (const entry of data.sets) await tx.objectStore(SETS).add(entry)
      await tx.done

      database.close()
    },
  }
}
