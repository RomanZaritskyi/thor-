import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { normalizeExerciseName, type Block, type Exercise, type SetEntry } from '../model'
import { createTestRepository, renderWorkout } from '../test-utils'
import type { WorkoutData } from '../transfer'
import { ExerciseScreen } from './exercise-screen'

const legPress: Exercise = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Жим ногами',
  normalizedName: normalizeExerciseName('Жим ногами'),
  createdAt: '2026-01-01T00:00:00.000Z',
}

let seq = 0
const uuid = (tag: string) => `00000000-0000-4000-9000-${tag.padStart(12, '0')}`

function block(overrides: Partial<Block> = {}): Block {
  return {
    id: uuid('b1'),
    exerciseId: legPress.id,
    date: '2026-02-20',
    startedAt: '2026-02-20T10:00:00.000Z',
    closedAt: '2026-02-20T10:30:00.000Z',
    ...overrides,
  }
}

function set(overrides: Partial<SetEntry> = {}): SetEntry {
  seq += 1
  return {
    id: uuid(`s${String(seq)}`),
    exerciseId: legPress.id,
    blockId: uuid('b1'),
    date: '2026-02-20',
    loggedAt: `2026-02-20T10:0${String(seq % 10)}:00.000Z`,
    weightKg: 60,
    reps: 10,
    ...overrides,
  }
}

/** A ramp recorded a week and a half ago — the shape the Previous column is for. */
function ramp(...loads: [number, number][]): SetEntry[] {
  return loads.map(([weightKg, reps]) => set({ weightKg, reps }))
}

function render(seed: Partial<Omit<WorkoutData, 'exercises'>> = {}) {
  const repository = createTestRepository({
    exercises: [legPress],
    blocks: seed.blocks ?? [],
    sets: seed.sets ?? [],
  })

  return renderWorkout(<ExerciseScreen exerciseId={legPress.id} />, { repository })
}

/** Set summaries in DOM order — the assertion target for ordering rules. */
function summaries() {
  return screen.getAllByTestId('set-summary').map((node) => node.textContent)
}

/** Last time's column, in DOM order. */
function previously() {
  return screen.getAllByTestId('set-previous').map((node) => node.textContent)
}

/** Every body row as `[position, last time, this time]` — the pairing itself. */
function rows() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => {
      const cells = within(row).getAllByRole('cell')

      return [
        within(row).getByRole('rowheader').textContent,
        cells[0]?.textContent,
        cells[1]?.textContent,
      ]
    })
}

async function recordSet(user: ReturnType<typeof render>['user'], weight: string, reps: string) {
  await user.clear(await screen.findByLabelText('Вага, кг'))
  await user.type(screen.getByLabelText('Вага, кг'), weight)
  await user.clear(screen.getByLabelText('Повтори'))
  await user.type(screen.getByLabelText('Повтори'), reps)
  await user.click(screen.getByRole('button', { name: 'Записати підхід' }))

  // Wait for it to land in today's column. Waiting on the text alone is
  // ambiguous the moment a set repeats what was done at the same position.
  await vi.waitFor(() => {
    expect(summaries()).toContain(`${weight} × ${reps}`)
  })
}

