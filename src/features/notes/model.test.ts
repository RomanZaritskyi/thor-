import { describe, expect, it } from 'vitest'

import { buildNote } from '@/test/utils'

import { filterNotes, noteDraftSchema, selectVisibleNotes, sortNotes } from './model'

describe('filterNotes (FR-002)', () => {
  const notes = [
    buildNote({ id: 'a', title: 'Shopping list', body: 'milk and bread' }),
    buildNote({ id: 'b', title: 'Standup', body: 'Discuss the ROADMAP' }),
  ]

  it('returns every note for an empty or whitespace-only query', () => {
    expect(filterNotes(notes, '')).toHaveLength(2)
    expect(filterNotes(notes, '   ')).toHaveLength(2)
  })

  it('matches the title case-insensitively', () => {
    expect(filterNotes(notes, 'SHOPPING').map((note) => note.id)).toEqual(['a'])
  })

  it('matches the body case-insensitively', () => {
    expect(filterNotes(notes, 'roadmap').map((note) => note.id)).toEqual(['b'])
  })

  it('ignores whitespace around the query', () => {
    expect(filterNotes(notes, '  milk  ').map((note) => note.id)).toEqual(['a'])
  })

  it('returns nothing when no note matches', () => {
    expect(filterNotes(notes, 'nothing here')).toEqual([])
  })

  it('does not mutate the input', () => {
    const input = [...notes]
    filterNotes(input, 'shopping')
    expect(input).toEqual(notes)
  })
})

describe('sortNotes (FR-004)', () => {
  it('puts pinned notes above unpinned ones regardless of update time', () => {
    const older = buildNote({ id: 'a', pinned: true, updatedAt: '2020-01-01T00:00:00.000Z' })
    const newer = buildNote({ id: 'b', pinned: false, updatedAt: '2026-01-01T00:00:00.000Z' })

    expect(sortNotes([newer, older]).map((note) => note.id)).toEqual(['a', 'b'])
  })

  it('orders each group by most recently updated first', () => {
    const first = buildNote({ id: 'a', updatedAt: '2026-03-01T00:00:00.000Z' })
    const second = buildNote({ id: 'b', updatedAt: '2026-02-01T00:00:00.000Z' })

    expect(sortNotes([second, first]).map((note) => note.id)).toEqual(['a', 'b'])
  })

  it('breaks ties on id so the order is deterministic', () => {
    const x = buildNote({ id: 'x', updatedAt: '2026-01-01T00:00:00.000Z' })
    const y = buildNote({ id: 'y', updatedAt: '2026-01-01T00:00:00.000Z' })

    expect(sortNotes([y, x]).map((note) => note.id)).toEqual(['x', 'y'])
    expect(sortNotes([x, y]).map((note) => note.id)).toEqual(['x', 'y'])
  })

  it('does not mutate the input', () => {
    const notes = [buildNote({ id: 'b' }), buildNote({ id: 'a' })]
    const snapshot = [...notes]

    sortNotes(notes)

    expect(notes).toEqual(snapshot)
  })
})

describe('selectVisibleNotes', () => {
  it('filters first, then sorts', () => {
    const notes = [
      buildNote({ id: 'a', title: 'alpha', pinned: false, updatedAt: '2026-01-03T00:00:00.000Z' }),
      buildNote({ id: 'b', title: 'alpha', pinned: true, updatedAt: '2026-01-01T00:00:00.000Z' }),
      buildNote({ id: 'c', title: 'beta', pinned: true, updatedAt: '2026-01-05T00:00:00.000Z' }),
    ]

    expect(selectVisibleNotes(notes, 'alpha').map((note) => note.id)).toEqual(['b', 'a'])
  })
})

describe('noteDraftSchema (FR-003)', () => {
  it('accepts a minimal valid draft', () => {
    expect(noteDraftSchema.parse({ title: 'Hi', body: '' })).toEqual({ title: 'Hi', body: '' })
  })

  it('trims before validating', () => {
    expect(noteDraftSchema.parse({ title: '  Hi  ', body: '  there  ' })).toEqual({
      title: 'Hi',
      body: 'there',
    })
  })

  it('rejects a blank title', () => {
    const result = noteDraftSchema.safeParse({ title: '   ', body: '' })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Title is required')
  })

  it('rejects a title over 80 characters', () => {
    const result = noteDraftSchema.safeParse({ title: 'x'.repeat(81), body: '' })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Title must be 80 characters or fewer')
  })

  it('rejects a body over 2000 characters', () => {
    const result = noteDraftSchema.safeParse({ title: 'ok', body: 'x'.repeat(2001) })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Body must be 2000 characters or fewer')
  })
})
