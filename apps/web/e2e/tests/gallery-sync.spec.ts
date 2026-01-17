import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const testImagePath = path.join(__dirname, '../fixtures/test-image.png')

const testRunId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
const testUser = {
  email: `e2e-gallery-${testRunId}@test.local`,
  password: 'password123',
  name: 'E2E Gallery User',
}

const API_URL = 'http://localhost:8787'

test.describe('Gallery Sync E2E', () => {
  test.beforeAll(async ({ request }) => {
    await request.post(`${API_URL}/api/register`, { data: testUser })
  })

  test('upload image and verify it appears', async ({ page }) => {
    // Capture console logs for debugging
    const logs: string[] = []
    page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`))
    page.on('pageerror', (err) => logs.push(`[error] ${err.message}`))

    await page.goto('/')
    await page.getByTestId('email-input').fill(testUser.email)
    await page.getByTestId('password-input').fill(testUser.password)
    await page.getByTestId('login-button').click()

    await expect(page.getByTestId('gallery')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('empty-state')).toBeVisible()

    // Wait a bit for FileSync to initialize
    await page.waitForTimeout(1000)

    // Log console output for debugging
    console.log(
      'Logs before upload:',
      logs.filter(
        (l) => l.includes('FileSyncProvider') || l.includes('[Gallery]') || l.includes('error')
      )
    )

    // Upload image
    await page.getByTestId('file-input').setInputFiles(testImagePath)

    // Wait a bit for any async operations
    await page.waitForTimeout(3000)

    // Log console output for debugging
    console.log(
      'Console logs:',
      logs.filter(
        (l) => l.includes('[Gallery]') || l.includes('error') || l.includes('FileSyncProvider')
      )
    )

    // Verify image appears
    await expect(page.locator('[data-testid^="image-card-"]')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('empty-state')).not.toBeVisible()
  })

  test('sync image between two browser instances', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    // Login on both
    for (const page of [page1, page2]) {
      await page.goto('/')
      await page.getByTestId('email-input').fill(testUser.email)
      await page.getByTestId('password-input').fill(testUser.password)
      await page.getByTestId('login-button').click()
      await expect(page.getByTestId('gallery')).toBeVisible({ timeout: 15000 })
    }

    // Upload image on page1
    await page1.getByTestId('file-input').setInputFiles(testImagePath)
    await expect(page1.locator('[data-testid^="image-card-"]')).toBeVisible({ timeout: 15000 })

    // Verify image syncs to page2
    await expect(page2.locator('[data-testid^="image-card-"]')).toBeVisible({ timeout: 30000 })

    await context1.close()
    await context2.close()
  })

  test('edit title syncs between browsers', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    // Login on both
    for (const page of [page1, page2]) {
      await page.goto('/')
      await page.getByTestId('email-input').fill(testUser.email)
      await page.getByTestId('password-input').fill(testUser.password)
      await page.getByTestId('login-button').click()
      await expect(page.getByTestId('gallery')).toBeVisible({ timeout: 15000 })
    }

    // Upload an image on page1 first
    await page1.getByTestId('file-input').setInputFiles(testImagePath)
    await expect(page1.locator('[data-testid^="image-card-"]').first()).toBeVisible({
      timeout: 15000,
    })

    // Wait for the image to sync to page2
    await expect(page2.locator('[data-testid^="image-card-"]').first()).toBeVisible({
      timeout: 30000,
    })

    // Edit title on page1
    const titleElement = page1.locator('[data-testid^="title-"]').first()
    await titleElement.click()

    const newTitle = `Edited-${Date.now()}`
    await page1.locator('[data-testid^="title-input-"]').fill(newTitle)
    await page1.locator('[data-testid^="title-input-"]').press('Enter')

    // Verify title syncs to page2
    await expect(page2.locator('[data-testid^="title-"]').first()).toHaveText(newTitle, {
      timeout: 15000,
    })

    await context1.close()
    await context2.close()
  })
})
