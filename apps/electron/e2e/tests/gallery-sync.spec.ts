import { resolve } from 'node:path'
import {
  type ElectronApplication,
  type Page,
  _electron as electron,
  expect,
  request,
  test,
} from '@playwright/test'

// Generate unique user per test run to ensure clean state
const testRunId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
const testUser = {
  email: `e2e-electron-gallery-${testRunId}@test.local`,
  password: 'password123',
  name: 'E2E Electron Gallery User',
}

const API_URL = 'http://localhost:8787'
const testImagePath = resolve(__dirname, '../fixtures/test-image.png')

test.describe
  .serial('Electron Gallery Sync E2E', () => {
    let electronApp: ElectronApplication
    let window: Page

    test.beforeAll(async () => {
      // Register a fresh unique user for this test run
      const context = await request.newContext()
      const response = await context.post(`${API_URL}/api/register`, {
        data: testUser,
      })
      expect(response.ok()).toBe(true)
      await context.dispose()

      // Launch Electron app from built output
      electronApp = await electron.launch({
        args: [resolve(__dirname, '../../dist/main/index.js')],
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
      })

      // Get the first window
      window = await electronApp.firstWindow()

      // Wait for app to be ready
      await window.waitForLoadState('domcontentloaded')

      // Clear any persisted auth state for fresh test
      await window.evaluate(() => {
        localStorage.removeItem('livestore-auth-token')
        localStorage.removeItem('livestore-auth-user')
      })

      // Reload to apply cleared state
      await window.reload()
      await window.waitForLoadState('domcontentloaded')
    })

    test.afterAll(async () => {
      if (electronApp) {
        // Force kill the electron process to avoid hanging
        const pid = electronApp.process().pid
        if (pid) {
          try {
            process.kill(pid, 'SIGKILL')
          } catch {
            // Process may already be dead
          }
        }
      }
    })

    test('upload image and verify it appears', async () => {
      // Step 1: Login with valid credentials
      await expect(window.getByTestId('email-input')).toBeVisible({ timeout: 15000 })
      await window.getByTestId('email-input').fill(testUser.email)
      await window.getByTestId('password-input').fill(testUser.password)
      await window.getByTestId('login-button').click()

      // Step 2: Verify we're on the gallery
      await expect(window.getByTestId('gallery')).toBeVisible({ timeout: 15000 })
      await expect(window.getByTestId('empty-state')).toBeVisible()

      // Wait a bit for FileSync to initialize
      await window.waitForTimeout(1000)

      // Step 3: Upload image
      await window.getByTestId('file-input').setInputFiles(testImagePath)

      // Step 4: Verify image appears
      await expect(window.locator('[data-testid^="image-card-"]')).toBeVisible({ timeout: 15000 })
      await expect(window.getByTestId('empty-state')).not.toBeVisible()
    })

    test('edit title and verify update', async () => {
      // Should already be logged in from previous test
      await expect(window.getByTestId('gallery')).toBeVisible({ timeout: 15000 })

      // Wait for any existing image cards
      await expect(window.locator('[data-testid^="image-card-"]').first()).toBeVisible({
        timeout: 15000,
      })

      // Click on the title to edit
      const titleElement = window.locator('[data-testid^="title-"]').first()
      await titleElement.click()

      // Edit the title
      const newTitle = `Edited-${Date.now()}`
      await window.locator('[data-testid^="title-input-"]').fill(newTitle)
      await window.locator('[data-testid^="title-input-"]').press('Enter')

      // Verify title updated
      await expect(window.locator('[data-testid^="title-"]').first()).toHaveText(newTitle, {
        timeout: 5000,
      })
    })

    test('delete image', async () => {
      // Should already be logged in from previous test
      await expect(window.getByTestId('gallery')).toBeVisible({ timeout: 15000 })

      // Get initial count of image cards
      const initialCount = await window.locator('[data-testid^="image-card-"]').count()
      expect(initialCount).toBeGreaterThan(0)

      // Click delete on the first image
      await window.locator('[data-testid^="delete-button-"]').first().click()

      // Verify image is removed (either count decreases or empty state shows)
      if (initialCount === 1) {
        await expect(window.getByTestId('empty-state')).toBeVisible({ timeout: 5000 })
      } else {
        await expect(window.locator('[data-testid^="image-card-"]')).toHaveCount(initialCount - 1, {
          timeout: 5000,
        })
      }
    })
  })
