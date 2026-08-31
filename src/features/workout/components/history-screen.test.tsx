import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { normalizeExerciseName, type Block, type Exercise, type SetEntry } from '../model'
import { createTestRepository, renderWorkout } from '../test-utils'
import type { WorkoutData } from '../transfer'
import { HistoryScreen } from './history-screen'

const uuid = (tag: string) => `00000000-0000-4000-9000-${tag.padStart(12, '0')}`

const legPress: Exercise = {
  id: uuid('e1'),
  name: 'Жим ногами',
  normalizedName: normalizeExerciseName('Жим ногами'),
  createdAt: '2026-01-01T00:00:00.000Z',
}

function block(id: string, date: string): Block {
  return {
    id,
    exerciseId: legPress.id,
    date,
    startedAt: `${date}T10:00:00.000Z`,
    closedAt: `${date}T10:30:00.000Z`,
  }
}

function set(
  id: string,
  blockId: string,
  date: string,
  weightKg: number,
  reps: number,
  extra: Partial<SetEntry> = {},
): SetEntry {
  return {
    id,
    exerciseId: legPress.id,
    blockId,
    date,
    loggedAt: `${date}T10:0${id.slice(-1)}:00.000Z`,
    weightKg,
    reps,
    ...extra,
  }
}

const seed: WorkoutData = {
  exercises: [legPress],
  blocks: [block(uuid('b1'), '2026-02-10'), block(uuid('b2'), '2026-02-20')],
  sets: [
    set(uuid('s1'), uuid('b1'), '2026-02-10', 70, 10),
    set(uuid('s2'), uuid('b2'), '2026-02-20', 75, 10, { note: 'Hammer, 3-й отвір' }),
    set(uuid('s3'), uuid('b2'), '2026-02-20', 75, 8),
  ],
}

function render(data: WorkoutData = seed, exerciseId = legPress.id) {
  const repository = createTestRepository(data)

  return renderWorkout(<HistoryScreen exerciseId={exerciseId} />, {
    repository,
    initialPath: `/history/${exerciseId}`,
  })
}

describe('<HistoryScreen /> (FR-032)', () => {
  it('names the exercise', async () => {
    render()

    expect(await screen.findByRole('heading', { name: 'Жим ногами', level: 1 })).toBeInTheDocument()
  })

  it('lists every session, newest first', async () => {
    render()

    const sessions = await screen.findAllByRole('region')

    expect(sessions).toHaveLength(2)
    expect(sessions[0]).toHaveTextContent('20 лютого')
    expect(sessions[1]).toHaveTextContent('10 лютого')
  })

  it('shows each session sets in the order recorded, with notes (FR-014)', async () => {
    render()

    // Scoped by the session's own date, so this asserts which session holds what
    // rather than trusting whichever rendered first.
    const newest = await screen.findByRole('region', { name: /20 лютого/ })

    expect(
      within(newest)
        .getAllByTestId('set-summary')
        .map((node) => node.textContent),
    ).toEqual(['75 × 10', '75 × 8'])
    expect(newest).toHaveTextContent('Hammer, 3-й отвір')
  })

  it('leaves out a session whose sets were all deleted', async () => {
    render({ ...seed, sets: seed.sets.filter((entry) => entry.blockId !== uuid('b1')) })

    expect(await screen.findAllByRole('region')).toHaveLength(1)
  })

  it('offers nothing to delete — history is read-only (FR-016)', async () => {
    render()

    await screen.findAllByRole('region')

    expect(screen.queryByRole('button', { name: /Видалити підхід/ })).not.toBeInTheDocument()
  })

  it('leads back to the exercise itself', async () => {
    render()

    expect(await screen.findByRole('link', { name: 'Жим ногами' })).toHaveAttribute(
      'href',
      `/exercise/${legPress.id}`,
    )
  })

  it('explains an exercise that does not exist, and offers the way back (FR-023)', async () => {
    render({ exercises: [], blocks: [], sets: [] }, uuid('zz'))

    expect(await screen.findByText(/Такої вправи немає/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'До історії' })).toBeInTheDocument()
  })

  it('says so for an exercise that exists but was never recorded', async () => {
    render({ exercises: [legPress], blocks: [], sets: [] })

    expect(await screen.findByText(/ще не робили/i)).toBeInTheDocument()
  })
})
