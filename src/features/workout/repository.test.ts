import { describe, expect, it, vi } from 'vitest'

import { normalizeExerciseName, type Exercise } from './model'
import {
  createWorkoutRepository,
  DuplicateExerciseError,
  ExerciseHasHistoryError,
  ImmutablePastError,
  UnknownExerciseError,
  UnreadableStoreError,
  type WorkoutRepository,
} from './repository'
import { createMemoryStore, type WorkoutStore } from './store'
import type { WorkoutData } from './transfer'

/** Deterministic ids and a clock that ticks a second per read. */
function build(
  seed: WorkoutData = { exercises: [], blocks: [], sets: [] },
  store: WorkoutStore = createMemoryStore(seed),
): WorkoutRepository {
  let ids = 0
  let tick = 0

  return createWorkoutRepository({
    store,
    createId: () => `00000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`,
    now: () => new Date(2026, 2, 1, 10, 0, ++tick),
  })
}

const legPress: Exercise = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Жим ногами',
  normalizedName: normalizeExerciseName('Жим ногами'),
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('adding exercises (FR-008, FR-009)', () => {
  it('adds an exercise and makes it immediately available', async () => {
    const repository = build()

    const added = await repository.addExercise('Тяга верхнього блоку')

    expect(added.name).toBe('Тяга верхнього блоку')
    expect((await repository.load()).data.exercises).toEqual([added])
  })

  it('trims the name but keeps the capitalisation the user chose', async () => {
    const repository = build()

    expect((await repository.addExercise('  Жим Лежачи  ')).name).toBe('Жим Лежачи')
  })

  it('refuses a name differing only by case or spacing (FR-009)', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })

    await expect(repository.addExercise('жим  ногами')).rejects.toThrow(DuplicateExerciseError)
    await expect(repository.addExercise('  ЖИМ НОГАМИ ')).rejects.toThrow(DuplicateExerciseError)
  })

  it('rejects a blank name (FR-022)', async () => {
    await expect(build().addExercise('   ')).rejects.toThrow()
  })
})

describe('today (FR-015)', () => {
  it('reports the local day of the same clock that dates a set', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })

    const day = repository.today()
    const entry = await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })

    expect(day).toBe('2026-03-01')
    expect(entry.date).toBe(day)
  })
})

describe('renaming an exercise (FR-025)', () => {
  it('changes the name and the key two spellings collide on', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })

    const renamed = await repository.renameExercise(legPress.id, '  Жим Ногами Сидячи  ')

    expect(renamed.name).toBe('Жим Ногами Сидячи')
    expect(renamed.normalizedName).toBe('жим ногами сидячи')
    expect((await repository.load()).data.exercises).toEqual([renamed])
  })

  it('keeps the history, because sets belong to the exercise and not its spelling', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })
    const entry = await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })

    await repository.renameExercise(legPress.id, 'Жим ногами вузько')

    const { data } = await repository.load()
    expect(data.sets.map((set) => set.id)).toEqual([entry.id])
    expect(data.sets[0]?.exerciseId).toBe(legPress.id)
  })

  it('refuses a name another exercise already holds (FR-009)', async () => {
    const squat = {
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Присід',
      normalizedName: normalizeExerciseName('Присід'),
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    const repository = build({ exercises: [legPress, squat], blocks: [], sets: [] })

    await expect(repository.renameExercise(legPress.id, ' присід ')).rejects.toThrow(
      DuplicateExerciseError,
    )
    expect((await repository.load()).data.exercises[0]?.name).toBe('Жим ногами')
  })

  it('allows re-casing its own name, which collides only with itself', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })

    expect((await repository.renameExercise(legPress.id, 'ЖИМ НОГАМИ')).name).toBe('ЖИМ НОГАМИ')
  })

  it('refuses a blank name (FR-022)', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })

    await expect(repository.renameExercise(legPress.id, '   ')).rejects.toThrow()
  })

  it('refuses an exercise that does not exist', async () => {
    const repository = build({ exercises: [], blocks: [], sets: [] })

    await expect(repository.renameExercise(legPress.id, 'Будь-що')).rejects.toThrow(
      UnknownExerciseError,
    )
  })
})