describe('<ExerciseScreen />', () => {
  it('names the exercise (FR-003)', async () => {
    render()

    expect(await screen.findByRole('heading', { name: 'Жим ногами' })).toBeInTheDocument()
  })

  it('says so when the exercise has no history (FR-004)', async () => {
    render()

    expect(await screen.findByText(/ще не робили/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the previous block with every set (FR-003)', async () => {
    render({ blocks: [block()], sets: ramp([55, 12], [60, 10]) })

    await screen.findByRole('table', { name: 'Підходи' })

    expect(previously()).toEqual(['55 × 12', '60 × 10'])
  })

  it('shows when the previous block happened (FR-003)', async () => {
    render({ blocks: [block()], sets: ramp([55, 12]) })

    // 2026-02-20 against a clock pinned to 2026-03-01.
    expect(await screen.findByText(/20 лютого · 9 дн\. тому/)).toBeInTheDocument()
  })

  it('shows the previous block, not an older one (FR-003)', async () => {
    render({
      blocks: [
        block({
          id: uuid('b0'),
          date: '2026-01-01',
          startedAt: '2026-01-01T10:00:00.000Z',
          closedAt: '2026-01-01T10:30:00.000Z',
        }),
        block(),
      ],
      sets: [
        set({ blockId: uuid('b0'), date: '2026-01-01', weightKg: 40, reps: 5 }),
        set({ weightKg: 60, reps: 10 }),
      ],
    })

    await screen.findByRole('table', { name: 'Підходи' })

    expect(previously()).toEqual(['60 × 10'])
  })
})

describe('<ExerciseScreen /> — the Previous column (FR-030)', () => {
  it('puts each set beside the one done at the same position last time', async () => {
    const { user } = render({ blocks: [block()], sets: ramp([20, 20], [40, 10], [60, 8]) })

    await recordSet(user, '22.5', '20')
    await recordSet(user, '42.5', '10')

    expect(rows()).toEqual([
      ['1', '20 × 20', '22.5 × 20'],
      ['2', '40 × 10', '42.5 × 10'],
      // Not reached yet, so what is left to match is still on screen.
      ['3', '60 × 8', 'наступний'],
    ])
  })

  it('marks the position about to be recorded', async () => {
    render({ blocks: [block()], sets: ramp([20, 20], [40, 10]) })

    await screen.findByRole('table', { name: 'Підходи' })
    const [first, second] = screen.getAllByRole('row').slice(1)

    expect(first).toHaveAttribute('aria-current', 'step')
    expect(second).not.toHaveAttribute('aria-current')
  })

  it('shows a dash where last time has nothing to compare against', async () => {
    const { user } = render()

    await recordSet(user, '38', '4')

    expect(rows()).toEqual([['1', '—', '38 × 4']])
  })

  it('goes past the end of last time rather than stopping there', async () => {
    const { user } = render({ blocks: [block()], sets: ramp([20, 20]) })

    await recordSet(user, '20', '20')
    await recordSet(user, '40', '10')

    expect(rows()).toEqual([
      ['1', '20 × 20', '20 × 20'],
      ['2', '—', '40 × 10'],
    ])
  })

  it('shows a note on either side of the row (FR-014)', async () => {
    const { user } = render({ blocks: [block()], sets: [set({ note: 'Hammer, 3-й отвір' })] })

    expect(await screen.findByText('Hammer, 3-й отвір')).toBeInTheDocument()

    await user.type(await screen.findByLabelText(/Примітка/), 'важко')
    await user.click(screen.getByRole('button', { name: 'Записати підхід' }))
    await vi.waitFor(() => {
      expect(summaries()).toHaveLength(1)
    })

    expect(rows()[0]?.[1]).toContain('Hammer, 3-й отвір')
    expect(rows()[0]?.[2]).toContain('важко')
  })
})

describe('<ExerciseScreen /> — recording', () => {
  it('records a set into the block in progress (FR-005)', async () => {
    const { user } = render()

    await recordSet(user, '80', '6')

    expect(await screen.findByText('80 × 6')).toBeInTheDocument()
    expect(summaries()).toEqual(['80 × 6'])
  })

  it('keeps several sets in the order recorded (FR-006)', async () => {
    const { user } = render()

    for (let i = 0; i < 3; i += 1) {
      await recordSet(user, String(50 + i), '10')
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
})

describe('<ExerciseScreen /> — prefill by position (FR-020)', () => {
  it('starts a fresh block from the first set of the last one, not its heaviest', async () => {
    render({ blocks: [block()], sets: ramp([20, 20], [40, 10], [60, 8], [80, 5]) })

    expect(await screen.findByLabelText('Вага, кг')).toHaveValue(20)
    expect(screen.getByLabelText('Повтори')).toHaveValue(20)
  })

  it('moves to the next position as sets are recorded', async () => {
    const { user } = render({ blocks: [block()], sets: ramp([20, 20], [40, 10], [60, 8]) })

    await recordSet(user, '20', '20')

    expect(screen.getByLabelText('Вага, кг')).toHaveValue(40)
    expect(screen.getByLabelText('Повтори')).toHaveValue(10)
  })

  it('names the position and what it has to beat', async () => {
    const { user } = render({ blocks: [block()], sets: ramp([20, 20], [40, 10]) })

    expect(await screen.findByText('Підхід 1 · минулого разу 20 × 20')).toBeInTheDocument()

    await recordSet(user, '20', '20')

    expect(await screen.findByText('Підхід 2 · минулого разу 40 × 10')).toBeInTheDocument()
  })

  it('says so where last time has no counterpart', async () => {
    render()

    expect(await screen.findByText('Підхід 1 · минулого разу не було')).toBeInTheDocument()
    expect(screen.getByLabelText('Вага, кг')).toHaveValue(null)
  })

  it('falls back to the set just recorded past the end of last time', async () => {
    const { user } = render({ blocks: [block()], sets: ramp([40, 5]) })

    await recordSet(user, '70', '5')

    expect(screen.getByLabelText('Вага, кг')).toHaveValue(70)
  })
})

describe('<ExerciseScreen /> — finishing and deleting', () => {
  it('finishing makes this run the one to build on next time (FR-024)', async () => {
    const { user } = render()

    await recordSet(user, '100', '5')

    await user.click(screen.getByRole('button', { name: 'Закінчити вправу' }))

    // The run just finished is now "last time", and nothing is in progress.
    await vi.waitFor(() => {
      expect(previously()).toEqual(['100 × 5'])
    })
    expect(screen.queryByTestId('set-summary')).not.toBeInTheDocument()

    // Starting again opens a fresh run, prefilled from the finished one.
    expect(screen.getByLabelText('Вага, кг')).toHaveValue(100)
    await recordSet(user, '105', '5')

    await vi.waitFor(() => {
      expect(rows()).toEqual([['1', '100 × 5', '105 × 5']])
    })
  })

  it('offers no finish when nothing is in progress (FR-024)', async () => {
    render({ blocks: [block()], sets: [set()] })

    await screen.findByRole('table', { name: 'Підходи' })

    expect(screen.queryByRole('button', { name: 'Закінчити вправу' })).not.toBeInTheDocument()
  })

  it("deletes one of today's sets (FR-016)", async () => {
    const { user } = render()

    await recordSet(user, '100', '5')

    await user.click(screen.getByRole('button', { name: 'Видалити підхід 100 × 5' }))

    await vi.waitFor(() => {
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  it('still allows deleting from a block already finished today (FR-016)', async () => {
    const { user } = render()

    await recordSet(user, '100', '5')
    await user.click(screen.getByRole('button', { name: 'Закінчити вправу' }))
    await vi.waitFor(() => {
      expect(previously()).toEqual(['100 × 5'])
    })

    // Not in the row — the Previous column is read-only, so the fix has its own place.
    expect(screen.queryByRole('button', { name: /Видалити підхід/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Виправити минулий підхід' }))
    await user.click(await screen.findByRole('button', { name: 'Видалити підхід 100 × 5' }))

    expect(await screen.findByText(/ще не робили/i)).toBeInTheDocument()
  })

  it('offers no way to change a block from an earlier day (FR-016)', async () => {
    render({ blocks: [block()], sets: [set()] })

    await screen.findByRole('table', { name: 'Підходи' })

    expect(screen.queryByRole('button', { name: /Видалити підхід/ })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Виправити минулий підхід' }),
    ).not.toBeInTheDocument()
  })
})

describe('<ExerciseScreen /> — the exercise itself', () => {
  it('renames the exercise, and the history stays with it (FR-025)', async () => {
    const { user } = render({ blocks: [block()], sets: ramp([55, 12]) })

    await user.click(await screen.findByRole('button', { name: 'Перейменувати' }))
    const field = screen.getByLabelText('Нова назва вправи')
    await user.clear(field)
    await user.type(field, 'Жим ногами вузько')
    await user.click(screen.getByRole('button', { name: 'Зберегти' }))

    expect(await screen.findByRole('heading', { name: 'Жим ногами вузько' })).toBeInTheDocument()
    expect(previously()).toEqual(['55 × 12'])
  })

  it('reports a name another exercise holds, and keeps the old one (FR-025)', async () => {
    const squat: Exercise = {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Присід',
      normalizedName: normalizeExerciseName('Присід'),
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    const repository = createTestRepository({ exercises: [legPress, squat], blocks: [], sets: [] })
    const { user } = renderWorkout(<ExerciseScreen exerciseId={legPress.id} />, { repository })

    await user.click(await screen.findByRole('button', { name: 'Перейменувати' }))
    const field = screen.getByLabelText('Нова назва вправи')
    await user.clear(field)
    await user.type(field, 'присід')
    await user.click(screen.getByRole('button', { name: 'Зберегти' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/вже існує/)
    expect((await repository.load()).data.exercises[0]?.name).toBe('Жим ногами')
  })

  it('abandons a rename on cancel (FR-025)', async () => {
    const { user } = render()

    await user.click(await screen.findByRole('button', { name: 'Перейменувати' }))
    await user.type(screen.getByLabelText('Нова назва вправи'), 'зайве')
    await user.click(screen.getByRole('button', { name: 'Скасувати' }))

    expect(screen.getByRole('heading', { name: 'Жим ногами' })).toBeInTheDocument()
  })

  it('offers removal only while nothing is recorded (FR-026)', async () => {
    const { user } = render()

    expect(await screen.findByRole('button', { name: 'Видалити вправу' })).toBeInTheDocument()

    await recordSet(user, '60', '10')

    expect(screen.queryByRole('button', { name: 'Видалити вправу' })).not.toBeInTheDocument()
  })

  it('removes an exercise that has no history (FR-026)', async () => {
    const { user, repository } = render()

    await user.click(await screen.findByRole('button', { name: 'Видалити вправу' }))

    await vi.waitFor(async () => {
      expect((await repository.load()).data.exercises).toEqual([])
    })
  })

  it('explains an exercise that does not exist, and offers the way back (FR-023)', async () => {
    const repository = createTestRepository({ exercises: [], blocks: [], sets: [] })
    renderWorkout(<ExerciseScreen exerciseId={uuid('zz')} />, { repository })

    expect(await screen.findByText(/Такої вправи немає/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'До списку вправ' })).toBeInTheDocument()
  })
})

describe('<ExerciseScreen /> — stepping (FR-027)', () => {
  it('adjusts weight and reps in steps, without typing', async () => {
    const { user } = render({ blocks: [block()], sets: ramp([80, 10]) })

    await user.click(await screen.findByRole('button', { name: 'Більше на 2.5 кг' }))
    expect(screen.getByLabelText('Вага, кг')).toHaveValue(82.5)

    await user.click(screen.getByRole('button', { name: 'Менше на 2.5 кг' }))
    expect(screen.getByLabelText('Вага, кг')).toHaveValue(80)

    await user.click(screen.getByRole('button', { name: 'На один повтор більше' }))
    expect(screen.getByLabelText('Повтори')).toHaveValue(11)
  })

  it('records the stepped value', async () => {
    const { user } = render({ blocks: [block()], sets: ramp([80, 10]) })

    await user.click(await screen.findByRole('button', { name: 'Більше на 2.5 кг' }))
    await user.click(screen.getByRole('button', { name: 'Записати підхід' }))

    expect(await screen.findByText('82.5 × 10')).toBeInTheDocument()
  })

  it('offers no downward step at the minimum', async () => {
    render()

    // Empty fields read as the minimum, so there is nothing to step down to.
    expect(await screen.findByRole('button', { name: 'Менше на 2.5 кг' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'На один повтор менше' })).toBeDisabled()
  })
})
