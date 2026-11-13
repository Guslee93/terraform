/**
 * Time budgets for the e2e suite, sized to the machine.
 *
 * A GitHub-hosted runner for a private repository has two cores and no GPU, and draws the studio
 * about 2.2× slower than a 4-core workstation (measured per test, 2026-11-13). Every budget —
 * the config's defaults and each spec's own — goes through `budget()`, so a spec's explicit
 * timeout scales with the machine too. Only budgets scale; assertions never do.
 */
export const SLOWDOWN = process.env.CI ? 2.5 : 1

export function budget(ms: number): number {
  return Math.round(ms * SLOWDOWN)
}
