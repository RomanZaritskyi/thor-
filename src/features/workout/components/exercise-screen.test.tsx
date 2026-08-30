import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { normalizeExerciseName, type Exercise, type SetEntry } from '../model'
import { createTestRepository, renderWorkout, TODAY } from '../test-utils'
import { ExerciseScreen } from './exercise-screen'

const legPress: Exercise = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Жим ногами',
  normalizedName: normalizeExerciseName('Жим ногами'),
  createdAt: '2026-01-01T00:00:00.000Z',
}

let seq = 0
function set(overrides: Partial<SetEntry> = {}): SetEntry {
  seq += 1
  return {
    id: `00000000-0000-4000-9000-${String(seq).padStart(12, '0')}`,
    exerciseId: legPress.id,
    date: '2026-02-20',
    loggedAt: `2026-02-20T10:0${String(seq)}:00.000Z`,
    weightKg: 60,
    reps: 10,
    ...overrides,
  }
}

function render(sets: SetEntry[] = []) {
  const repository = createTestRepository({ exercises: [legPress], sets })

  return renderWorkout(<ExerciseScreen exerciseId={legPress.id} />, { repository })
}

/** Set summaries in DOM order — the assertion target for ordering rules. */
function summaries() {
  return screen.getAllByTestId('set-summary').map((node) => node.textContent)
}

describe('<ExerciseScreen />', () => {
  it('names the exercise', async () => {
    render()

    expect(await screen.findByRole('heading', { name: 'Жим ногами' })).toBeInTheDocument()
  })

  it('says so when the exercise has no history (FR-004)', async () => {
    render()

    expect(await screen.findByText(/ще не робили/i)).toBeInTheDocument()
  })

  it('shows the previous session with every set (FR-003)', async () => {
    render([set({ weightKg: 55, reps: 12 }), set({ weightKg: 60, reps: 10 })])

    const lastTime = await screen.findByRole('region', { name: 'Минулого разу' })

    expect(lastTime).toHaveTextContent('55 × 12')
    expect(lastTime).toHaveTextContent('60 × 10')
  })

  it('shows the previous session, not an older one (FR-003)', async () => {
    render([
      set({ date: '2026-01-01', loggedAt: '2026-01-01T10:00:00.000Z', weightKg: 40, reps: 5 }),
      set({ date: '2026-02-20', weightKg: 60, reps: 10 }),
    ])

    const lastTime = await screen.findByRole('region', { name: 'Минулого разу' })

    expect(lastTime).toHaveTextContent('60 × 10')
    expect(lastTime).not.toHaveTextContent('40 × 5')
  })

  it('shows a note beside the set it belongs to (FR-014)', async () => {
    render([set({ note: 'Hammer, 3-й отвір' })])

    expect(await screen.findByText('Hammer, 3-й отвір')).toBeInTheDocument()
  })

  it('records a set and shows it under today (FR-005)', async () => {
    const { user } = render()

    await user.clear(await screen.findByLabelText('Вага, кг'))
    await user.type(screen.getByLabelText('Вага, кг'), '80')
    await user.clear(screen.getByLabelText('Повтори'))
    await user.type(screen.getByLabelText('Повтори'), '6')
    await user.click(screen.getByRole('button', { name: 'Записати підхід' }))

    const today = await screen.findByRole('region', { name: 'Сьогодні' })
    expect(today).toHaveTextContent('80 × 6')
  })

  it('keeps several identical sets in the order recorded (FR-006)', async () => {
    const { user } = render()

    for (let i = 0; i < 3; i += 1) {
      await user.clear(await screen.findByLabelText('Вага, кг'))
      await user.type(screen.getByLabelText('Вага, кг'), String(50 + i))
      await user.clear(screen.getByLabelText('Повтори'))
      await user.type(screen.getByLabelText('Повтори'), '10')
      await user.click(screen.getByRole('button', { name: 'Записати підхід' }))
      await screen.findByText(`${String(50 + i)} × 10`)
    }

    expect(summaries()).toEqual(['50 × 10', '51 × 10', '52 × 10'])
  })

  it('rejects an invalid set on the field, recording nothing (FR-007)', async () => {
    const { user, repository } = render()

    await user.clear(await screen.findByLabelText('Повтори'))
    await user.type(screen.getByLabelText('Повтори'), '0')
    await user.click(screen.getByRole('button', { name: 'Записати підхід' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect((await repository.load()).data.sets).toEqual([])
  })

  it('prefills from the previous session (FR-020)', async () => {
    render([set({ weightKg: 62.5, reps: 9 })])

    expect(await screen.findByLabelText('Вага, кг')).toHaveValue(62.5)
    expect(screen.getByLabelText('Повтори')).toHaveValue(9)
  })

  it("prefills from today's last set once there is one (FR-020)", async () => {
    const { user } = render([set({ weightKg: 40, reps: 5 })])

    await user.clear(await screen.findByLabelText('Вага, кг'))
    await user.type(screen.getByLabelText('Вага, кг'), '70')
    await user.click(screen.getByRole('button', { name: 'Записати підхід' }))
    await screen.findByText('70 × 5')

    expect(screen.getByLabelText('Вага, кг')).toHaveValue(70)
  })

  it('starts empty for an exercise with no history (FR-020)', async () => {
    render()

    expect(await screen.findByLabelText('Вага, кг')).toHaveValue(null)
  })

  it("deletes one of today's sets (FR-016)", async () => {
    const { user } = render([set({ date: TODAY, loggedAt: '2026-03-01T10:00:00.000Z' })])

    await user.click(await screen.findByRole('button', { name: 'Видалити підхід 60 × 10' }))

    expect(await screen.findByText(/ще не було підходів/i)).toBeInTheDocument()
  })

  it('offers no delete on a set from an earlier day (FR-016)', async () => {
    render([set({ date: '2026-02-20' })])

    await screen.findByRole('region', { name: 'Минулого разу' })

    expect(screen.queryByRole('button', { name: /Видалити підхід/ })).not.toBeInTheDocument()
  })

  it('reports an exercise that does not exist', async () => {
    const repository = createTestRepository({ exercises: [], sets: [] })
    renderWorkout(<ExerciseScreen exerciseId="99999999-9999-4999-8999-999999999999" />, {
      repository,
    })

    expect(await screen.findByText(/Такої вправи немає/)).toBeInTheDocument()
  })
})
