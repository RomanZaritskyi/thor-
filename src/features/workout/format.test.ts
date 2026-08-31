import { describe, expect, it } from 'vitest'

import { formatSessions, formatWhen } from './format'

const TODAY = '2026-03-01'

describe('formatWhen (FR-003)', () => {
  it('gives a time for a block from today', () => {
    // Coming back to a machine an hour later, the date says nothing; the clock does.
    expect(formatWhen(TODAY, '2026-03-01T10:32:00.000Z', TODAY)).toMatch(/^сьогодні, \d\d:\d\d$/)
  })

  it('gives a date and a distance for an earlier day', () => {
    expect(formatWhen('2026-02-20', '2026-02-20T10:00:00.000Z', TODAY)).toBe(
      '20 лютого · 9 дн. тому',
    )
  })

  it('names yesterday rather than counting it', () => {
    expect(formatWhen('2026-02-28', '2026-02-28T10:00:00.000Z', TODAY)).toBe('28 лютого · учора')
  })
})

describe('formatSessions (FR-031)', () => {
  it('picks the Ukrainian form the number needs', () => {
    expect(formatSessions(1)).toBe('1 тренування')
    expect(formatSessions(2)).toBe('2 тренування')
    expect(formatSessions(5)).toBe('5 тренувань')
    // The teens are the trap: 11 takes the same form as 5, not as 1.
    expect(formatSessions(11)).toBe('11 тренувань')
    expect(formatSessions(21)).toBe('21 тренування')
    expect(formatSessions(0)).toBe('0 тренувань')
  })
})
