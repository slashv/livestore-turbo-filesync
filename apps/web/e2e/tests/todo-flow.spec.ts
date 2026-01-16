import { expect, test } from '@playwright/test'

// Use a unique user for fresh state
const testUser = {
  email: 'e2e-test@example.com',
  password: 'password123',
  name: 'E2E Test User',
}

const API_URL = 'http://localhost:8787'

test.describe('Todo App E2E', () => {
  test.beforeAll(async ({ request }) => {
    // Register the test user before running tests (will return 409 if already exists)
    await request.post(`${API_URL}/api/register`, {
      data: testUser,
    })
  })

  test.beforeEach(async ({ page }) => {
    // Clear any existing session/storage for fresh state
    await page.context().clearCookies()
    await page.goto('/')
  })

  test('complete todo flow: login, create, complete, delete', async ({ page }) => {
    // Step 1: Login
    await expect(page.getByTestId('email-input')).toBeVisible()
    await page.getByTestId('email-input').fill(testUser.email)
    await page.getByTestId('password-input').fill(testUser.password)
    await page.getByTestId('login-button').click()

    // Wait for login to complete - should see todo input
    await expect(page.getByTestId('todo-input')).toBeVisible({ timeout: 15000 })

    // Step 2: Create a todo
    const todoText = `Test todo ${Date.now()}`
    await page.getByTestId('todo-input').fill(todoText)
    await page.getByTestId('todo-input').press('Enter')

    // Verify todo appears in list
    await expect(page.getByText(todoText)).toBeVisible({ timeout: 5000 })

    // Step 3: Mark todo as complete
    // Find the checkbox for our todo (by finding the todo item containing our text)
    const todoItem = page.locator('[data-testid^="todo-item-"]', { hasText: todoText })
    const checkbox = todoItem.locator('[data-testid^="todo-checkbox-"]')
    await checkbox.click()

    // Verify todo shows as completed (has line-through style)
    const todoTextEl = todoItem.locator('[data-testid^="todo-text-"]')
    await expect(todoTextEl).toHaveClass(/line-through/)

    // Step 4: Delete the todo
    const deleteButton = todoItem.locator('[data-testid^="todo-delete-"]')
    await deleteButton.click()

    // Verify todo is removed
    await expect(page.getByText(todoText)).not.toBeVisible({ timeout: 5000 })
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByTestId('email-input').fill('wrong@example.com')
    await page.getByTestId('password-input').fill('wrongpassword')
    await page.getByTestId('login-button').click()

    // Should show error message
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 10000 })
  })
})
