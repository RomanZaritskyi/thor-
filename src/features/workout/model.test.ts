import { describe, expect, it } from 'vitest'

import {
  currentBlock,
  daysBetween,
  lastRecordedSet,
  sortExercisesByRecency,
  stepValue,
  exerciseNameSchema,
  isBlockOpen,
  normalizeExerciseName,
  prefillFrom,
  previousBlock,
  searchExercises,
  setDraftSchema,
  setsInBlock,
  todayKey,
} from './model'
import type { Block, Exercise, SetEntry } from './model'

function exercise(name: string, id = name): Exercise {
  return {
    id,
    name,
    normalizedName: normalizeExerciseName(name),
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

const TODAY = '2026-03-01'
const EXERCISE = 'e1'

function block(overrides: Partial<Block> = {}): Block {
  return {
    id: 'b1',
    exerciseId: EXERCISE,
    date: TODAY,
    startedAt: '2026-03-01T10:00:00.000Z',
    closedAt: null,
    ...overrides,
  }
}

function set(overrides: Partial<SetEntry> = {}): SetEntry {
  return {
    id: 's1',
    exerciseId: EXERCISE,
    blockId: 'b1',
    date: TODAY,
    loggedAt: '2026-03-01T10:00:00.000Z',
    weightKg: 60,
    reps: 10,
    ...overrides,
  }
}

describe('normalizeExerciseName (FR-009)', () => {
  it('lowercases and trims', () => {
    expect(normalizeExerciseName('  Lat Pulldown  ')).toBe('lat pulldown')
  })

  it('collapses internal whitespace', () => {
    expect(normalizeExerciseName('Lat    pulldown')).toBe('lat pulldown')
  })

  it('makes case and spacing variants collide', () => {
    expect(normalizeExerciseName('ЖИМ  ногами')).toBe(normalizeExerciseName(' жим ногами '))
  })
})

describe('stepValue (FR-027)', () => {
  it('steps weight up by 2.5, keeping the fraction exact', () => {
    expect(stepValue('80', 2.5, 0)).toBe('82.5')
    expect(stepValue('82.5', 2.5, 0)).toBe('85')
  })

  it('steps weight down and clamps at zero — bodyweight is the floor', () => {
    expect(stepValue('2.5', -2.5, 0)).toBe('0')
    expect(stepValue('0', -2.5, 0)).toBe('0')
  })

  it('steps reps by one and clamps at one', () => {
    expect(stepValue('10', 1, 1)).toBe('11')
    expect(stepValue('1', -1, 1)).toBe('1')
  })

  it('starts an empty field at its minimum, so the first press is always valid', () => {
    expect(stepValue('', 1, 1)).toBe('1')
    expect(stepValue('', 2.5, 0)).toBe('0')
    expect(stepValue('   ', -1, 1)).toBe('1')
  })

  it('recovers from a field that is not a number', () => {
    expect(stepValue('abc', 2.5, 0)).toBe('0')
  })

  it('does not accumulate floating-point dust', () => {
    // 0.1 + 0.2 is the classic; results are rounded to one decimal.
    expect(stepValue('0.1', 0.2, 0)).toBe('0.3')
  })
})

describe('lastRecordedSet and sortExercisesByRecency (FR-028, FR-029)', () => {
  const older: Exercise = {
    id: 'older',
    name: 'Присід',
    normalizedName: 'присід',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
  const recent: Exercise = {
    id: 'recent',
    name: 'Жим ногами',
    normalizedName: 'жим ногами',
    createdAt: '2026-01-02T00:00:00.000Z',
  }
  const untouched: Exercise = {
    id: 'untouched',
    name: 'Станова',
    normalizedName: 'станова',
    createdAt: '2026-01-03T00:00:00.000Z',
  }
  const sets = [
    set({ id: 'a', exerciseId: 'older', date: '2026-02-20', loggedAt: '2026-02-20T10:00:00.000Z' }),
    set({ id: 'b', exerciseId: 'recent', date: TODAY, loggedAt: '2026-03-01T10:00:00.000Z' }),
  ]

  it('finds the most recent set of an exercise', () => {
    expect(lastRecordedSet(sets, 'recent')?.id).toBe('b')
    expect(lastRecordedSet(sets, 'untouched')).toBeUndefined()
  })

  it('puts the most recently recorded exercise first', () => {
    expect(sortExercisesByRecency([older, recent], sets).map((e) => e.id)).toEqual([
      'recent',
      'older',
    ])
  })

  it('puts never-recorded exercises after recorded ones, newest addition first', () => {
    // An exercise just added is about to be used, so it leads its group.
    const alsoNew: Exercise = { ...untouched, id: 'newer', createdAt: '2026-01-04T00:00:00.000Z' }

    expect(
      sortExercisesByRecency([untouched, older, alsoNew, recent], sets).map((e) => e.id),
    ).toEqual(['recent', 'older', 'newer', 'untouched'])
  })

  it('does not mutate its input', () => {
    const input = [older, recent]
    const snapshot = [...input]

    sortExercisesByRecency(input, sets)

    expect(input).toEqual(snapshot)
  })
})

describe('daysBetween', () => {
  it('counts calendar days regardless of time of day', () => {
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0)
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1)
    expect(daysBetween('2026-02-20', '2026-03-01')).toBe(9)
  })
})

describe('exerciseNameSchema (FR-022)', () => {
  it('trims but keeps the capitalisation the user chose', () => {
    expect(exerciseNameSchema.parse('  Жим Лежачи  ')).toBe('Жим Лежачи')
  })

  it('rejects a name that is blank once trimmed', () => {
    expect(exerciseNameSchema.safeParse('').success).toBe(false)
    expect(exerciseNameSchema.safeParse('   ').success).toBe(false)
  })

  it('rejects a name longer than the limit', () => {
    expect(exerciseNameSchema.safeParse('x'.repeat(61)).success).toBe(false)
    expect(exerciseNameSchema.safeParse('x'.repeat(60)).success).toBe(true)
  })
})

describe('searchExercises (FR-002)', () => {
  const all = [exercise('Тяга верхнього блоку'), exercise('Жим ногами'), exercise('Присід')]

  it('returns everything for an empty or blank query', () => {
    expect(searchExercises(all, '')).toHaveLength(3)
    expect(searchExercises(all, '   ')).toHaveLength(3)
  })

  it('matches anywhere in the name, ignoring case', () => {
    expect(searchExercises(all, 'НОГ').map((e) => e.name)).toEqual(['Жим ногами'])
  })

  it('ignores whitespace around the query', () => {
    expect(searchExercises(all, '  присід  ').map((e) => e.name)).toEqual(['Присід'])
  })

  it('returns nothing when nothing matches', () => {
    expect(searchExercises(all, 'zzz')).toEqual([])
  })

  it('does not mutate its input', () => {
    const snapshot = [...all]
    searchExercises(all, 'жим')
    expect(all).toEqual(snapshot)
  })
})

describe('todayKey (FR-015)', () => {
  it('formats a local calendar date, not a UTC one', () => {
    // 23:58 local on 1 March must stay 1 March even though UTC has rolled over.
    const late = new Date(2026, 2, 1, 23, 58)
    expect(todayKey(late)).toBe('2026-03-01')
  })

  it('rolls to the next day just after local midnight', () => {
    expect(todayKey(new Date(2026, 2, 2, 0, 3))).toBe('2026-03-02')
  })

  it('pads single-digit months and days', () => {
    expect(todayKey(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05')
  })
})

describe('isBlockOpen (FR-015)', () => {
  it('is open when nothing closed it and the day has not turned', () => {
    expect(isBlockOpen(block(), TODAY)).toBe(true)
  })

  it('is closed once finished by hand (FR-024)', () => {
    expect(isBlockOpen(block({ closedAt: '2026-03-01T11:00:00.000Z' }), TODAY)).toBe(false)
  })

  it('is closed by the day turning, finished or not', () => {
    // Forgetting to finish is certain; an overnight block would otherwise swallow
    // tomorrow's first attempt into yesterday's numbers.
    expect(isBlockOpen(block({ date: '2026-02-28' }), TODAY)).toBe(false)
  })
})

describe('setsInBlock (FR-006)', () => {
  it('keeps the order the sets were recorded', () => {
    const sets = [
      set({ id: 'c', loggedAt: '2026-03-01T10:02:00.000Z' }),
      set({ id: 'a', loggedAt: '2026-03-01T10:00:00.000Z' }),
      set({ id: 'b', loggedAt: '2026-03-01T10:01:00.000Z' }),
    ]

    expect(setsInBlock(sets, 'b1').map((entry) => entry.id)).toEqual(['a', 'b', 'c'])
  })

  it('keeps identical sets as separate entries', () => {
    const sets = [
      set({ id: 'a', loggedAt: '2026-03-01T10:00:00.000Z' }),
      set({ id: 'b', loggedAt: '2026-03-01T10:01:00.000Z' }),
      set({ id: 'c', loggedAt: '2026-03-01T10:02:00.000Z' }),
    ]

    expect(setsInBlock(sets, 'b1')).toHaveLength(3)
  })

  it('ignores sets from other blocks', () => {
    expect(setsInBlock([set({ blockId: 'other' })], 'b1')).toEqual([])
  })
})

describe('previousBlock and currentBlock (FR-003, FR-024)', () => {
  const yesterday = block({
    id: 'old',
    date: '2026-02-20',
    startedAt: '2026-02-20T10:00:00.000Z',
    closedAt: '2026-02-20T10:30:00.000Z',
  })
  const earlierToday = block({
    id: 'first',
    startedAt: '2026-03-01T09:00:00.000Z',
    closedAt: '2026-03-01T09:30:00.000Z',
  })
  const open = block({ id: 'second', startedAt: '2026-03-01T18:00:00.000Z' })

  const inOld = set({ id: 'so', blockId: 'old' })
  const inFirst = set({ id: 'sf', blockId: 'first' })

  it('shows the last closed block when nothing is in progress', () => {
    expect(previousBlock([yesterday], [inOld], EXERCISE, TODAY)?.block.id).toBe('old')
    expect(currentBlock([yesterday], [inOld], EXERCISE, TODAY)).toBeUndefined()
  })

  it('shows the block in progress separately from the one before it', () => {
    const blocks = [yesterday, earlierToday, open]
    const sets = [inOld, inFirst]

    expect(currentBlock(blocks, sets, EXERCISE, TODAY)?.block.id).toBe('second')
    expect(previousBlock(blocks, sets, EXERCISE, TODAY)?.block.id).toBe('first')
  })

  it('makes a block finished today the thing to build on when starting again (FR-024)', () => {
    // The whole point: a second attempt at the same machine has the first to beat.
    expect(
      previousBlock([yesterday, earlierToday], [inOld, inFirst], EXERCISE, TODAY)?.block.id,
    ).toBe('first')
  })

  it('carries the sets of the block it returns', () => {
    const sets = [set({ id: 's', blockId: 'first' })]

    expect(previousBlock([earlierToday], sets, EXERCISE, TODAY)?.sets.map((e) => e.id)).toEqual([
      's',
    ])
  })

  it('returns nothing for an exercise with no history (FR-004)', () => {
    expect(previousBlock([], [], EXERCISE, TODAY)).toBeUndefined()
  })

  it('ignores a block whose sets were all deleted', () => {
    // Otherwise "last time" would show an empty panel that says nothing.
    expect(previousBlock([earlierToday], [], EXERCISE, TODAY)).toBeUndefined()
  })

  it('ignores blocks of other exercises', () => {
    const other = block({ id: 'x', exerciseId: 'other' })

    expect(previousBlock([other], [set({ blockId: 'x' })], EXERCISE, TODAY)).toBeUndefined()
  })
})

describe('prefillFrom (FR-020)', () => {
  const closed = block({ id: 'first', closedAt: '2026-03-01T09:30:00.000Z' })
  const open = block({ id: 'second', startedAt: '2026-03-01T18:00:00.000Z' })

  it('follows the last set of the block in progress', () => {
    const sets = [
      set({ id: 'a', blockId: 'first', weightKg: 50, reps: 8 }),
      set({ id: 'b', blockId: 'second', weightKg: 65, reps: 12 }),
    ]

    expect(prefillFrom([closed, open], sets, EXERCISE, TODAY)).toEqual({ weightKg: 65, reps: 12 })
  })

  it('falls back to the previous block when starting a fresh one', () => {
    const sets = [set({ blockId: 'first', weightKg: 50, reps: 8 })]

    expect(prefillFrom([closed], sets, EXERCISE, TODAY)).toEqual({ weightKg: 50, reps: 8 })
  })

  it('returns undefined for an exercise with no history', () => {
    expect(prefillFrom([], [], EXERCISE, TODAY)).toBeUndefined()
  })

  it('carries no note across — a note describes one set, not the next', () => {
    const sets = [set({ blockId: 'first', note: 'Hammer, 3rd hole' })]

    expect(prefillFrom([closed], sets, EXERCISE, TODAY)).not.toHaveProperty('note')
  })
})

describe('setDraftSchema (FR-007)', () => {
  it('accepts a normal set', () => {
    expect(setDraftSchema.parse({ weightKg: 60, reps: 10 })).toEqual({ weightKg: 60, reps: 10 })
  })

  it('accepts half-plate fractions', () => {
    expect(setDraftSchema.safeParse({ weightKg: 2.5, reps: 1 }).success).toBe(true)
  })

  it('accepts zero weight for a bodyweight exercise', () => {
    expect(setDraftSchema.safeParse({ weightKg: 0, reps: 8 }).success).toBe(true)
  })

  it('rejects zero reps', () => {
    expect(setDraftSchema.safeParse({ weightKg: 60, reps: 0 }).success).toBe(false)
  })

  it('rejects fractional reps', () => {
    expect(setDraftSchema.safeParse({ weightKg: 60, reps: 8.5 }).success).toBe(false)
  })

  it('rejects a weight that is not a finite number', () => {
    expect(setDraftSchema.safeParse({ weightKg: Number.POSITIVE_INFINITY, reps: 8 }).success).toBe(
      false,
    )
    expect(setDraftSchema.safeParse({ weightKg: Number.NaN, reps: 8 }).success).toBe(false)
  })

  it('rejects negative weight', () => {
    expect(setDraftSchema.safeParse({ weightKg: -5, reps: 8 }).success).toBe(false)
  })

  it('trims a note and drops it when empty (FR-014)', () => {
    expect(setDraftSchema.parse({ weightKg: 60, reps: 10, note: '  ' }).note).toBeUndefined()
    expect(setDraftSchema.parse({ weightKg: 60, reps: 10, note: ' Hammer ' }).note).toBe('Hammer')
  })
})
