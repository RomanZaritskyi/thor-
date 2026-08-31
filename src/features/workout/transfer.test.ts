import { describe, expect, it } from 'vitest'

import { normalizeExerciseName, type Block, type Exercise, type SetEntry } from './model'
import { exportToJson, parseImport } from './transfer'

const exercise: Exercise = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Жим ногами',
  normalizedName: normalizeExerciseName('Жим ногами'),
  createdAt: '2026-01-01T00:00:00.000Z',
}

const testBlock: Block = {
  id: '99999999-9999-4999-8999-999999999991',
  exerciseId: exercise.id,
  date: '2026-02-20',
  startedAt: '2026-02-20T10:00:00.000Z',
  closedAt: '2026-02-20T10:30:00.000Z',
}

const entry: SetEntry = {
  id: '22222222-2222-4222-8222-222222222222',
  exerciseId: exercise.id,
  blockId: '99999999-9999-4999-8999-999999999991',
  date: '2026-03-01',
  loggedAt: '2026-03-01T10:00:00.000Z',
  weightKg: 60,
  reps: 10,
  note: 'Hammer, 3-й отвір',
}

const data = { exercises: [exercise], blocks: [testBlock], sets: [entry] }

describe('exportToJson (FR-017)', () => {
  it('writes a versioned envelope holding everything recorded', () => {
    const parsed: unknown = JSON.parse(exportToJson(data, new Date('2026-03-02T08:00:00.000Z')))

    expect(parsed).toEqual({
      version: 2,
      exportedAt: '2026-03-02T08:00:00.000Z',
      exercises: [exercise],
      blocks: [testBlock],
      sets: [entry],
    })
  })

  it('stays readable without this app — indented text, not a blob', () => {
    expect(exportToJson(data, new Date('2026-03-02T08:00:00.000Z'))).toContain('\n  ')
  })
})

describe('parseImport (FR-018)', () => {
  it('round-trips an exported file', () => {
    const result = parseImport(exportToJson(data, new Date('2026-03-02T08:00:00.000Z')))

    expect(result.ok).toBe(true)
    expect(result.ok && result.data).toEqual(data)
  })

  it('rejects text that is not JSON', () => {
    expect(parseImport('{ not json').ok).toBe(false)
  })

  it('rejects a file whose records fail the schema', () => {
    const broken = JSON.stringify({
      version: 2,
      exportedAt: '2026-03-02T08:00:00.000Z',
      exercises: [{ id: 'not-a-uuid' }],
      blocks: [],
      sets: [],
    })

    expect(parseImport(broken).ok).toBe(false)
  })

  it('rejects a version it does not understand, instead of guessing', () => {
    const future = JSON.stringify({
      version: 99,
      exportedAt: '2026-03-02T08:00:00.000Z',
      exercises: [],
      sets: [],
    })
    const result = parseImport(future)

    expect(result.ok).toBe(false)
    expect(result.ok ? '' : result.reason).toContain('99')
  })

  it('rejects a set pointing at an exercise the file does not contain', () => {
    const orphan = JSON.stringify({
      version: 2,
      exportedAt: '2026-03-02T08:00:00.000Z',
      exercises: [],
      blocks: [testBlock],
      sets: [entry],
    })

    expect(parseImport(orphan).ok).toBe(false)
  })

  it('accepts an empty but valid file', () => {
    const empty = JSON.stringify({
      version: 2,
      exportedAt: '2026-03-02T08:00:00.000Z',
      exercises: [],
      blocks: [],
      sets: [],
    })

    expect(parseImport(empty).ok).toBe(true)
  })
})
