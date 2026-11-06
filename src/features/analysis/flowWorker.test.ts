import { afterEach, expect, it, vi } from 'vitest'
import { flowFrame } from './lbm'
import type { FlowRequest, FlowResult } from './flowRunner'

const runner = vi.hoisted(() => ({ request: vi.fn(), tick: vi.fn(), hasPendingWork: vi.fn() }))
vi.mock('./flowRunner', () => ({ createFlowRunner: () => runner }))

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('continues after ground settlement, replaces queued requests, and transfers the entire final stack', async () => {
  vi.useFakeTimers()
  const scope: { onmessage: ((event: { data: FlowRequest }) => void) | null; postMessage: ReturnType<typeof vi.fn> } = {
    onmessage: null, postMessage: vi.fn(),
  }
  vi.stubGlobal('self', scope)
  vi.stubGlobal('WorkerGlobalScope', Object)
  const frame = { nx: 8, ny: 8, dx: 2, centre: [0, 0], flow: [1, 0] } as const
  const request = { id: 1, frame, buildings: [], reset: true, slices: true }
  const ground: FlowResult = { id: 1, frame, settled: true, slicesComplete: false, velocity: new Float32Array(128), solid: new Uint8Array(64) }
  const final: FlowResult = { ...ground, id: 3, slicesComplete: true, slices: [2, 10, 20, 35].map((z) => ({ z, velocity: new Float32Array(128), solid: new Uint8Array(64) })) }
  const partials = [1, 2, 3].map((count) => ({ ...final, slicesComplete: false, slices: final.slices!.slice(0, count) }))
  runner.tick.mockReturnValueOnce(ground)
  for (const partial of partials) runner.tick.mockReturnValueOnce(partial).mockReturnValueOnce(partial)
  runner.tick.mockReturnValueOnce(final)
  for (let i = 0; i < 7; i++) runner.hasPendingWork.mockReturnValueOnce(true)
  runner.hasPendingWork.mockReturnValueOnce(false)
  await import('./flowWorker')
  scope.onmessage!({ data: request })
  vi.advanceTimersToNextTimer()
  expect(scope.postMessage).toHaveBeenCalledTimes(1)
  expect(vi.getTimerCount()).toBe(1)
  scope.onmessage!({ data: { ...request, id: 2 } })
  scope.onmessage!({ data: { ...request, id: 3 } })
  vi.runAllTimers()
  expect(runner.request.mock.calls.map(([req]) => req.id)).toEqual([1, 3])
  expect(scope.postMessage).toHaveBeenLastCalledWith(final, [final.velocity.buffer, final.solid.buffer,
    ...final.slices!.flatMap((slice) => [slice.velocity.buffer, slice.solid.buffer])])
  expect(scope.postMessage.mock.calls.map(([result]) => result.slices?.map((s: { z: number }) => s.z)))
    .toEqual([undefined, [2], [2, 10], [2, 10, 20], [2, 10, 20, 35]])
  expect(vi.getTimerCount()).toBe(0)
})

it('posts live ground changes and completion once, suppressing unchanged upper-slice ticks', async () => {
  const { shouldPostFlow } = await import('./flowWorker')
  const result: FlowResult = { id: 1, frame: flowFrame([[0, 0], [20, 0], [20, 20], [0, 20]], 270, 8, 8), settled: false, slicesComplete: false, velocity: new Float32Array(128), solid: new Uint8Array(64) }
  expect(shouldPostFlow(null, result)).toBe(true)
  expect(shouldPostFlow(result, result)).toBe(true)
  const settled = { ...result, settled: true }
  expect(shouldPostFlow(result, settled)).toBe(true)
  expect(shouldPostFlow(settled, settled)).toBe(false)
  const complete = { ...settled, slices: [{ z: 2, velocity: result.velocity, solid: result.solid }] }
  expect(shouldPostFlow(settled, complete)).toBe(true)
  expect(shouldPostFlow(complete, complete)).toBe(false)
  expect(shouldPostFlow(complete, { ...complete, id: 2 })).toBe(true)
})
