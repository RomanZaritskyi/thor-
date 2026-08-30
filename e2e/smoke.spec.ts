import { expect, test } from '@playwright/test'

test('the app boots and renders the shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Thor', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Thor' })).toBeVisible()
})

test('an unknown route shows the not-found page', async ({ page }) => {
  await page.goto('/does-not-exist')

  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})
