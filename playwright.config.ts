import { defineConfig, devices } from '@playwright/test'
import { budget } from './e2e/budget'

const CI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  // Scaled to the machine (e2e/budget.ts): the CI runner draws the studio far slower than a
  // workstation. Specs route their own budgets through budget() too. Assertions never scale.
  timeout: budget(30_000),
  expect: { timeout: budget(5_000) },
  reporter: 'list',
  // One browser at a time. The studio draws the full city context (520 buildings, 935 trees on
  // Compact Infill), and headless Chromium has no GPU, so Chromium rasterises it in software at a
  // few frames per second. Two concurrent browsers starve each other and the suite fails on
  // timeouts that are not product defects — every spec passes when run alone.
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',

  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI tests the production build it has just verified (`dist/`, served by `vite preview`):
    // it is what Vercel deploys, and it loads much faster than the dev server's unbundled modules.
    command: CI
      ? 'npm run preview -- --host 127.0.0.1 --port 5173 --strictPort'
      : 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
})
