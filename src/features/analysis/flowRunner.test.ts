import { describe, expect, it, vi } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { createFlowRunner, MAX_STEPS, type FlowRequest, type FlowResult } from './flowRunner'
import * as lbm from './lbm'
import type { FlowFrame } from './lbm'
import type { FootprintBuilding } from './grid'
import { profileFactor, sliceHeightsFor, sliceObstacles } from './windProfile'
import { flowAtHeight } from './climateView'
import { MessageChannel } from 'node:worker_threads'

function transfer(value: unknown, options: { transfer: ArrayBufferLike[] }) {
  const { port1, port2 } = new MessageChannel()
  port1.postMessage(value, options.transfer.map((buffer) => {
    if (!(buffer instanceof ArrayBuffer)) throw new Error('Expected transferable ArrayBuffer')
    return buffer
  }))
  port1.close()
  port2.close()
}
import { flowFrame, sampleVelocity } from './lbm'

const square = (x0: number, x1: number, y0: number, y1: number): Vec2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const area = square(-100, 100, -100, 100)
const tower = { height: 40, footprint: square(-10, 10, -10, 10) }
const speedAt = (downwash: boolean, p: Vec2) => {
  const runner = createFlowRunner()
  const frame = flowFrame(area, 270, 64, 64)
  runner.request({ id: 1, frame, buildings: [tower], reset: true, downwash })
  const r = runner.tick(0)!
  const v = sampleVelocity(r.frame, r.velocity, r.solid, p)!
  return Math.hypot(v[0], v[1])
}

describe('flow runner', () => {
  it('applies the downwash boost on the upwind face of a 40 m tower only when asked', () => {
    const upwind: Vec2 = [-16, 0]
    expect(speedAt(true, upwind)).toBeGreaterThan(speedAt(false, upwind) * 1.05)
    const lee: Vec2 = [20, 0]
    expect(speedAt(true, lee)).toBeCloseTo(speedAt(false, lee), 6)
  })
  it('reports settled only after the step budget', () => {
    const runner = createFlowRunner()
    runner.request({ id: 7, frame: flowFrame(area, 0, 16, 16), buildings: [], reset: true })
    const first = runner.tick(0)!
    expect(first.id).toBe(7)
    expect(first.settled).toBe(false)
  })
})

