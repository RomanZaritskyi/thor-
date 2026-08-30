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
})

test("deletes one of today's sets (FR-016)", async ({ page }) => {
  await addExercise(page, 'Присід')
  await page.getByRole('link', { name: 'Присід' }).click()

  await recordSet(page, '100', '5')
  await expect(page.getByTestId('set-summary')).toHaveText(['100 × 5'])

  await page.getByRole('button', { name: 'Видалити підхід 100 × 5' }).click()

  await expect(page.getByText('Сьогодні ще не було підходів.')).toBeVisible()
})

test('an unknown route shows the not-found page', async ({ page }) => {
  await page.goto('/does-not-exist')

  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})
