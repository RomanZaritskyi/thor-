import { describe, expect, it } from 'vitest'

import {
  exerciseNameSchema,
  groupSetsByDate,
  lastSession,
  normalizeExerciseName,
  prefillFrom,
  searchExercises,
  setDraftSchema,
  todayKey,
} from './model'
import type { Exercise, SetEntry } from './model'

function exercise(name: string, id = name): Exercise {
  return {
    id,
    name,
    normalizedName: normalizeExerciseName(name),
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function set(overrides: Partial<SetEntry> = {}): SetEntry {
  return {
    id: 's1',
    exerciseId: 'e1',
    date: '2026-03-01',
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

describe('groupSetsByDate (FR-006)', () => {
  it('keeps sets of one day in the order they were recorded', () => {
    const sets = [
      set({ id: 'b', loggedAt: '2026-03-01T11:00:00.000Z' }),
      set({ id: 'a', loggedAt: '2026-03-01T10:00:00.000Z' }),
      set({ id: 'c', loggedAt: '2026-03-01T12:00:00.000Z' }),
    ]

    expect(groupSetsByDate(sets)[0]?.sets.map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('keeps identical sets as separate entries', () => {
    const sets = [
      set({ id: 'a', loggedAt: '2026-03-01T10:00:00.000Z' }),
      set({ id: 'b', loggedAt: '2026-03-01T10:01:00.000Z' }),
      set({ id: 'c', loggedAt: '2026-03-01T10:02:00.000Z' }),
    ]

    expect(groupSetsByDate(sets)[0]?.sets).toHaveLength(3)
  })

  it('orders days most recent first', () => {
    const sets = [
      set({ id: 'old', date: '2026-02-01', loggedAt: '2026-02-01T10:00:00.000Z' }),
      set({ id: 'new', date: '2026-03-01', loggedAt: '2026-03-01T10:00:00.000Z' }),
    ]

    expect(groupSetsByDate(sets).map((day) => day.date)).toEqual(['2026-03-01', '2026-02-01'])
  })
})

describe('lastSession (FR-003)', () => {
  const sets = [
    set({ id: 'a', date: '2026-02-01', loggedAt: '2026-02-01T10:00:00.000Z' }),
    set({ id: 'b', date: '2026-02-20', loggedAt: '2026-02-20T10:00:00.000Z' }),
    set({ id: 'c', date: '2026-02-20', loggedAt: '2026-02-20T10:05:00.000Z' }),
  ]

  it('returns the most recent day and all of its sets', () => {
    const result = lastSession(sets, '2026-03-01')

    expect(result?.date).toBe('2026-02-20')
    expect(result?.sets.map((s) => s.id)).toEqual(['b', 'c'])
  })

  it('excludes today, because today is not "last time"', () => {
    const withToday = [...sets, set({ id: 'today', date: '2026-03-01' })]

    expect(lastSession(withToday, '2026-03-01')?.date).toBe('2026-02-20')
  })

  it('returns undefined when there is no earlier session (FR-004)', () => {
    expect(lastSession([set({ date: '2026-03-01' })], '2026-03-01')).toBeUndefined()
    expect(lastSession([], '2026-03-01')).toBeUndefined()
  })
})

describe('prefillFrom (FR-020)', () => {
  it("prefers today's most recent set", () => {
    const sets = [
      set({ id: 'past', date: '2026-02-01', weightKg: 50, reps: 8 }),
      set({ id: 'today', date: '2026-03-01', weightKg: 65, reps: 12 }),
    ]

    expect(prefillFrom(sets, '2026-03-01')).toEqual({ weightKg: 65, reps: 12 })
  })

  it('falls back to the previous session when today is empty', () => {
    const sets = [set({ date: '2026-02-01', weightKg: 50, reps: 8 })]

    expect(prefillFrom(sets, '2026-03-01')).toEqual({ weightKg: 50, reps: 8 })
  })

  it('returns undefined for an exercise with no history', () => {
    expect(prefillFrom([], '2026-03-01')).toBeUndefined()
  })

  it('carries no note across — a note describes one set, not the next', () => {
    const sets = [set({ date: '2026-02-01', note: 'Hammer, 3rd hole' })]

    expect(prefillFrom(sets, '2026-03-01')).not.toHaveProperty('note')
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
