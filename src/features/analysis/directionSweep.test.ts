import { expect, it, vi } from 'vitest'
import { MessageChannel } from 'node:worker_threads'
import { createSweepRunner, summariseSweep, SWEEP_DIRECTIONS, type SweepRequest, type SweepResult } from './directionSweep'
import { circlePolygon, sampleGrid, insideAnyBuilding, type FootprintBuilding } from './grid'
import * as lbm from './lbm'

const request: SweepRequest = { id: 1, centre: [0, 0], radius: 100, buildings: [], downwash: false }
function finish(runner: ReturnType<typeof createSweepRunner>) {
  let result: SweepResult | null = null
  while (runner.hasPendingWork()) result = runner.tick(Infinity)
  return result!
}

it('summarises two directions, skipping NaNs and breaking share ties by mean', () => {
  const result: SweepResult = { id: 1, cells: new Float32Array(6), directions: [0, 90],
    ratios: [new Float32Array([1, 2, NaN]), new Float32Array([3, 1, NaN])], complete: false }
  const summary = summariseSweep(result, 2)
  expect([...summary.maxRatio]).toEqual([3, 2, NaN])
  expect([...summary.worstIndex]).toEqual([1, 0, 255])
  expect(summary.perDirection).toEqual([{ from: 0, shareAbove: 0.5, meanRatio: 1.5 }, { from: 90, shareAbove: 0.5, meanRatio: 2 }])
  expect(summary.worst).toEqual({ from: 90, shareAbove: 0.5 })
  expect(summariseSweep({ ...result, directions: [], ratios: [] }, 2).worst).toBeNull()
  expect(summariseSweep({ ...result, cells: new Float32Array(), ratios: [new Float32Array(), new Float32Array()] }, 2).perDirection[0]).toEqual({ from: 0, shareAbove: 0, meanRatio: 0 })
})

it('solves empty ground progressively in order and reuses detached-safe cached results', () => {
  const runner = createSweepRunner()
  runner.request(request)
  let result: SweepResult | null = null
  for (let i = 0; i < 8; i++) {
    result = runner.tick(Infinity)!
    expect(result.directions).toEqual(SWEEP_DIRECTIONS.slice(0, i + 1))
    expect(result.complete).toBe(i === 7)
    for (const direction of summariseSweep(result, 1.3).perDirection) {
      expect(Math.abs(direction.meanRatio - 1)).toBeLessThan(0.05)
      expect(direction.shareAbove).toBe(0)
    }
  }
  const expected = result!.ratios[0]!.slice()
  result!.cells.fill(999)
  result!.ratios[0]!.fill(999)
  const { port1, port2 } = new MessageChannel()
  const buffers = [result!.cells.buffer, ...result!.ratios.map((field) => field.buffer)]
  port1.postMessage(result, buffers.map((buffer) => {
    if (!(buffer instanceof ArrayBuffer)) throw new Error('Expected transferable ArrayBuffer')
    return buffer
  }))
  port1.close(); port2.close()
  expect(result!.cells.byteLength).toBe(0)
  const step = vi.spyOn(lbm, 'stepLbm')
  runner.request({ ...request, id: 2 })
  const cached = runner.tick(0)!
  expect(cached.id).toBe(2)
  expect(cached.complete).toBe(true)
  expect(cached.ratios[0]).toEqual(expected)
  expect(step).not.toHaveBeenCalled()
  expect(runner.tick(0)).toBeNull()
}, 20_000)

it('cancels unfinished work, keys all inputs and limits the cache to four recent entries', () => {
  const runner = createSweepRunner()
  runner.request(request)
  expect(runner.tick(0)).toBeNull()
  runner.request({ ...request, id: 2 })
  expect(runner.tick(Infinity)!.id).toBe(2)
  expect(runner.tick(Infinity)!.directions).toEqual([0, 45])
  finish(runner)
  for (let i = 1; i < 4; i++) { runner.request({ ...request, radius: 100 + i }); finish(runner) }
  runner.request(request); expect(runner.tick(0)!.complete).toBe(true)
  runner.request({ ...request, radius: 104 }); finish(runner)
  runner.request({ ...request, radius: 101 }); expect(runner.tick(0)).toBeNull()
  const changes: SweepRequest[] = [
    { ...request, centre: [1, 0] }, { ...request, downwash: true },
    { ...request, buildings: [{ height: 10, footprint: [[-10, -10], [10, -10], [10, 10], [-10, 10]] }] },
  ]
  for (const change of changes) { runner.request(change); expect(runner.tick(0)).toBeNull() }
}, 30_000)

it('puts east ground in the west-wind wake and exposes north ground to east/west corner flow', () => {
  const buildings: FootprintBuilding[] = [{ height: 12, footprint: [[-10, -10], [10, -10], [10, 10], [-10, 10]] }]
  const runner = createSweepRunner()
  runner.request({ ...request, buildings })
  const result = finish(runner)
  expect(result.cells).toEqual(Float32Array.from(sampleGrid(circlePolygon(request.centre, request.radius), 4)
    .filter(({ x, y }) => !insideAnyBuilding(x, y, buildings)).flatMap(({ x, y }) => [x, y])))
  const summary = summariseSweep(result, 1.3)
  const at = (x: number, y: number) => {
    for (let i = 0; i < result.cells.length / 2; i++) if (result.cells[2 * i] === x && result.cells[2 * i + 1] === y) return i
    throw new Error('Missing fixture cell')
  }
  const east = at(18, 2), north = at(2, 22)
  expect(result.directions[summary.worstIndex[east]!]).not.toBe(270)
  expect(result.ratios[6]![east]).toBeLessThan(1)
  expect([90, 270]).toContain(result.directions[summary.worstIndex[north]!])
}, 30_000)

it.skipIf(!process.env.WIND_BENCHMARK)('benchmark Compact Infill eight directions, r=100 m', async () => {
  const { readFileSync } = await import('node:fs')
  const { buildings } = JSON.parse(readFileSync('public/sites/compact-infill/buildings.json', 'utf8')) as { buildings: FootprintBuilding[] }
  const runner = createSweepRunner()
  const start = performance.now()
  runner.request({ ...request, buildings, downwash: true })
  const result = finish(runner)
  const totalMs = performance.now() - start
  process.stdout.write(JSON.stringify({ totalMs, directions: result.directions.length, cells: result.cells.length / 2 }) + '\n')
  expect(result.complete).toBe(true)
  expect(totalMs).toBeLessThanOrEqual(20_000)
}, 120_000)
