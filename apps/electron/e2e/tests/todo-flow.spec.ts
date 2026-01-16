import {
  test,
  expect,
  _electron as electron,
  request,
  type ElectronApplication,
  type Page,
} from '@playwright/test'
import { resolve } from 'node:path'

const testUser = {
  email: 'e2e-electron-test@example.com',
  password: 'password123',
  name: 'E2E Electron Test User',
}

const API_URL = 'http://localhost:8787'

test.describe
  .serial('Electron Todo App E2E', () => {
    let electronApp: ElectronApplication
    let window: Page

    test.beforeAll(async () => {
      // Register the test user before running tests (will return 409 if already exists)
      const context = await request.newContext()
      await context.post(`${API_URL}/api/register`, {
        data: testUser,
      })
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

    test('shows error for invalid credentials', async () => {
      // First test - check error handling for invalid credentials
      await expect(window.getByTestId('email-input')).toBeVisible({ timeout: 15000 })

      await window.getByTestId('email-input').fill('wrong@example.com')
      await window.getByTestId('password-input').fill('wrongpassword')
      await window.getByTestId('login-button').click()

      // Should show error message
      await expect(window.getByTestId('login-error')).toBeVisible({ timeout: 10000 })

      // Clear the form for next test
      await window.getByTestId('email-input').clear()
      await window.getByTestId('password-input').clear()
    })

    test('complete todo flow: login, create, complete, delete', async () => {
      // Step 1: Login with valid credentials
      await expect(window.getByTestId('email-input')).toBeVisible({ timeout: 15000 })
      await window.getByTestId('email-input').fill(testUser.email)
      await window.getByTestId('password-input').fill(testUser.password)
      await window.getByTestId('login-button').click()

      // Wait for login to complete
      await expect(window.getByTestId('todo-input')).toBeVisible({ timeout: 15000 })

      // Step 2: Create a todo
      const todoText = `Electron test todo ${Date.now()}`
      await window.getByTestId('todo-input').fill(todoText)
      await window.getByTestId('todo-input').press('Enter')

      // Verify todo appears
      await expect(window.getByText(todoText)).toBeVisible({ timeout: 5000 })

      // Step 3: Mark todo as complete
      const todoItem = window.locator('[data-testid^="todo-item-"]', { hasText: todoText })
      const checkbox = todoItem.locator('[data-testid^="todo-checkbox-"]')
      await checkbox.click()

      // Verify completed style
      const todoTextEl = todoItem.locator('[data-testid^="todo-text-"]')
      await expect(todoTextEl).toHaveClass(/line-through/)

      // Step 4: Delete the todo
      const deleteButton = todoItem.locator('[data-testid^="todo-delete-"]')
      await deleteButton.click()

      // Verify removed
      await expect(window.getByText(todoText)).not.toBeVisible({ timeout: 5000 })
    })
  })
