import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { normalizeExerciseName, type Block, type Exercise, type SetEntry } from '../model'
import { createTestRepository, renderWorkout } from '../test-utils'
import type { WorkoutData } from '../transfer'
import { HistoryIndex } from './history-index'

const uuid = (tag: string) => `00000000-0000-4000-9000-${tag.padStart(12, '0')}`

function exercise(name: string, id: string, createdAt = '2026-01-01T00:00:00.000Z'): Exercise {
  return { id, name, normalizedName: normalizeExerciseName(name), createdAt }
}

const legPress = exercise('Жим ногами', uuid('e1'))
const row = exercise('Тяга блоку', uuid('e2'))
const untouched = exercise('Гакеншмідт', uuid('e3'))

function block(id: string, exerciseId: string, date: string): Block {
  return {
    id,
    exerciseId,
    date,
    startedAt: `${date}T10:00:00.000Z`,
    closedAt: `${date}T10:30:00.000Z`,
  }
}

function set(id: string, blockId: string, exerciseId: string, date: string): SetEntry {
  return {
    id,
    exerciseId,
    blockId,
    date,
    loggedAt: `${date}T10:05:00.000Z`,
    weightKg: 60,
    reps: 10,
  }
}

function render(seed: WorkoutData) {
  const repository = createTestRepository(seed)

  return renderWorkout(<HistoryIndex />, { repository, initialPath: '/history' })
}

/** Row text in DOM order — this screen is about order and counts. */
function rows() {
  return screen.getAllByRole('link').map((link) => link.textContent)
}

describe('<HistoryIndex /> (FR-031)', () => {
  const seed: WorkoutData = {
    exercises: [legPress, row, untouched],
    blocks: [
      block(uuid('b1'), legPress.id, '2026-02-10'),
      block(uuid('b2'), legPress.id, '2026-02-20'),
      block(uuid('b3'), row.id, '2026-02-25'),
    ],
    sets: [
      set(uuid('s1'), uuid('b1'), legPress.id, '2026-02-10'),
      set(uuid('s2'), uuid('b2'), legPress.id, '2026-02-20'),
      set(uuid('s3'), uuid('b3'), row.id, '2026-02-25'),
    ],
  }

  it('orders by what was recorded most recently', async () => {
    render(seed)

    await screen.findByRole('link', { name: /Тяга блоку/ })

    expect(rows()[0]).toContain('Тяга блоку')
    expect(rows()[1]).toContain('Жим ногами')
  })

  it('says how many sessions each exercise holds', async () => {
    render(seed)

    expect(await screen.findByRole('link', { name: /Жим ногами/ })).toHaveTextContent(
      '2 тренування',
    )
    expect(screen.getByRole('link', { name: /Тяга блоку/ })).toHaveTextContent('1 тренування')
  })

  it('says when the last session was', async () => {
    render(seed)

    // 2026-02-25 against a clock pinned to 2026-03-01.
    expect(await screen.findByRole('link', { name: /Тяга блоку/ })).toHaveTextContent('4 дн. тому')
  })

  it('leaves out an exercise with nothing recorded', async () => {
    render(seed)

    await screen.findByRole('link', { name: /Тяга блоку/ })

    expect(screen.queryByRole('link', { name: /Гакеншмідт/ })).not.toBeInTheDocument()
  })

  it('leaves out an exercise whose only session was emptied', async () => {
    render({ ...seed, sets: seed.sets.filter((entry) => entry.exerciseId !== row.id) })

    await screen.findByRole('link', { name: /Жим ногами/ })

    expect(screen.queryByRole('link', { name: /Тяга блоку/ })).not.toBeInTheDocument()
  })

  it('says so when nothing is recorded at all, rather than showing an empty area', async () => {
    render({ exercises: [untouched], blocks: [], sets: [] })

    expect(await screen.findByText(/Ще нічого не записано/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
