import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { normalizeExerciseName, type Exercise } from '../model'
import { createTestRepository, renderWorkout } from '../test-utils'
import { DataGuard } from './data-guard'

const legPress: Exercise = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Жим ногами',
  normalizedName: normalizeExerciseName('Жим ногами'),
  createdAt: '2026-01-01T00:00:00.000Z',
}

const seeded = { exercises: [legPress], blocks: [], sets: [] }

function renderGuard(unreadable?: string, saveFile = vi.fn()) {
  const repository = createTestRepository(seeded, unreadable === undefined ? {} : { unreadable })

  return {
    saveFile,
    ...renderWorkout(
      <DataGuard saveFile={saveFile}>
        <p>Робочий застосунок</p>
      </DataGuard>,
      { repository },
    ),
  }
}

describe('<DataGuard /> (FR-012)', () => {
  it('shows the app when the log reads cleanly', async () => {
    renderGuard()

    expect(await screen.findByText('Робочий застосунок')).toBeInTheDocument()
  })

  it('blocks the app and says what happened when it does not', async () => {
    renderGuard('Не вдалося прочитати 1 підход(ів)')

    expect(await screen.findByRole('heading', { name: 'Дані не читаються' })).toBeInTheDocument()
    expect(screen.queryByText('Робочий застосунок')).not.toBeInTheDocument()
  })

  it('reports the reason it was given, not a generic message', async () => {
    renderGuard('Не вдалося прочитати 7 підход(ів)')

    expect(await screen.findByText(/7 підход/)).toBeInTheDocument()
  })

  it('offers to save whatever could be read, so nothing is lost to a reset', async () => {
    const saveFile = vi.fn()
    const { user } = renderGuard('зіпсовано', saveFile)

    await user.click(await screen.findByRole('button', { name: 'Зберегти прочитане у файл' }))

    const [, contents] = saveFile.mock.calls[0] as [string, string]
    expect(JSON.parse(contents)).toMatchObject({ exercises: [legPress] })
  })

  it('erases only behind an explicit confirmation', async () => {
    const { user, repository } = renderGuard('зіпсовано')

    await user.click(await screen.findByRole('button', { name: 'Стерти все й почати заново' }))

    // Still nothing destroyed: the confirmation is a second, deliberate step.
    expect((await repository.load()).data.exercises).toEqual([legPress])

    await user.click(await screen.findByRole('button', { name: 'Так, стерти все' }))

    expect((await repository.load()).data).toEqual({ exercises: [], blocks: [], sets: [] })
  })

  it('leaves everything alone when the erase is declined', async () => {
    const { user, repository } = renderGuard('зіпсовано')

    await user.click(await screen.findByRole('button', { name: 'Стерти все й почати заново' }))
    await user.click(await screen.findByRole('button', { name: 'Скасувати' }))

    expect((await repository.load()).data.exercises).toEqual([legPress])
  })
})