describe('removing an exercise (FR-026)', () => {
  it('removes one that has nothing recorded against it', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })

    await repository.removeExercise(legPress.id)

    expect((await repository.load()).data.exercises).toEqual([])
  })

  it('refuses to remove one with history, and touches nothing', async () => {
    // Nothing in this app deletes a training record; renaming is the way out.
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })
    await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })

    await expect(repository.removeExercise(legPress.id)).rejects.toThrow(ExerciseHasHistoryError)

    const { data } = await repository.load()
    expect(data.exercises).toEqual([legPress])
    expect(data.sets).toHaveLength(1)
  })

  it('removes the empty block left by a set that was deleted again', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })
    const entry = await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })
    await repository.deleteSet(entry.id)

    await repository.removeExercise(legPress.id)

    const { data } = await repository.load()
    expect(data.exercises).toEqual([])
    expect(data.blocks).toEqual([])
  })
})

describe('renaming and removing refuse an unreadable store (FR-012)', () => {
  function unreadableStore() {
    const store = createMemoryStore(
      { exercises: [legPress], blocks: [], sets: [] },
      { unreadable: 'зіпсовано' },
    )

    return {
      store,
      repository: build({ exercises: [], blocks: [], sets: [] }, store),
      updateExercise: vi.spyOn(store, 'updateExercise'),
      deleteExercise: vi.spyOn(store, 'deleteExercise'),
    }
  }

  it('does not rename, and does not touch the store', async () => {
    const { repository, updateExercise } = unreadableStore()

    await expect(repository.renameExercise(legPress.id, 'Інша')).rejects.toThrow(
      UnreadableStoreError,
    )
    expect(updateExercise).not.toHaveBeenCalled()
  })

  it('does not remove, and does not touch the store', async () => {
    const { repository, deleteExercise } = unreadableStore()

    await expect(repository.removeExercise(legPress.id)).rejects.toThrow(UnreadableStoreError)
    expect(deleteExercise).not.toHaveBeenCalled()
  })
})

describe('recording sets (FR-005, FR-013, FR-015)', () => {
  it('records a set against an exercise, dated today', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })

    const entry = await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })

    expect(entry).toMatchObject({ exerciseId: legPress.id, weightKg: 60, reps: 10 })
    expect(entry.date).toBe('2026-03-01')
  })

  it('keeps an optional note (FR-014)', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })

    expect(
      (await repository.recordSet(legPress.id, { weightKg: 60, reps: 10, note: ' Hammer ' })).note,
    ).toBe('Hammer')
  })

  it('refuses a set against an exercise that is not in the list (FR-013)', async () => {
    const repository = build()

    await expect(
      repository.recordSet('99999999-9999-4999-8999-999999999999', { weightKg: 60, reps: 10 }),
    ).rejects.toThrow(UnknownExerciseError)
  })

  it('refuses an invalid set (FR-007)', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })

    await expect(repository.recordSet(legPress.id, { weightKg: 60, reps: 0 })).rejects.toThrow()
    await expect(repository.recordSet(legPress.id, { weightKg: -1, reps: 5 })).rejects.toThrow()
  })

  it('appends several sets in the order recorded (FR-006)', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })

    await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })
    await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })

    const { sets } = (await repository.load()).data

    expect(sets).toHaveLength(2)

    const timestamps = sets.map((entry) => entry.loggedAt)
    expect(timestamps).toEqual([...timestamps].sort())
  })
})

describe('finishing an exercise (FR-024)', () => {
  it('opens one block for consecutive sets, and a new one after finishing', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })

    await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })
    await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })

    const before = (await repository.load()).data
    expect(before.blocks).toHaveLength(1)
    expect(new Set(before.sets.map((entry) => entry.blockId)).size).toBe(1)

    await repository.finishExercise(legPress.id)
    await repository.recordSet(legPress.id, { weightKg: 65, reps: 8 })

    const after = (await repository.load()).data
    expect(after.blocks).toHaveLength(2)
    expect(new Set(after.sets.map((entry) => entry.blockId)).size).toBe(2)
  })

  it('closes the block it finishes, and leaves the new one open', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })

    await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })
    await repository.finishExercise(legPress.id)

    const closed = (await repository.load()).data.blocks
    expect(closed[0]?.closedAt).not.toBeNull()

    await repository.recordSet(legPress.id, { weightKg: 65, reps: 8 })
    const open = (await repository.load()).data.blocks.filter((block) => block.closedAt === null)
    expect(open).toHaveLength(1)
  })

  it('does nothing when there is no open block, so pressing twice is not an error', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })

    await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })
    await repository.finishExercise(legPress.id)

    await expect(repository.finishExercise(legPress.id)).resolves.toBeUndefined()
    expect((await repository.load()).data.blocks).toHaveLength(1)
  })

  it('leaves other exercises alone', async () => {
    const squat = {
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Присід',
      normalizedName: normalizeExerciseName('Присід'),
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    const repository = build({ exercises: [legPress, squat], blocks: [], sets: [] })

    await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })
    await repository.recordSet(squat.id, { weightKg: 100, reps: 5 })
    await repository.finishExercise(legPress.id)

    const open = (await repository.load()).data.blocks.filter((block) => block.closedAt === null)
    expect(open.map((block) => block.exerciseId)).toEqual([squat.id])
  })

  it('refuses to finish while the store is unreadable (FR-012)', async () => {
    const store = createMemoryStore(
      { exercises: [legPress], blocks: [], sets: [] },
      { unreadable: 'зіпсовано' },
    )
    const closeBlock = vi.spyOn(store, 'closeBlock')
    const repository = build({ exercises: [], blocks: [], sets: [] }, store)

    await expect(repository.finishExercise(legPress.id)).rejects.toThrow(UnreadableStoreError)
    expect(closeBlock).not.toHaveBeenCalled()
  })
})

