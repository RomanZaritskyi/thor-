import { expect, test } from '@playwright/test'

/**
 * FR-011 — the gym floor has no signal, so the app must *open* offline, not just
 * keep working once loaded. That is what the precached service worker buys, and
 * the only way to prove it is to go offline and load the page cold.
 */
test('opens and records a set with the network disabled (FR-011)', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase('thor-workout')
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
  )

  // The worker must be in control before offline means anything.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: 20_000,
  })

  await context.setOffline(true)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Вправи', level: 1 })).toBeVisible()

  await page.getByLabel('Назва нової вправи').fill('Гантельний жим')
  await page.getByRole('button', { name: 'Додати вправу' }).click()
  await page.getByRole('link', { name: 'Гантельний жим' }).click()

  await page.getByLabel('Вага, кг').fill('24')
  await page.getByLabel('Повтори').fill('12')
  await page.getByRole('button', { name: 'Записати підхід' }).click()

  await expect(page.getByTestId('set-summary')).toHaveText(['24 × 12'])

  // Still offline, still there after a cold reload.
  await page.reload()
  await expect(page.getByTestId('set-summary')).toHaveText(['24 × 12'])

  await context.setOffline(false)
})
