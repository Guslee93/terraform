import { defineConfig } from 'vitest/config'

// Build steps for curated site assets, run through Vitest so they can import the app's own
// TypeScript (roof fit, projection) with no new dependency (ADR-0033). Never part of `npm run test`.
//   npx vitest run --config scripts/site-assets/vitest.config.ts heights
export default defineConfig({
  test: { environment: 'node', include: ['scripts/site-assets/**/*.build.ts'], testTimeout: 600_000, fileParallelism: false },
})
