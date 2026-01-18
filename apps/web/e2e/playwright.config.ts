import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../../..')
const webDir = path.resolve(rootDir, 'apps/web')
const serverDir = path.resolve(rootDir, 'apps/server')

// Allow overriding the base URL via environment variable for testing deployed versions
const baseURL = process.env.TEST_BASE_URL ?? 'http://localhost:5173'

// Skip webServer startup if TEST_BASE_URL is provided (useful for testing against deployed versions)
const skipWebServer = !!process.env.TEST_BASE_URL

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: skipWebServer
    ? undefined
    : process.env.CI
      ? [
          // In CI, only start the web dev server (backend is started separately in workflow)
          {
            command: 'pnpm dev',
            url: 'http://localhost:5173',
            cwd: webDir,
            reuseExistingServer: false,
            timeout: 120000,
          },
        ]
      : [
          // Locally, start both backend and frontend
          {
            command: 'pnpm db:migrate && pnpm dev',
            url: 'http://localhost:8787',
            cwd: serverDir,
            reuseExistingServer: true,
            timeout: 120000,
          },
          {
            command: 'pnpm dev',
            url: 'http://localhost:5173',
            cwd: webDir,
            reuseExistingServer: true,
            timeout: 120000,
          },
        ],
})
