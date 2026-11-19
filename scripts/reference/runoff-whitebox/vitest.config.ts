import { defineConfig } from 'vitest/config'

// Dev scripts for the runoff ↔ WhiteboxTools reference (IT-7). Run through Vitest, like the
// curated-asset builds in scripts/site-assets, purely so they can import the app's own TypeScript
// with no new dependency. Never part of `npm run test` (the root config only includes src/**).
//   npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts export
//   npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts compare
//   npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts crop
//   npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts tolerance
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/reference/runoff-whitebox/{export,compare,crop,tolerance,diagnose,textbookFill}.ts'],
    testTimeout: 600_000,
    fileParallelism: false,
    hookTimeout: 600_000,
  },
})
