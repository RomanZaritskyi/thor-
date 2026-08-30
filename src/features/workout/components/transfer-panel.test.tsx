import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { normalizeExerciseName, type Exercise, type SetEntry } from '../model'
import { createTestRepository, renderWorkout } from '../test-utils'
import { exportToJson } from '../transfer'
import { TransferPanel } from './transfer-panel'

const legPress: Exercise = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Жим ногами',
  normalizedName: normalizeExerciseName('Жим ногами'),
  createdAt: '2026-01-01T00:00:00.000Z',
}

const entry: SetEntry = {
  id: '22222222-2222-4222-8222-222222222222',
  exerciseId: legPress.id,
  date: '2026-02-20',
  loggedAt: '2026-02-20T10:00:00.000Z',
  weightKg: 60,
  reps: 10,
}

const seeded = { exercises: [legPress], sets: [entry] }

function upload(json: string) {
  return new File([json], 'thor.json', { type: 'application/json' })
}

describe('<TransferPanel /> export (FR-017)', () => {
  it('writes everything recorded to a file', async () => {
    const saveFile = vi.fn()
    const { user } = renderWorkout(<TransferPanel saveFile={saveFile} />, {
      repository: createTestRepository(seeded),
    })

    await user.click(await screen.findByRole('button', { name: 'Зберегти у файл' }))

    expect(saveFile).toHaveBeenCalledOnce()
    const [filename, contents] = saveFile.mock.calls[0] as [string, string]
    expect(filename).toMatch(/\.json$/)
    expect(JSON.parse(contents)).toMatchObject({ exercises: [legPress], sets: [entry] })
  })
})

describe('<TransferPanel /> import (FR-018, FR-019)', () => {
  const incoming = exportToJson({ exercises: [], sets: [] }, new Date('2026-03-02T08:00:00.000Z'))

  it('names how much existing data will be replaced, before touching anything', async () => {
    const repository = createTestRepository(seeded)
    const { user } = renderWorkout(<TransferPanel />, { repository })

    await user.upload(await screen.findByLabelText('Файл для імпорту'), upload(incoming))

    expect(
      await screen.findByText(/Буде видалено 1 вправ\(и\) та 1 підход\(ів\)/),
    ).toBeInTheDocument()
    expect((await repository.load()).data).toEqual(seeded)
  })

  it('replaces everything once confirmed (FR-018)', async () => {
    const repository = createTestRepository(seeded)
    const { user } = renderWorkout(<TransferPanel />, { repository })

    await user.upload(await screen.findByLabelText('Файл для імпорту'), upload(incoming))
    await user.click(await screen.findByRole('button', { name: 'Замінити' }))

    expect(await screen.findByText(/Дані відновлено/)).toBeInTheDocument()
    expect((await repository.load()).data).toEqual({ exercises: [], sets: [] })
  })

  it('changes nothing when the confirmation is declined (FR-019)', async () => {
    const repository = createTestRepository(seeded)
    const { user } = renderWorkout(<TransferPanel />, { repository })

    await user.upload(await screen.findByLabelText('Файл для імпорту'), upload(incoming))
    await user.click(await screen.findByRole('button', { name: 'Скасувати' }))

    expect(await screen.findByText(/скасовано/i)).toBeInTheDocument()
    expect((await repository.load()).data).toEqual(seeded)
  })

  it('round-trips: export, record more, import the file back', async () => {
    const repository = createTestRepository(seeded)
    const saveFile = vi.fn()
    const { user } = renderWorkout(<TransferPanel saveFile={saveFile} />, { repository })

    await user.click(await screen.findByRole('button', { name: 'Зберегти у файл' }))
    const [, contents] = saveFile.mock.calls[0] as [string, string]

    await repository.recordSet(legPress.id, { weightKg: 99, reps: 1 })
    expect((await repository.load()).data.sets).toHaveLength(2)

    await user.upload(screen.getByLabelText('Файл для імпорту'), upload(contents))
    await user.click(await screen.findByRole('button', { name: 'Замінити' }))

    await screen.findByText(/Дані відновлено/)
    expect((await repository.load()).data).toEqual(seeded)
  })

  it('refuses a file that is not a valid export, without offering to replace', async () => {
    const repository = createTestRepository(seeded)
    const { user } = renderWorkout(<TransferPanel />, { repository })

    await user.upload(await screen.findByLabelText('Файл для імпорту'), upload('{ not json'))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Замінити' })).not.toBeInTheDocument()
    expect((await repository.load()).data).toEqual(seeded)
  })
})
