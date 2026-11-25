import { defineConfig } from 'vitest/config'

// Scratch-only config: node environment, scratch tests only; never picked up by `npm run test`.
export default defineConfig({
  test: { environment: 'node', include: ['feasibility/scratch/**/*.test.ts'], testTimeout: 1_800_000 },
})
