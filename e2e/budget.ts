/**
 * Time budgets for the e2e suite, sized to the machine.
 *
 * A GitHub-hosted runner for a private repository has two cores and no GPU, and software-renders
 * the studio's continuous WebGL loop. Measured per test against a 4-core container on 2026-11-13,
 * runners were 2.2× slower on one run and 4–5× on the next (Tab order: 21 s, 49 s, 108 s), so the
 * budget covers the slow end. Every budget — the config's defaults, each spec's own and the shared
 * helpers' — goes through `budget()`. Only budgets scale; assertions never do.
 */
export const SLOWDOWN = process.env.CI ? 4 : 1

export function budget(ms: number): number {
  return Math.round(ms * SLOWDOWN)
}
