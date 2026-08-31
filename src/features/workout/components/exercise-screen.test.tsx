import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

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

async function recordSet(user: ReturnType<typeof render>['user'], weight: string, reps: string) {
  await user.clear(await screen.findByLabelText('Вага, кг'))
  await user.type(screen.getByLabelText('Вага, кг'), weight)
  await user.clear(screen.getByLabelText('Повтори'))
  await user.type(screen.getByLabelText('Повтори'), reps)
  await user.click(screen.getByRole('button', { name: 'Записати підхід' }))
}

describe('<ExerciseScreen />', () => {
  it('names the exercise (FR-003)', async () => {
    render()

    expect(await screen.findByRole('heading', { name: 'Жим ногами' })).toBeInTheDocument()
  })

  it('says so when the exercise has no history (FR-004)', async () => {
    render()

    expect(await screen.findByText(/ще не робили/i)).toBeInTheDocument()
  })

  it('shows the previous block with every set (FR-003)', async () => {
    render({
      blocks: [block()],
      sets: [set({ weightKg: 55, reps: 12 }), set({ weightKg: 60, reps: 10 })],
    })

    const lastTime = await screen.findByRole('region', { name: 'Минулого разу' })

    expect(lastTime).toHaveTextContent('55 × 12')
    expect(lastTime).toHaveTextContent('60 × 10')
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

    const lastTime = await screen.findByRole('region', { name: 'Минулого разу' })

    expect(lastTime).toHaveTextContent('60 × 10')
    expect(lastTime).not.toHaveTextContent('40 × 5')
  })

  it('shows a note beside the set it belongs to (FR-014)', async () => {
    render({ blocks: [block()], sets: [set({ note: 'Hammer, 3-й отвір' })] })

    expect(await screen.findByText('Hammer, 3-й отвір')).toBeInTheDocument()
  })

  it('records a set into the block in progress (FR-005)', async () => {
    const { user } = render()

    await recordSet(user, '80', '6')

    expect(await screen.findByRole('region', { name: 'Цей раз' })).toHaveTextContent('80 × 6')
  })

  it('keeps several sets in the order recorded (FR-006)', async () => {
    const { user } = render()

    for (let i = 0; i < 3; i += 1) {
      await recordSet(user, String(50 + i), '10')
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

  it('prefills from the previous block (FR-020)', async () => {
    render({ blocks: [block()], sets: [set({ weightKg: 62.5, reps: 9 })] })

    expect(await screen.findByLabelText('Вага, кг')).toHaveValue(62.5)
    expect(screen.getByLabelText('Повтори')).toHaveValue(9)
  })

  it('follows the last set of the block in progress (FR-020)', async () => {
    const { user } = render({ blocks: [block()], sets: [set({ weightKg: 40, reps: 5 })] })

    await recordSet(user, '70', '5')
    await screen.findByText('70 × 5')

    expect(screen.getByLabelText('Вага, кг')).toHaveValue(70)
  })

  it('starts empty for an exercise with no history (FR-020)', async () => {
    render()

    expect(await screen.findByLabelText('Вага, кг')).toHaveValue(null)
  })

  it('finishing makes this run the one to build on next time (FR-024)', async () => {
    const { user } = render()

    await recordSet(user, '100', '5')
    await screen.findByText('100 × 5')

    await user.click(screen.getByRole('button', { name: 'Закінчити вправу' }))

    // The run just finished is now "last time", and nothing is in progress.
    expect(await screen.findByRole('region', { name: 'Минулого разу' })).toHaveTextContent(
      '100 × 5',
    )
    expect(screen.getByRole('region', { name: 'Цей раз' })).toHaveTextContent(/жодного підходу/i)

    // Starting again opens a fresh run, prefilled from the finished one.
    expect(screen.getByLabelText('Вага, кг')).toHaveValue(100)
    await recordSet(user, '105', '5')

    expect(await screen.findByRole('region', { name: 'Цей раз' })).toHaveTextContent('105 × 5')
    expect(screen.getByRole('region', { name: 'Минулого разу' })).toHaveTextContent('100 × 5')
  })

  it('offers no finish when nothing is in progress (FR-024)', async () => {
    render({ blocks: [block()], sets: [set()] })

    await screen.findByRole('region', { name: 'Минулого разу' })

    expect(screen.queryByRole('button', { name: 'Закінчити вправу' })).not.toBeInTheDocument()
  })

  it("deletes one of today's sets (FR-016)", async () => {
    const { user } = render()

    await recordSet(user, '100', '5')
    await screen.findByText('100 × 5')

    await user.click(screen.getByRole('button', { name: 'Видалити підхід 100 × 5' }))

    expect(await screen.findByText(/жодного підходу/i)).toBeInTheDocument()
  })

  it('still allows deleting from a block already finished today (FR-016)', async () => {
    const { user } = render()

    await recordSet(user, '100', '5')
    await screen.findByText('100 × 5')
    await user.click(screen.getByRole('button', { name: 'Закінчити вправу' }))
    await screen.findByRole('region', { name: 'Минулого разу' })

    await user.click(screen.getByRole('button', { name: 'Видалити підхід 100 × 5' }))

    expect(await screen.findByText(/ще не робили/i)).toBeInTheDocument()
  })

  it('offers no delete on a set from an earlier day (FR-016)', async () => {
    render({ blocks: [block()], sets: [set()] })

    await screen.findByRole('region', { name: 'Минулого разу' })

    expect(screen.queryByRole('button', { name: /Видалити підхід/ })).not.toBeInTheDocument()
  })

  it('explains an exercise that does not exist, and offers the way back (FR-023)', async () => {
    const repository = createTestRepository({ exercises: [], blocks: [], sets: [] })
    renderWorkout(<ExerciseScreen exerciseId={uuid('zz')} />, { repository })

    expect(await screen.findByText(/Такої вправи немає/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'До списку вправ' })).toBeInTheDocument()
  })
})
