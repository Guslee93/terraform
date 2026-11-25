/**
 * Throwaway benchmark: the app's own D2Q9 solver (src/features/analysis/lbm.ts, unchanged) on the
 * textbook case of laminar flow past a square cylinder. It checks the numerics, not urban wind:
 * the app runs at lattice Re ~ 30-60, real buildings at Re ~ 1e6-1e7.
 *
 * Run: npx vitest run --config feasibility/scratch/vitest.config.ts
 * Writes feasibility/scratch/evidence/wind-bench.json.
 */
import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { createLbm, stepLbm, velocityField } from '../../src/features/analysis/lbm'

type Case = { re: number; d: number; nx: number; ny: number; steps: number; sampleFrom: number }

function run(c: Case) {
  const u0 = 0.1
  const nu = (u0 * c.d) / c.re
  const tau = 3 * nu + 0.5
  const solid = new Uint8Array(c.nx * c.ny)
  const x0 = Math.round(c.nx / 4)
  const y0 = Math.round(c.ny / 2 - c.d / 2) + 1 // one cell off-centre: a seed for shedding
  for (let y = y0; y < y0 + c.d; y++) for (let x = x0; x < x0 + c.d; x++) solid[y * c.nx + x] = 1
  const s = createLbm(c.nx, c.ny, solid, u0, tau)
  const probe = (y0 + c.d / 2) * c.nx + x0 + 3 * c.d // 2 D behind the rear face, on the axis
  const series: number[] = []
  const t0 = performance.now()
  for (let t = 0; t < c.steps; t += 10) {
    stepLbm(s, 10)
    if (t >= c.sampleFrom) series.push(velocityField(s)[2 * probe + 1]!)
  }
  const ms = performance.now() - t0
  // Shedding: cross-stream velocity oscillates. Frequency from upward zero crossings.
  const mean = series.reduce((a, b) => a + b, 0) / series.length
  const amp = Math.max(...series.map((v) => Math.abs(v - mean)))
  const ups: number[] = []
  for (let i = 1; i < series.length; i++) if (series[i - 1]! < mean && series[i]! >= mean) ups.push(i * 10)
  const period = ups.length > 2 ? (ups[ups.length - 1]! - ups[0]!) / (ups.length - 1) : null
  const strouhal = period && amp > 0.01 ? c.d / (period * u0) : null
  // Recirculation length (steady cases): first cell on the axis behind the body where ux > 0.
  const v = velocityField(s)
  const row = (y0 + c.d / 2) * c.nx
  let lr: number | null = null
  for (let x = x0 + c.d; x < c.nx; x++) if (v[2 * (row + x)]! > 0) { lr = (x - (x0 + c.d)) / c.d; break }
  return { ...c, tau: +tau.toFixed(4), blockage: +(c.d / c.ny).toFixed(3), crossStreamAmplitude: +amp.toFixed(4),
    shedding: amp > 0.01, strouhal: strouhal && +strouhal.toFixed(4), recirculationLengthOverD: lr,
    cellSteps: c.nx * c.ny * c.steps, ms: Math.round(ms), mCellStepsPerS: +((c.nx * c.ny * c.steps) / ms / 1000).toFixed(1) }
}

it('square cylinder benchmark', () => {
  const cases: Case[] = [
    { re: 30, d: 10, nx: 300, ny: 120, steps: 20000, sampleFrom: 14000 },
    { re: 30, d: 20, nx: 600, ny: 240, steps: 30000, sampleFrom: 24000 },
    { re: 45, d: 16, nx: 400, ny: 192, steps: 40000, sampleFrom: 30000 },
    { re: 70, d: 16, nx: 400, ny: 192, steps: 40000, sampleFrom: 30000 },
    { re: 100, d: 16, nx: 400, ny: 192, steps: 40000, sampleFrom: 30000 },
  ]
  const results = cases.map(run)
  console.table(results)
  writeFileSync(new URL('./evidence/wind-bench.json', import.meta.url), JSON.stringify({ runUtc: new Date().toISOString(), results }, null, 1))
}, 1_800_000)
