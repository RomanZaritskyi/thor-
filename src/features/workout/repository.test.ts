import { describe, expect, it, vi } from 'vitest'

import { normalizeExerciseName, type Exercise } from './model'
import {
  createWorkoutRepository,
  DuplicateExerciseError,
  ImmutablePastError,
  UnknownExerciseError,
  UnreadableStoreError,
  type WorkoutRepository,
} from './repository'
import { createMemoryStore, type WorkoutStore } from './store'
import type { WorkoutData } from './transfer'

/** Deterministic ids and a clock that ticks a second per read. */
function build(
  seed: WorkoutData = { exercises: [], sets: [] },
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
    const repository = build({ exercises: [legPress], sets: [] })

    await expect(repository.addExercise('жим  ногами')).rejects.toThrow(DuplicateExerciseError)
    await expect(repository.addExercise('  ЖИМ НОГАМИ ')).rejects.toThrow(DuplicateExerciseError)
  })

  it('rejects a blank name', async () => {
    await expect(build().addExercise('   ')).rejects.toThrow()
  })
})

describe('today (FR-015)', () => {
  it('reports the local day of the same clock that dates a set', async () => {
    const repository = build({ exercises: [legPress], sets: [] })

    const day = repository.today()
    const entry = await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })

    expect(day).toBe('2026-03-01')
    expect(entry.date).toBe(day)
  })
})

describe('recording sets (FR-005, FR-013, FR-015)', () => {
  it('records a set against an exercise, dated today', async () => {
    const repository = build({ exercises: [legPress], sets: [] })

    const entry = await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })

    expect(entry).toMatchObject({ exerciseId: legPress.id, weightKg: 60, reps: 10 })
    expect(entry.date).toBe('2026-03-01')
  })

  it('keeps an optional note (FR-014)', async () => {
    const repository = build({ exercises: [legPress], sets: [] })

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
    const repository = build({ exercises: [legPress], sets: [] })

    await expect(repository.recordSet(legPress.id, { weightKg: 60, reps: 0 })).rejects.toThrow()
    await expect(repository.recordSet(legPress.id, { weightKg: -1, reps: 5 })).rejects.toThrow()
  })

  it('appends several sets in the order recorded (FR-006)', async () => {
    const repository = build({ exercises: [legPress], sets: [] })

    await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })
    await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })

    const { sets } = (await repository.load()).data

    expect(sets).toHaveLength(2)

    const timestamps = sets.map((entry) => entry.loggedAt)
    expect(timestamps).toEqual([...timestamps].sort())
  })
})

describe('deleting sets (FR-016)', () => {
  it("deletes one of today's sets", async () => {
    const repository = build({ exercises: [legPress], sets: [] })
    const entry = await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })

    await repository.deleteSet(entry.id)

    expect((await repository.load()).data.sets).toEqual([])
  })

  it('refuses to delete a set from an earlier day', async () => {
    const older = {
      id: '44444444-4444-4444-8444-444444444444',
      exerciseId: legPress.id,
      date: '2026-02-01',
      loggedAt: '2026-02-01T10:00:00.000Z',
      weightKg: 50,
      reps: 8,
    }
    const repository = build({ exercises: [legPress], sets: [older] })

    await expect(repository.deleteSet(older.id)).rejects.toThrow(ImmutablePastError)
    expect((await repository.load()).data.sets).toHaveLength(1)
  })
})

describe('import (FR-018)', () => {
  it('replaces everything currently recorded', async () => {
    const repository = build({ exercises: [legPress], sets: [] })
    await repository.recordSet(legPress.id, { weightKg: 60, reps: 10 })

    await repository.replaceAll({ exercises: [], sets: [] })

    expect((await repository.load()).data).toEqual({ exercises: [], sets: [] })
  })
})

describe('unreadable storage refuses every write (FR-012)', () => {
  function unreadable() {
    const store = createMemoryStore(
      { exercises: [legPress], sets: [] },
      { unreadable: 'зіпсовано' },
    )

    return {
      repository: build({ exercises: [], sets: [] }, store),
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

    await repository.replaceAll({ exercises: [], sets: [] })

    expect(replaceAll).toHaveBeenCalledOnce()
  })
})
