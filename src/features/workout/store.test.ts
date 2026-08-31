import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { normalizeExerciseName, type Block, type Exercise, type SetEntry } from './model'
import { createIndexedDbStore, createMemoryStore, type WorkoutStore } from './store'

const testBlock: Block = {
  id: '99999999-9999-4999-8999-999999999991',
  exerciseId: '11111111-1111-4111-8111-111111111111',
  date: '2026-03-01',
  startedAt: '2026-03-01T10:00:00.000Z',
  closedAt: null,
}

const exercise: Exercise = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Жим ногами',
  normalizedName: normalizeExerciseName('Жим ногами'),
  createdAt: '2026-01-01T00:00:00.000Z',
}

function entry(overrides: Partial<SetEntry> = {}): SetEntry {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    exerciseId: exercise.id,
    blockId: '99999999-9999-4999-8999-999999999991',
    date: '2026-03-01',
    loggedAt: '2026-03-01T10:00:00.000Z',
    weightKg: 60,
    reps: 10,
    ...overrides,
  }
}

let dbName = ''

beforeEach(() => {
  dbName = `thor-test-${String(Math.random()).slice(2)}`
})

function idb(): WorkoutStore {
  return createIndexedDbStore(dbName)
}

describe('IndexedDB store (FR-010)', () => {
  it('starts empty and readable', async () => {
    const result = await idb().load()

    expect(result.status).toBe('ok')
    expect(result.data).toEqual({ exercises: [], blocks: [], sets: [] })
  })

  it('round-trips exercises and sets across separate connections', async () => {
    const writer = idb()
    await writer.addExercise(exercise)
    await writer.addSet(entry(), testBlock)

    // A second store instance stands in for reopening the app.
    const result = await idb().load()

    expect(result.status).toBe('ok')
    expect(result.data).toEqual({
      exercises: [exercise],
      blocks: [testBlock],
      sets: [entry()],
    })
  })

  it('closes a block, and the closure survives reopening (FR-024)', async () => {
    const store = idb()
    await store.addExercise(exercise)
    await store.addSet(entry(), testBlock)

    await store.closeBlock(testBlock.id, '2026-03-01T11:00:00.000Z')

    expect((await idb().load()).data.blocks[0]?.closedAt).toBe('2026-03-01T11:00:00.000Z')
  })

  it('ignores closing a block that does not exist', async () => {
    const store = idb()
    await store.load()

    await expect(
      store.closeBlock('99999999-9999-4999-8999-999999999999', '2026-03-01T11:00:00.000Z'),
    ).resolves.toBeUndefined()
  })

  it('deletes a set by id', async () => {
    const store = idb()
    await store.addExercise(exercise)
    await store.addSet(entry({ id: '33333333-3333-4333-8333-333333333333' }), testBlock)
    await store.deleteSet('33333333-3333-4333-8333-333333333333')

    expect((await store.load()).data.sets).toEqual([])
  })

  it('replaces everything on import (FR-018)', async () => {
    const store = idb()
    await store.addExercise(exercise)
    await store.addSet(entry(), testBlock)

    await store.replaceAll({ exercises: [], blocks: [], sets: [] })

    expect((await store.load()).data).toEqual({ exercises: [], blocks: [], sets: [] })
  })
})

describe('IndexedDB store, unreadable data (FR-012)', () => {
  /** Writes a row straight past the schema, the way a bug or a bad migration would. */
  async function writeCorruptSet(name: string): Promise<void> {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name)
      request.onsuccess = () => {
        resolve(request.result)
      }
      request.onerror = () => {
        reject(request.error ?? new Error('open failed'))
      }
    })

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sets', 'readwrite')
      tx.objectStore('sets').put({ id: 'garbage', reps: 'many' })
      tx.oncomplete = () => {
        resolve()
      }
      tx.onerror = () => {
        reject(tx.error ?? new Error('write failed'))
      }
    })

    db.close()
  }

  it('reports unreadable rather than reporting an empty log', async () => {
    const store = idb()
    await store.addExercise(exercise)
    await store.addSet(entry(), testBlock)
    await writeCorruptSet(dbName)

    const result = await idb().load()

    expect(result.status).toBe('unreadable')
    // Not an `if`: a wrong status must fail here, not silently skip the assertion.
    expect(result.status === 'unreadable' && result.reason).toMatch(/1/)
  })

  it('still hands back the rows it could read, so they can be exported', async () => {
    const store = idb()
    await store.addExercise(exercise)
    await store.addSet(entry(), testBlock)
    await writeCorruptSet(dbName)

    const result = await idb().load()

    expect(result.data.exercises).toEqual([exercise])
    expect(result.data.sets).toEqual([entry()])
  })

  it('does not delete or rewrite the unreadable row', async () => {
    const store = idb()
    await store.load() // creates the schema, so the corrupt row has somewhere to land
    await writeCorruptSet(dbName)

    await idb().load()

    // Reading twice must not have healed anything: the bad row is still there.
    expect((await idb().load()).status).toBe('unreadable')
  })
})

describe('upgrading a version 1 database', () => {
  /** Writes a database exactly as version 1 left it: sets, and no blocks. */
  async function seedVersion1(name: string): Promise<void> {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 1)
      request.onupgradeneeded = () => {
        const database = request.result
        database.createObjectStore('exercises', { keyPath: 'id' })
        database.createObjectStore('sets', { keyPath: 'id' })
      }
      request.onsuccess = () => {
        resolve(request.result)
      }
      request.onerror = () => {
        reject(request.error ?? new Error('open failed'))
      }
    })

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['exercises', 'sets'], 'readwrite')
      tx.objectStore('exercises').put(exercise)
      tx.objectStore('sets').put({
        id: '11111111-1111-4111-8111-111111111101',
        exerciseId: exercise.id,
        date: '2026-02-20',
        loggedAt: '2026-02-20T10:00:00.000Z',
        weightKg: 60,
        reps: 10,
      })
      tx.oncomplete = () => {
        resolve()
      }
      tx.onerror = () => {
        reject(tx.error ?? new Error('write failed'))
      }
    })

    db.close()
  }

  it('reads cleanly rather than declaring the log unreadable', async () => {
    // Version 1 sets carry no blockId, so left in place every one of them would
    // fail the schema and trigger the FR-012 screen on a working app.
    await seedVersion1(dbName)

    expect((await idb().load()).status).toBe('ok')
  })

  it('discards sets it can no longer read, and keeps the exercises', async () => {
    // Deliberately destructive, and therefore tested: the app has one user, who
    // chose losing test data over carrying a migration nobody needs.
    await seedVersion1(dbName)

    const { data } = await idb().load()

    expect(data.sets).toEqual([])
    expect(data.exercises).toEqual([exercise])
  })
})

describe('memory store', () => {
  it('round-trips and hands back copies', async () => {
    const store = createMemoryStore({ exercises: [exercise], blocks: [], sets: [] })
    const first = (await store.load()).data

    first.exercises.pop()

    expect((await store.load()).data.exercises).toHaveLength(1)
  })

  it('can be seeded as unreadable, to exercise the failure path', async () => {
    const store = createMemoryStore(
      { exercises: [], blocks: [], sets: [] },
      { unreadable: 'corrupt fixture' },
    )

    expect((await store.load()).status).toBe('unreadable')
  })
})
