import { describe, expect, it } from 'vitest'

import { buildNote, createTestRepository } from '@/test/utils'

import { NoteNotFoundError } from './repository'

describe('notes repository', () => {
  it('creates a note that starts unpinned with matching timestamps', async () => {
    const repository = createTestRepository()

    const note = await repository.create({ title: 'First', body: 'Body' })

    expect(note).toMatchObject({ title: 'First', body: 'Body', pinned: false })
    expect(note.createdAt).toBe(note.updatedAt)
    expect(await repository.list()).toEqual([note])
  })

  it('gives every note a distinct id', async () => {
    const repository = createTestRepository()

    const a = await repository.create({ title: 'a', body: '' })
    const b = await repository.create({ title: 'b', body: '' })

    expect(a.id).not.toBe(b.id)
  })

  it('pins and unpins, bumping updatedAt (FR-004)', async () => {
    const seed = buildNote({ id: '22222222-2222-4222-8222-222222222222' })
    const repository = createTestRepository([seed])

    const pinned = await repository.setPinned(seed.id, true)

    expect(pinned.pinned).toBe(true)
    expect(Date.parse(pinned.updatedAt)).toBeGreaterThan(Date.parse(seed.updatedAt))
    expect((await repository.list())[0]?.pinned).toBe(true)

    expect((await repository.setPinned(seed.id, false)).pinned).toBe(false)
  })

  it('removes a note (FR-005)', async () => {
    const seed = buildNote({ id: '33333333-3333-4333-8333-333333333333' })
    const repository = createTestRepository([seed])

    await repository.remove(seed.id)

    expect(await repository.list()).toEqual([])
  })

  it('rejects operations on an unknown id', async () => {
    const repository = createTestRepository()

    await expect(repository.setPinned('missing', true)).rejects.toThrow(NoteNotFoundError)
    await expect(repository.remove('missing')).rejects.toThrow(NoteNotFoundError)
  })
})