describe('height slice stack', () => {
  const frame: FlowFrame = { nx: 24, ny: 24, dx: 4, centre: [0, 0], flow: [1, 0] }
  const block = { height: 15, footprint: square(-8, 8, -8, 8) }
  const request: FlowRequest = { id: 1, frame, buildings: [block], reset: true, slices: true }
  const finish = (runner: ReturnType<typeof createFlowRunner>) => {
    let result: FlowResult | null = null
    while (runner.hasPendingWork()) result = runner.tick(Infinity)
    return result!
  }

  it('solves successive fresh slices, with faster wind above a low block than in its wake', () => {
    const step = vi.spyOn(lbm, 'stepLbm')
    const create = vi.spyOn(lbm, 'createLbm')
    const runner = createFlowRunner()
    runner.request(request)
    const ground = runner.tick(Infinity)!
    expect(ground.settled).toBe(true)
    expect(ground.slices?.map((s) => s.z)).toEqual([2])
    expect(ground.slicesComplete).toBe(false)
    expect(runner.hasPendingWork()).toBe(true)
    expect(create).toHaveBeenCalledTimes(1)
    const result = finish(runner)
    // ADR-0029: one solve at 2 m and one where the 15 m roof ends; nothing else changes the obstacles.
    expect(create).toHaveBeenCalledTimes(2)
    expect(step.mock.calls.reduce((sum, call) => sum + call[1]!, 0)).toBeLessThan(MAX_STEPS * 2)
    expect(result.slices?.map((s) => s.z)).toEqual([2, 15])
    expect(result.liftTopM).toBe(30)
    expect(result.frame).toEqual(frame)
    // The slices are the fields as solved; the downwash rule (off here) only ever touches `velocity`.
    expect(result.slices![0]!.velocity).toEqual(result.velocity)
    // Any metre: below the roof the block still blocks, at and above it the flow passes over.
    const ten = flowAtHeight(result, 10)!, twenty = flowAtHeight(result, 20)!
    expect(ten.solid[12 * 24 + 12]).toBe(1)
    expect(twenty.solid[12 * 24 + 12]).toBe(0)
    const wake = sampleVelocity(frame, result.velocity, result.solid, [16, 0])!
    const above = sampleVelocity(frame, twenty.velocity, twenty.solid, [16, 0])!
    expect(Math.hypot(...above)).toBeGreaterThan(Math.hypot(...wake))
    expect(Math.hypot(...above)).toBeCloseTo(profileFactor(20) / profileFactor(2), 2)
    expect(runner.tick(0)).toBeNull()
  })

  it('cancels a partially solved upper slice on a new request', () => {
    const runner = createFlowRunner()
    runner.request(request)
    runner.tick(Infinity)
    runner.tick(0)
    runner.request({ ...request, id: 2, slices: false, buildings: [] })
    const result = finish(runner)
    expect(result.id).toBe(2)
    expect(result.slices).toBeUndefined()
    expect(result.solid.some(Boolean)).toBe(false)
    const step = vi.spyOn(lbm, 'stepLbm')
    runner.request({ ...request, id: 3 })
    runner.tick(0)
    expect(step).toHaveBeenCalled() // Cancelled stack was never cached.
  })

  it('returns cached directions without stepping, even after outbound buffers are transferred', () => {
    const runner = createFlowRunner()
    runner.request(request)
    const original = finish(runner)
    const expected = original.velocity.slice()
    // Model the worker transfer: every returned buffer is detached on the sender side.
    transfer(original, { transfer: [original.velocity.buffer, original.solid.buffer,
      ...original.slices!.flatMap((s) => [s.velocity.buffer, s.solid.buffer])] })
    runner.request({ ...request, id: 2, frame: { ...frame, flow: [0, 1] } })
    finish(runner)
    const step = vi.spyOn(lbm, 'stepLbm')
    runner.request({ ...request, id: 3 })
    const cached = runner.tick(0)!
    expect(step).not.toHaveBeenCalled()
    expect(cached.id).toBe(3)
    expect(cached.velocity).toEqual(expected)
    expect(cached.slices).toHaveLength(original.slices!.length)
    expect(runner.hasPendingWork()).toBe(false)
  })

  it('keys geometry, height, centre, direction, cell size and grid dimensions', () => {
    const runner = createFlowRunner()
    runner.request(request)
    finish(runner)
    const step = vi.spyOn(lbm, 'stepLbm')
    const changes: FlowRequest[] = [
      { ...request, buildings: [{ ...block, height: 25 }] },
      { ...request, buildings: [{ ...block, footprint: square(-4, 8, -8, 8) }] },
      { ...request, frame: { ...frame, centre: [1, 0] } },
      { ...request, frame: { ...frame, flow: [0, 1] } },
      { ...request, frame: { ...frame, dx: 5 } },
      { ...request, frame: { ...frame, nx: 25 } },
    ]
    for (const change of changes) {
      step.mockClear()
      runner.request(change)
      runner.tick(0)
      expect(step).toHaveBeenCalled()
    }
  })

  it('keeps only eight entries and refreshes recency on a hit', () => {
    const runner = createFlowRunner()
    const at = (x: number): FlowRequest => ({ ...request, buildings: [], frame: { ...frame, nx: 8, ny: 8, centre: [x, 0] } })
    for (let i = 0; i < 8; i++) { runner.request(at(i)); finish(runner) }
    runner.request(at(0)); finish(runner)
    runner.request(at(8)); finish(runner)
    const step = vi.spyOn(lbm, 'stepLbm')
    runner.request(at(0)); runner.tick(0)
    expect(step).not.toHaveBeenCalled()
    runner.request(at(1)); runner.tick(0)
    expect(step).toHaveBeenCalled()
  })

  it('preserves the default mask and applies the 2 m cutoff only in slice mode', () => {
    const runner = createFlowRunner()
    runner.request({ ...request, slices: false, buildings: [{ ...block, height: 1 }] })
    expect(runner.tick(0)!.solid.some(Boolean)).toBe(true)
    runner.request({ ...request, buildings: [{ ...block, height: 1 }] })
    expect(runner.tick(0)!.solid.some(Boolean)).toBe(false)
  })
})

// Opt-in Node benchmark: WIND_BENCHMARK=1 npx vitest run src/features/analysis/flowRunner.test.ts -t benchmark --environment node
it.skipIf(!process.env.WIND_BENCHMARK)('benchmark Compact Infill 160², r=100 m, west wind', async () => {
  const { readFileSync } = await import('node:fs')
  const { buildings } = JSON.parse(readFileSync('public/sites/compact-infill/buildings.json', 'utf8')) as { buildings: FootprintBuilding[] }
  const runner = createFlowRunner()
  const frame: FlowFrame = { nx: 160, ny: 160, dx: 1.75, centre: [0, 0], flow: [1, 0] }
  const start = performance.now()
  runner.request({ id: 1, frame, buildings, reset: true, slices: true })
  const times: number[] = []
  while (runner.hasPendingWork()) {
    const before = performance.now()
    if (process.env.WIND_BENCHMARK === 'baseline') {
      const z = sliceHeightsFor(buildings)[times.length]!
      const solver = lbm.createLbm(160, 160, lbm.rasterize(frame, sliceObstacles(buildings, z)))
      lbm.stepLbm(solver, MAX_STEPS)
      lbm.velocityField(solver)
    } else runner.tick(Infinity)
    times.push(performance.now() - before)
  }
  process.stdout.write(JSON.stringify({ slicesMs: times, totalMs: performance.now() - start }) + "\n")
}, 120_000)

