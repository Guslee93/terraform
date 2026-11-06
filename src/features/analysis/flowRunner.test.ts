import { describe, expect, it, vi } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { createFlowRunner, MAX_STEPS, type FlowRequest, type FlowResult } from './flowRunner'
import * as lbm from './lbm'
import type { FlowFrame } from './lbm'
import { profileFactor } from './windProfile'
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
    expect(ground.slices).toBeUndefined()
    expect(runner.hasPendingWork()).toBe(true)
    expect(create).toHaveBeenCalledTimes(1)
    const result = finish(runner)
    expect(create).toHaveBeenCalledTimes(4)
    expect(step.mock.calls.reduce((sum, call) => sum + call[1]!, 0)).toBe(MAX_STEPS * 4)
    expect(result.slices?.map((s) => s.z)).toEqual([2, 10, 20, 35])
    expect(result.frame).toEqual(frame)
    const [pedestrian, ten, twenty] = result.slices!
    expect(pedestrian!.velocity).toEqual(result.velocity)
    expect(ten!.solid[12 * 24 + 12]).toBe(1)
    expect(twenty!.solid[12 * 24 + 12]).toBe(0)
    const wake = sampleVelocity(frame, result.velocity, result.solid, [16, 0])!
    const above = sampleVelocity(frame, twenty!.velocity, twenty!.solid, [16, 0])!
    expect(Math.hypot(...above)).toBeGreaterThan(Math.hypot(...wake))
    expect(Math.hypot(...above)).toBeCloseTo(profileFactor(20) / profileFactor(2), 4)
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
    expect(cached.slices).toHaveLength(4)
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
