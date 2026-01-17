import { expect, test } from '@playwright/test'

// Generate unique user per test run to ensure clean state
const testRunId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
const testUser = {
  email: `e2e-web-reg-${testRunId}@test.local`,
  password: 'password123',
  name: 'E2E Web Registration User',
}

// API URL for direct server requests (defaults to localhost for local testing)
const apiBaseUrl = process.env.TEST_API_URL ?? 'http://localhost:8787'

test.describe('Registration Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session/storage for fresh state
    await page.context().clearCookies()
    await page.goto('/')
  })

  test('complete registration flow: sign up, verify logged in, create todo', async ({ page }) => {
    // Step 1: Navigate to registration form
    await expect(page.getByTestId('email-input')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()

    // Click toggle to switch to registration mode
    await page.getByTestId('toggle-auth-mode').click()

    // Verify we're now in registration mode
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()
    await expect(page.getByTestId('name-input')).toBeVisible()

    // Step 2: Fill out registration form
    await page.getByTestId('name-input').fill(testUser.name)
    await page.getByTestId('email-input').fill(testUser.email)
    await page.getByTestId('password-input').fill(testUser.password)

    // Step 3: Submit registration
    await page.getByTestId('register-button').click()

    // Step 4: Verify we're logged in (should see todo input)
    await expect(page.getByTestId('todo-input')).toBeVisible({ timeout: 15000 })

    // Delete the default "Welcome to livestore" todo first
    const welcomeTodo = page.locator('[data-testid^="todo-item-"]', {
      hasText: 'Welcome to livestore',
    })
    if (await welcomeTodo.isVisible()) {
      await welcomeTodo.locator('[data-testid^="todo-delete-"]').click()
      await expect(welcomeTodo).not.toBeVisible({ timeout: 3000 })
    }

    // Step 5: Create a todo to verify full functionality
    const todoText = 'E2E Registration Test Todo'
    await page.getByTestId('todo-input').fill(todoText)
    await page.getByTestId('todo-input').press('Enter')

    // Verify todo appears in list
    await expect(page.getByText(todoText)).toBeVisible({ timeout: 5000 })

    // Clean up - delete the todo
    const todoItem = page.locator('[data-testid^="todo-item-"]', { hasText: todoText })
    const deleteButton = todoItem.locator('[data-testid^="todo-delete-"]')
    await deleteButton.click()
    await expect(page.getByText(todoText)).not.toBeVisible({ timeout: 5000 })
  })

  test('shows error for duplicate email registration', async ({ page, request }) => {
    // First, register a user via API
    const existingUser = {
      email: `e2e-web-dup-${testRunId}@test.local`,
      password: 'password123',
      name: 'Duplicate Test User',
    }
    await request.post(`${apiBaseUrl}/api/register`, { data: existingUser })

    // Navigate to registration form
    await page.getByTestId('toggle-auth-mode').click()
    await expect(page.getByTestId('name-input')).toBeVisible()

    // Try to register with the same email
    await page.getByTestId('name-input').fill('Another User')
    await page.getByTestId('email-input').fill(existingUser.email)
    await page.getByTestId('password-input').fill('password456')
    await page.getByTestId('register-button').click()

    // Should see an error
    await expect(page.getByTestId('auth-error')).toBeVisible({ timeout: 5000 })
  })

  test('can toggle between login and registration modes', async ({ page }) => {
    // Start in login mode
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByTestId('login-button')).toBeVisible()
    await expect(page.getByTestId('name-input')).not.toBeVisible()

    // Toggle to registration
    await page.getByTestId('toggle-auth-mode').click()
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()
    await expect(page.getByTestId('register-button')).toBeVisible()
    await expect(page.getByTestId('name-input')).toBeVisible()

    // Toggle back to login
    await page.getByTestId('toggle-auth-mode').click()
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByTestId('login-button')).toBeVisible()
    await expect(page.getByTestId('name-input')).not.toBeVisible()
  })
})
