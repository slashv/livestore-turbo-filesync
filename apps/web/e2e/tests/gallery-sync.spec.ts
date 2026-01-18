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

  test('upload image and verify it appears with correct status indicators', async ({ page }) => {
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

    // Image card should appear (may initially show uploading status)
    const imageCard = page.locator('[data-testid^="image-card-"]').first()
    await expect(imageCard).toBeVisible({ timeout: 15000 })

    // Verify sync status transitions to 'synced' (upload completes)
    await expect(imageCard).toHaveAttribute('data-sync-status', 'synced', { timeout: 30000 })

    // Verify the actual image element is visible (not the placeholder)
    // The image element has data-testid="image-{id}" (exact pattern, not image-card or image-type)
    const imageElement = page.locator('img[data-testid^="image-"]').first()
    await expect(imageElement).toBeVisible({ timeout: 30000 })

    // Verify image type indicator is present (should show 'Original' initially, then 'Thumbnail' when generated)
    const imageTypeIndicator = page.locator('[data-testid^="image-type-"]').first()
    await expect(imageTypeIndicator).toBeVisible({ timeout: 15000 })
    // Should eventually show 'Thumbnail' once thumbnail is generated
    await expect(imageTypeIndicator).toHaveText('Thumbnail', { timeout: 30000 })

    // Log console output for debugging
    console.log(
      'Console logs:',
      logs.filter(
        (l) => l.includes('[Gallery]') || l.includes('error') || l.includes('FileSyncProvider')
      )
    )

    // Verify empty state is hidden
    await expect(page.getByTestId('empty-state')).not.toBeVisible()
  })

  test('sync image between two browser instances with status indicators', async ({ browser }) => {
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

    // Verify image appears on page1 with uploading/synced status
    const imageCard1 = page1.locator('[data-testid^="image-card-"]').first()
    await expect(imageCard1).toBeVisible({ timeout: 15000 })

    // Wait for upload to complete on page1
    await expect(imageCard1).toHaveAttribute('data-sync-status', 'synced', { timeout: 30000 })

    // Verify the actual image element is visible on page1 (not the placeholder)
    const image1 = page1.locator('img[data-testid^="image-"]').first()
    await expect(image1).toBeVisible({ timeout: 30000 })

    // Verify image syncs to page2 - should show downloading status initially
    const imageCard2 = page2.locator('[data-testid^="image-card-"]').first()
    await expect(imageCard2).toBeVisible({ timeout: 30000 })

    // Page2 should eventually show synced status after download completes
    await expect(imageCard2).toHaveAttribute('data-sync-status', 'synced', { timeout: 30000 })

    // Verify the actual image element is visible on page2 (this ensures download completed and URL works)
    const image2 = page2.locator('img[data-testid^="image-"]').first()
    await expect(image2).toBeVisible({ timeout: 30000 })

    // Both pages should eventually show thumbnail (once generated)
    const imageType1 = page1.locator('[data-testid^="image-type-"]').first()
    const imageType2 = page2.locator('[data-testid^="image-type-"]').first()
    await expect(imageType1).toHaveText('Thumbnail', { timeout: 30000 })
    await expect(imageType2).toHaveText('Thumbnail', { timeout: 30000 })

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

    // Wait for image card to appear and sync to complete
    const imageCard1 = page1.locator('[data-testid^="image-card-"]').first()
    await expect(imageCard1).toBeVisible({ timeout: 15000 })
    await expect(imageCard1).toHaveAttribute('data-sync-status', 'synced', { timeout: 30000 })

    // Wait for the image to sync to page2 and download to complete
    const imageCard2 = page2.locator('[data-testid^="image-card-"]').first()
    await expect(imageCard2).toBeVisible({ timeout: 30000 })
    await expect(imageCard2).toHaveAttribute('data-sync-status', 'synced', { timeout: 30000 })

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