it('converges an empty domain in 250 steps, well before the hard cap', () => {
  const step = vi.spyOn(lbm, 'stepLbm')
  const runner = createFlowRunner()
  runner.request({ id: 1, frame: flowFrame(area, 270, 32, 32), buildings: [], reset: true })
  expect(runner.tick(Infinity)!.settled).toBe(true)
  expect(step.mock.calls.reduce((n, call) => n + call[1]!, 0)).toBe(250)
  expect(runner.hasPendingWork()).toBe(false)
})

it('returns progressive fine-grid slices in z order with a faster 10 m field above a low block', () => {
  const frame: FlowFrame = { nx: 160, ny: 160, dx: 1.75, centre: [0, 0], flow: [1, 0] }
  const create = vi.spyOn(lbm, 'createLbm')
  const runner = createFlowRunner()
  // Two roofs, at 8 m and 12.5 m: solves at 2, 8 and 13 m (ADR-0029).
  runner.request({ id: 1, frame, buildings: [{ height: 8, footprint: square(-10, 10, -10, 10) }, { height: 12.5, footprint: square(40, 50, -5, 5) }], reset: true, slices: true })
  let result: FlowResult | null = null
  const heights = [2, 8, 13]
  const last = heights.length - 1
  for (let i = 0; i <= last; i++) {
    result = runner.tick(Infinity)!
    expect(result.sliceHeights).toEqual(heights)
    expect(result.slices?.map((s) => s.z)).toEqual(heights.slice(0, i + 1))
    expect(result.slicesComplete).toBe(i === last)
    for (const slice of result.slices!) {
      expect(slice.velocity.length).toBe(160 * 160 * 2)
      expect(slice.solid.length).toBe(160 * 160)
      for (let j = 0; j < slice.solid.length; j++) if (slice.solid[j]) {
        expect(slice.velocity[2 * j]).toBe(0)
        expect(slice.velocity[2 * j + 1]).toBe(0)
      }
    }
  }
  expect(create.mock.calls.map(([nx, ny]) => [nx, ny])).toEqual([[160, 160], ...Array.from({ length: last }, () => [80, 80])])
  const ground = result!.slices!.find((s) => s.z === 2)!, ten = flowAtHeight(result!, 10)!
  expect(Math.hypot(...sampleVelocity(frame, ten.velocity, ten.solid, [25, 0])!))
    .toBeGreaterThan(Math.hypot(...sampleVelocity(frame, ground.velocity, ground.solid, [25, 0])!))
}, 20_000)

it('upsamples uniform fields and preserves coarse centres and fine solids', () => {
  const coarse: FlowFrame = { nx: 3, ny: 2, dx: 3, centre: [0, 0], flow: [1, 0] }
  const fine = { ...coarse, nx: 9, ny: 6, dx: 1 }
  const solid = new Uint8Array(54)
  const uniform = Float32Array.from({ length: 12 }, (_, i) => i % 2 ? -0.5 : 2)
  const out = lbm.upsampleVelocity(coarse, uniform, fine, solid)
  expect([...out]).toEqual(Array.from({ length: 108 }, (_, i) => i % 2 ? -0.5 : 2))
  const varying = Float32Array.from({ length: 12 }, (_, i) => i)
  solid[0] = 1
  const interpolated = lbm.upsampleVelocity(coarse, varying, fine, solid)
  expect(interpolated[0]).toBe(0)
  expect(interpolated[1]).toBe(0)
  for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) for (let c = 0; c < 2; c++) {
    expect(interpolated[2 * ((3 * y + 1) * 9 + 3 * x + 1) + c]).toBe(varying[2 * (y * 3 + x) + c])
  }
  expect(interpolated[2 * (9 + 2)]).toBeCloseTo(2 / 3)
})

it('warm starts common fluid distributions and retains equilibrium in newly exposed cells', () => {
  const oldMask = new Uint8Array(64)
  oldMask[27] = 1
  const previous = lbm.createLbm(8, 8, oldMask)
  lbm.stepLbm(previous, 30)
  const nextMask = new Uint8Array(64)
  nextMask[28] = 1
  const next = lbm.createLbm(8, 8, nextMask)
  const equilibrium = next.f.slice()
  lbm.warmStartLbm(next, previous)
  for (let k = 0; k < 9; k++) for (let i = 0; i < 64; i++) {
    const expected = oldMask[i] || nextMask[i] ? equilibrium[k * 64 + i] : previous.f[k * 64 + i]
    expect(next.f[k * 64 + i]).toBe(expected)
    expect(next.tmp[k * 64 + i]).toBe(expected)
  }
})
