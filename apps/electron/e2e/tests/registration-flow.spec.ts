import { resolve } from 'node:path'
import {
  type ElectronApplication,
  type Page,
  _electron as electron,
  expect,
  test,
} from '@playwright/test'

// Generate unique user per test run to ensure clean state
const testRunId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
const testUser = {
  email: `e2e-electron-reg-${testRunId}@test.local`,
  password: 'password123',
  name: 'E2E Electron Registration User',
}

test.describe
  .serial('Electron Registration Flow E2E', () => {
    let electronApp: ElectronApplication
    let window: Page

    test.beforeAll(async () => {
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

    test('complete registration flow: sign up, verify logged in, create todo', async () => {
      // Step 1: Verify we're on the login screen
      await expect(window.getByTestId('email-input')).toBeVisible({ timeout: 15000 })
      await expect(window.getByRole('heading', { name: 'Sign In' })).toBeVisible()

      // Step 2: Toggle to registration mode
      await window.getByTestId('toggle-auth-mode').click()

      // Verify we're now in registration mode
      await expect(window.getByRole('heading', { name: 'Create Account' })).toBeVisible()
      await expect(window.getByTestId('name-input')).toBeVisible()

      // Step 3: Fill out registration form
      await window.getByTestId('name-input').fill(testUser.name)
      await window.getByTestId('email-input').fill(testUser.email)
      await window.getByTestId('password-input').fill(testUser.password)

      // Step 4: Submit registration
      await window.getByTestId('register-button').click()

      // Step 5: Verify we're logged in (should see todo input)
      await expect(window.getByTestId('todo-input')).toBeVisible({ timeout: 15000 })

      // Delete the default "Welcome to livestore" todo first
      const welcomeTodo = window.locator('[data-testid^="todo-item-"]', {
        hasText: 'Welcome to livestore',
      })
      if (await welcomeTodo.isVisible()) {
        await welcomeTodo.locator('[data-testid^="todo-delete-"]').click()
        await expect(welcomeTodo).not.toBeVisible({ timeout: 3000 })
      }

      // Step 6: Create a todo to verify full functionality
      const todoText = 'E2E Registration Test Todo'
      await window.getByTestId('todo-input').fill(todoText)
      await window.getByTestId('todo-input').press('Enter')

      // Verify todo appears in list
      await expect(window.getByText(todoText)).toBeVisible({ timeout: 5000 })

      // Clean up - delete the todo
      const todoItem = window.locator('[data-testid^="todo-item-"]', { hasText: todoText })
      const deleteButton = todoItem.locator('[data-testid^="todo-delete-"]')
      await deleteButton.click()
      await expect(window.getByText(todoText)).not.toBeVisible({ timeout: 5000 })
    })
  })
