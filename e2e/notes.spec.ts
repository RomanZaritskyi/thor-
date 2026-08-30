import { expect, test, type Page } from '@playwright/test'

const titles = (page: Page) => page.getByTestId('note-title')

test.beforeEach(async ({ page }) => {
  await page.goto('/notes')
  // Each test starts from a clean store so runs are independent.
  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.reload()
})

async function addNote(page: Page, title: string, body = '') {
  await page.getByLabel('Title').fill(title)
  if (body !== '') await page.getByLabel('Body').fill(body)
  await page.getByRole('button', { name: 'Add note' }).click()
  await expect(page.getByTestId('note-title').filter({ hasText: title })).toBeVisible()
}

test('adds a note and keeps it across a reload (FR-001, FR-003, FR-006)', async ({ page }) => {
  await addNote(page, 'Buy milk', '2 litres')

  await page.reload()

  await expect(page.getByTestId('note-title')).toHaveText(['Buy milk'])
  await expect(page.getByText('2 litres')).toBeVisible()
})

test('reports an empty title instead of creating a note (FR-003)', async ({ page }) => {
  await page.getByRole('button', { name: 'Add note' }).click()

  await expect(page.getByRole('alert')).toHaveText('Title is required')
  await expect(page.getByTestId('note-card')).toHaveCount(0)
})

test('filters notes through the URL query (FR-002, FR-008)', async ({ page }) => {
  await addNote(page, 'Shopping')
  await addNote(page, 'Standup')

  await page.getByLabel('Search').fill('shop')

  await expect(titles(page)).toHaveText(['Shopping'])
  await expect(page).toHaveURL(/\?q=shop/)

  // The query lives in the URL, so it survives a reload.
  await page.reload()
  await expect(titles(page)).toHaveText(['Shopping'])
})

test('pins a note above the rest (FR-004)', async ({ page }) => {
  await addNote(page, 'Older')
  await addNote(page, 'Newer')

  await expect(titles(page)).toHaveText(['Newer', 'Older'])

  await page.getByRole('button', { name: 'Pin Older' }).click()

  await expect(titles(page)).toHaveText(['Older', 'Newer'])
  await expect(page.getByText('Pinned')).toBeVisible()
})

test('deletes a note only after the confirmation is accepted (FR-005)', async ({ page }) => {
  await addNote(page, 'Disposable')

  page.once('dialog', (dialog) => void dialog.dismiss())
  await page.getByRole('button', { name: 'Delete Disposable' }).click()
  await expect(titles(page)).toHaveText(['Disposable'])

  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Delete Disposable' }).click()
  await expect(page.getByText('No notes yet.')).toBeVisible()
})
