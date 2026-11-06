import { afterEach, expect, it, vi } from 'vitest'
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
  const frame = { nx: 8, ny: 8, dx: 2, centre: [0, 0], flow: [1, 0] } as const
  const request = { id: 1, frame, buildings: [], reset: true, slices: true }
  const ground: FlowResult = { id: 1, frame, settled: true, velocity: new Float32Array(128), solid: new Uint8Array(64) }
  const final: FlowResult = { ...ground, id: 3, slices: [2, 10, 20, 35].map((z) => ({ z, velocity: new Float32Array(128), solid: new Uint8Array(64) })) }
  runner.tick.mockReturnValueOnce(ground).mockReturnValueOnce(final)
  runner.hasPendingWork.mockReturnValueOnce(true).mockReturnValueOnce(false)
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
  expect(vi.getTimerCount()).toBe(0)
})