describe('deleting sets (FR-016)', () => {
  it("deletes one of today's sets", async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })
    const entry = await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })

    await repository.deleteSet(entry.id)

    expect((await repository.load()).data.sets).toEqual([])
  })

  it('refuses to delete a set from an earlier day', async () => {
    const older = {
      id: '44444444-4444-4444-8444-444444444444',
      exerciseId: legPress.id,
      blockId: '99999999-9999-4999-8999-999999999991',
      date: '2026-02-01',
      loggedAt: '2026-02-01T10:00:00.000Z',
      weightKg: 50,
      reps: 8,
    }
    const repository = build({
      exercises: [legPress],
      blocks: [
        {
          id: '99999999-9999-4999-8999-999999999991',
          exerciseId: legPress.id,
          date: '2026-02-01',
          startedAt: '2026-02-01T10:00:00.000Z',
          closedAt: '2026-02-01T10:30:00.000Z',
        },
      ],
      sets: [older],
    })

    await expect(repository.deleteSet(older.id)).rejects.toThrow(ImmutablePastError)
    expect((await repository.load()).data.sets).toHaveLength(1)
  })
})

describe('import (FR-018)', () => {
  it('replaces everything currently recorded', async () => {
    const repository = build({ exercises: [legPress], blocks: [], sets: [] })
    await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })

    await repository.replaceAll({ exercises: [], blocks: [], sets: [] })

    expect((await repository.load()).data).toEqual({ exercises: [], blocks: [], sets: [] })
  })
})

describe('unreadable storage refuses every write (FR-012)', () => {
  function unreadable() {
    const store = createMemoryStore(
      { exercises: [legPress], blocks: [], sets: [] },
      { unreadable: 'зіпсовано' },
    )

    return {
      repository: build({ exercises: [], blocks: [], sets: [] }, store),
      addExercise: vi.spyOn(store, 'addExercise'),
      addSet: vi.spyOn(store, 'addSet'),
      deleteSet: vi.spyOn(store, 'deleteSet'),
      replaceAll: vi.spyOn(store, 'replaceAll'),
    }
  }

  it('still reports what it could read, so it can be exported', async () => {
    const result = await unreadable().repository.load()

    expect(result.status).toBe('unreadable')
    expect(result.data.exercises).toEqual([legPress])
  })

  it('refuses to add an exercise, and does not touch the store', async () => {
    const { repository, addExercise } = unreadable()

    await expect(repository.addExercise('Присід')).rejects.toThrow(UnreadableStoreError)
    expect(addExercise).not.toHaveBeenCalled()
  })

  it('refuses to record a set, and does not touch the store', async () => {
    const { repository, addSet } = unreadable()

    await expect(repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })).rejects.toThrow(
      UnreadableStoreError,
    )
    expect(addSet).not.toHaveBeenCalled()
  })

  it('refuses to delete a set, and does not touch the store', async () => {
    const { repository, deleteSet } = unreadable()

    await expect(repository.deleteSet('anything')).rejects.toThrow(UnreadableStoreError)
    expect(deleteSet).not.toHaveBeenCalled()
  })

  it('allows an explicit replaceAll, because that is the deliberate way out', async () => {
    const { repository, replaceAll } = unreadable()

    await repository.replaceAll({ exercises: [], blocks: [], sets: [] })

    expect(replaceAll).toHaveBeenCalledOnce()
  })
})
