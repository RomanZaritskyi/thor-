import { screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { normalizeExerciseName, type Exercise, type SetEntry } from '../model'
import { createTestRepository, renderWorkout } from '../test-utils'
import { ExercisePicker } from './exercise-picker'

function exercise(name: string, id: string): Exercise {
  return {
    id,
    name,
    normalizedName: normalizeExerciseName(name),
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

const legPress = exercise('Жим ногами', '11111111-1111-4111-8111-111111111111')
const pulldown = exercise('Тяга верхнього блоку', '22222222-2222-4222-8222-222222222222')

function Harness() {
  const [query, setQuery] = useState('')

  return <ExercisePicker query={query} onQueryChange={setQuery} />
}

function set(exerciseId: string, date: string, loggedAt: string): SetEntry {
  return {
    id: `00000000-0000-4000-9000-${loggedAt.slice(-9, -5).replace(/\D/g, '0')}00000000`.slice(
      0,
      36,
    ),
    exerciseId,
    blockId: '99999999-9999-4999-8999-999999999991',
    date,
    loggedAt,
    weightKg: 60,
    reps: 10,
  }
}

describe('<ExercisePicker /> ordering (FR-028, FR-029)', () => {
  const squat = exercise('Присід', '33333333-3333-4333-8333-333333333333')

  it('puts the most recently recorded exercise first', async () => {
    const repository = createTestRepository({
      exercises: [legPress, pulldown, squat],
      blocks: [],
      sets: [
        set(legPress.id, '2026-02-20', '2026-02-20T10:00:00.000Z'),
        set(pulldown.id, '2026-03-01', '2026-03-01T10:00:00.000Z'),
      ],
    })
    renderWorkout(<Harness />, { repository })

    await screen.findByRole('link', { name: /Тяга/ })

    // Recorded today, recorded last week, never recorded.
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      expect.stringContaining('Тяга верхнього блоку'),
      expect.stringContaining('Жим ногами'),
      expect.stringContaining('Присід'),
    ])
  })

  it('says when each exercise was last recorded, and nothing for one never done', async () => {
    const repository = createTestRepository({
      exercises: [legPress, squat],
      blocks: [],
      sets: [set(legPress.id, '2026-03-01', '2026-03-01T10:00:00.000Z')],
    })
    renderWorkout(<Harness />, { repository })

    expect(await screen.findByTestId('exercise-when')).toHaveTextContent('сьогодні')
    expect(screen.getAllByTestId('exercise-when')).toHaveLength(1)
  })
})

describe('<ExercisePicker />', () => {
  it('lists every exercise (FR-001)', async () => {
    const repository = createTestRepository({
      exercises: [legPress, pulldown],
      blocks: [],
      sets: [],
    })
    renderWorkout(<Harness />, { repository })

    expect(await screen.findByRole('link', { name: 'Жим ногами' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Тяга верхнього блоку' })).toBeInTheDocument()
  })

  it('narrows the list as the query changes (FR-002)', async () => {
    const repository = createTestRepository({
      exercises: [legPress, pulldown],
      blocks: [],
      sets: [],
    })
    const { user } = renderWorkout(<Harness />, { repository })

    await user.type(await screen.findByLabelText('Пошук вправи'), 'ног')

    expect(screen.getByRole('link', { name: 'Жим ногами' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Тяга верхнього блоку' })).not.toBeInTheDocument()
  })

  it('explains an empty list and a fruitless search differently (FR-021)', async () => {
    const { user, unmount } = renderWorkout(<Harness />, {
      repository: createTestRepository({ exercises: [], blocks: [], sets: [] }),
    })

    expect(await screen.findByText(/Список порожній/)).toBeInTheDocument()
    unmount()

    const second = renderWorkout(<Harness />, {
      repository: createTestRepository({ exercises: [legPress], blocks: [], sets: [] }),
    })
    await second.user.type(await screen.findByLabelText('Пошук вправи'), 'zzz')

    expect(await screen.findByText(/нічого не знайдено/)).toBeInTheDocument()
    expect(user).toBeDefined()
  })

  it('adds an exercise and makes it findable at once (FR-008)', async () => {
    const { user } = renderWorkout(<Harness />, {
      repository: createTestRepository({ exercises: [], blocks: [], sets: [] }),
    })

    await user.type(await screen.findByLabelText('Назва нової вправи'), 'Присід')
    await user.click(screen.getByRole('button', { name: 'Додати вправу' }))

    expect(await screen.findByRole('link', { name: 'Присід' })).toBeInTheDocument()
  })

  it('clears the add field after a successful add, ready for the next (FR-008)', async () => {
    const { user } = renderWorkout(<Harness />, {
      repository: createTestRepository({ exercises: [], blocks: [], sets: [] }),
    })

    const field = await screen.findByLabelText('Назва нової вправи')
    await user.type(field, 'Присід')
    await user.click(screen.getByRole('button', { name: 'Додати вправу' }))
    await screen.findByRole('link', { name: 'Присід' })

    expect(field).toHaveValue('')
  })

  it('adds a second exercise right after the first, without losing form state (FR-008)', async () => {
    const { user } = renderWorkout(<Harness />, {
      repository: createTestRepository({ exercises: [], blocks: [], sets: [] }),
    })

    for (const name of ['Присід', 'Станова']) {
      await user.type(await screen.findByLabelText('Назва нової вправи'), name)
      await user.click(screen.getByRole('button', { name: 'Додати вправу' }))
      expect(await screen.findByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('refuses a name that differs only by case or spacing (FR-009)', async () => {
    const repository = createTestRepository({ exercises: [legPress], blocks: [], sets: [] })
    const { user } = renderWorkout(<Harness />, { repository })

    await user.type(await screen.findByLabelText('Назва нової вправи'), 'жим  ногами')
    await user.click(screen.getByRole('button', { name: 'Додати вправу' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/вже існує/)
    expect(screen.getAllByRole('link', { name: /ногами/i })).toHaveLength(1)
  })

  it('refuses a blank name without calling the repository (FR-022)', async () => {
    const repository = createTestRepository({ exercises: [], blocks: [], sets: [] })
    const { user } = renderWorkout(<Harness />, { repository })

    await user.click(await screen.findByRole('button', { name: 'Додати вправу' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect((await repository.load()).data.exercises).toEqual([])
  })
})
