import { expect, test } from '@playwright/test'
import { openAnalysis } from './studio-helpers'

// Wind performance probe (docs/plans/wind-finish-plan.md E1/E2). Opt-in:
//   WIND_PERF=1 npx playwright test e2e/wind-perf.spec.ts
// Headless Chromium renders WebGL in software, so these numbers are a pessimistic floor for a
// laptop GPU. Reports frames per second and main-thread long tasks (> 50 ms) over 5 s.
test.skip(process.env.WIND_PERF !== '1', 'Opt-in: WIND_PERF=1')
test.use({ viewport: { width: 1440, height: 900 } })
test.setTimeout(180_000)

const probe = () => new Promise<{ fps: number; longTasks: number; worstMs: number }>((resolve) => {
  let frames = 0
  const long: number[] = []
  const obs = new PerformanceObserver((list) => { for (const e of list.getEntries()) long.push(e.duration) })
  obs.observe({ type: 'longtask', buffered: false })
  const start = performance.now()
  const tick = () => {
    frames++
    if (performance.now() - start < 5000) requestAnimationFrame(tick)
    else { obs.disconnect(); resolve({ fps: frames / ((performance.now() - start) / 1000), longTasks: long.length, worstMs: Math.max(0, ...long) }) }
  }
  requestAnimationFrame(tick)
})

for (const mode of ['off', 'particles', '3d-streamlines'] as const) {
  test(`frame rate — Compact Infill, wind ${mode}`, async ({ page }) => {
    await page.goto('/studio/compact-infill')
    await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()
    if (mode !== 'off') {
      await openAnalysis(page, 'Wind')
      if (mode === '3d-streamlines') await page.getByRole('checkbox', { name: 'Streamlines' }).check()
      await expect(page.getByLabel(/Streamline height/i)).toBeEnabled({ timeout: 120_000 })
    }
    await page.waitForTimeout(1500)
    const result = await page.evaluate(probe)
    console.log(`PERF ${mode}: ${result.fps.toFixed(1)} fps, ${result.longTasks} long tasks, worst ${result.worstMs.toFixed(0)} ms`)
    expect(result.fps).toBeGreaterThan(5) // sanity floor for software GL; real budget is ≥ 30 fps on a GPU
  })
}
