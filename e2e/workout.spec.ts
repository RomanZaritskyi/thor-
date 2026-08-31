import { expect, test, type Page } from '@playwright/test'

const DB = 'thor-workout'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // Each test starts from an empty log so runs are independent.
  await page.evaluate(
    (name) =>
      new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase(name)
        request.onsuccess = () => {
          resolve()
        }
        request.onerror = () => {
          resolve()
        }
        request.onblocked = () => {
          resolve()
        }
      }),
    DB,
  )
  await page.reload()
})

async function addExercise(page: Page, name: string) {
  await page.getByLabel('Назва нової вправи').fill(name)
  await page.getByRole('button', { name: 'Додати вправу' }).click()
  await expect(page.getByRole('link', { name })).toBeVisible()
}

async function recordSet(page: Page, weight: string, reps: string) {
  await page.getByLabel('Вага, кг').fill(weight)
  await page.getByLabel('Повтори').fill(reps)
  await page.getByRole('button', { name: 'Записати підхід' }).click()
}

test('opens straight onto exercise selection (FR-001)', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Вправи', level: 1 })).toBeVisible()
  await expect(page.getByLabel('Пошук вправи')).toBeVisible()

  // No search is happening, so the address carries no search term.
  await expect(page).not.toHaveURL(/\?q=/)
})

test('adds an exercise, records sets, and keeps them across a reload (FR-005, FR-008, FR-010)', async ({
  page,
}) => {
  await addExercise(page, 'Жим ногами')
  await page.getByRole('link', { name: 'Жим ногами' }).click()

  await recordSet(page, '80', '10')
  await expect(page.getByTestId('set-summary')).toHaveText(['80 × 10'])

  await page.reload()
  await expect(page.getByTestId('set-summary')).toHaveText(['80 × 10'])
})

test('shows the previous session and prefills from it (FR-003, FR-020)', async ({ page }) => {
  await addExercise(page, 'Тяга верхнього блоку')
  await page.getByRole('link', { name: 'Тяга верхнього блоку' }).click()

  await recordSet(page, '55', '12')
  await expect(page.getByTestId('set-summary')).toHaveText(['55 × 12'])

  // The fields follow the set just recorded, so repeating it is one tap.
  await expect(page.getByLabel('Вага, кг')).toHaveValue('55')
  await expect(page.getByLabel('Повтори')).toHaveValue('12')

  await page.getByRole('button', { name: 'Записати підхід' }).click()
  await expect(page.getByTestId('set-summary')).toHaveText(['55 × 12', '55 × 12'])
})

test('filters the exercise list through the URL (FR-002)', async ({ page }) => {
  await addExercise(page, 'Присід')
  await addExercise(page, 'Станова')

  await page.getByLabel('Пошук вправи').fill('прис')

  await expect(page.getByRole('link', { name: 'Присід' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Станова' })).toBeHidden()
  await expect(page).toHaveURL(/\?q=/)

  // Clearing it takes the term back out of the address rather than leaving `?q=`.
  await page.getByLabel('Пошук вправи').clear()
  await expect(page.getByRole('link', { name: 'Станова' })).toBeVisible()
  await expect(page).not.toHaveURL(/\?q=/)
})

test('the same exercise twice in a day builds on the first run (FR-024)', async ({ page }) => {
  await addExercise(page, 'Жим ногами')
  await page.getByRole('link', { name: 'Жим ногами' }).click()

  // First run at the machine.
  await recordSet(page, '80', '10')
  await recordSet(page, '80', '9')
  await expect(page.getByTestId('set-summary')).toHaveText(['80 × 10', '80 × 9'])

  await page.getByRole('button', { name: 'Закінчити вправу' }).click()

  // Coming back later: the first run is now what "last time" shows, and the
  // fields start from where it left off.
  const lastTime = page.getByRole('region', { name: 'Минулого разу' })
  await expect(lastTime).toContainText('80 × 10')
  await expect(lastTime).toContainText('80 × 9')
  await expect(page.getByLabel('Вага, кг')).toHaveValue('80')

  await recordSet(page, '85', '8')

  await expect(page.getByRole('region', { name: 'Цей раз' })).toContainText('85 × 8')
  await expect(lastTime).toContainText('80 × 10')

  // And it survives a reload, because the block is stored, not remembered.
  await page.reload()
  await expect(page.getByRole('region', { name: 'Цей раз' })).toContainText('85 × 8')
  await expect(page.getByRole('region', { name: 'Минулого разу' })).toContainText('80 × 10')
})

test("deletes one of today's sets (FR-016)", async ({ page }) => {
  await addExercise(page, 'Присід')
  await page.getByRole('link', { name: 'Присід' }).click()

  await recordSet(page, '100', '5')
  await expect(page.getByTestId('set-summary')).toHaveText(['100 × 5'])

  await page.getByRole('button', { name: 'Видалити підхід 100 × 5' }).click()

  await expect(page.getByText('Ще жодного підходу — запишіть перший.')).toBeVisible()
})

test('renames an exercise and keeps its history (FR-025)', async ({ page }) => {
  await addExercise(page, 'Жим ногама')
  await page.getByRole('link', { name: 'Жим ногама' }).click()
  await recordSet(page, '80', '10')
  await expect(page.getByTestId('set-summary')).toHaveText(['80 × 10'])

  await page.getByRole('button', { name: 'Перейменувати' }).click()
  await page.getByLabel('Нова назва вправи').fill('Жим ногами')
  await page.getByRole('button', { name: 'Зберегти' }).click()

  await expect(page.getByRole('heading', { name: 'Жим ногами', level: 1 })).toBeVisible()
  // The assertion the spec's edge case has been asking for since the first draft.
  await expect(page.getByTestId('set-summary')).toHaveText(['80 × 10'])

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Жим ногами', level: 1 })).toBeVisible()
  await expect(page.getByTestId('set-summary')).toHaveText(['80 × 10'])
})

test('removes an exercise added by mistake (FR-026)', async ({ page }) => {
  await addExercise(page, 'Помилкова')
  await page.getByRole('link', { name: 'Помилкова' }).click()

  await page.getByRole('button', { name: 'Видалити вправу' }).click()

  await expect(page.getByRole('heading', { name: 'Вправи', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Помилкова' })).toBeHidden()
})

test('an unknown address explains itself and leads back (FR-023)', async ({ page }) => {
  await page.goto('/does-not-exist')

  await expect(page.getByRole('heading', { name: 'Сторінку не знайдено' })).toBeVisible()

  await page.getByRole('link', { name: 'До списку вправ' }).click()
  await expect(page.getByRole('heading', { name: 'Вправи', level: 1 })).toBeVisible()
})
