import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildNote } from '@/test/utils'

import { createLocalStorageStore, createMemoryStore, NOTES_STORAGE_KEY } from './store'

describe('createMemoryStore', () => {
  it('round-trips notes and hands back copies', () => {
    const store = createMemoryStore([buildNote({ id: 'a' })])
    const first = store.read()

    first.pop()

    expect(store.read()).toHaveLength(1)
  })
})

describe('createLocalStorageStore (FR-006)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists notes under the versioned key', () => {
    const store = createLocalStorageStore(localStorage)
    const note = buildNote({ id: '11111111-1111-4111-8111-111111111111' })

    store.write([note])

    expect(JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) ?? 'null')).toEqual([note])
    expect(store.read()).toEqual([note])
  })

  it('reads an empty list when nothing was stored', () => {
    expect(createLocalStorageStore(localStorage).read()).toEqual([])
  })

  it('falls back to an empty list when the stored value is not JSON', () => {
    localStorage.setItem(NOTES_STORAGE_KEY, '{ not json')

    expect(createLocalStorageStore(localStorage).read()).toEqual([])
  })

  it('falls back to an empty list when the stored value fails the schema', () => {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify([{ id: 'not-a-uuid' }]))

    expect(createLocalStorageStore(localStorage).read()).toEqual([])
  })

  it('survives a storage that throws on read', () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('SecurityError')
      }),
      setItem: vi.fn(),
    } as unknown as Storage

    expect(createLocalStorageStore(storage).read()).toEqual([])
  })

  it('survives a storage that throws on write', () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error('QuotaExceededError')
      }),
    } as unknown as Storage

    expect(() => {
      createLocalStorageStore(storage).write([buildNote()])
    }).not.toThrow()
  })
})
