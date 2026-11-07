import { afterEach, expect, it, vi } from 'vitest'
import type { SweepRequest, SweepResult } from './directionSweep'
const runner = vi.hoisted(() => ({ request: vi.fn(), tick: vi.fn(), hasPendingWork: vi.fn() }))
vi.mock('./directionSweep', () => ({ createSweepRunner: () => runner }))
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

it('continues null ticks, coalesces requests, and transfers every progressive buffer', async () => {
  vi.useFakeTimers()
  const scope: { onmessage: ((event: { data: SweepRequest }) => void) | null; postMessage: ReturnType<typeof vi.fn> } = { onmessage: null, postMessage: vi.fn() }
  vi.stubGlobal('self', scope)
  vi.stubGlobal('WorkerGlobalScope', Object)
  const request: SweepRequest = { id: 1, centre: [0, 0], radius: 100, buildings: [], downwash: false }
  const partial: SweepResult = { id: 3, cells: new Float32Array(2), directions: [0], ratios: [new Float32Array([1])], complete: false }
  const final: SweepResult = { ...partial, directions: [0, 45], ratios: [...partial.ratios, new Float32Array([1])], complete: true }
  runner.tick.mockReturnValueOnce(null).mockReturnValueOnce(partial).mockReturnValueOnce(final)
  runner.hasPendingWork.mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValueOnce(false)
  await import('./sweepWorker')
  scope.onmessage!({ data: request })
  vi.advanceTimersToNextTimer()
  expect(scope.postMessage).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(1)
  scope.onmessage!({ data: { ...request, id: 2 } })
  scope.onmessage!({ data: { ...request, id: 3 } })
  vi.runAllTimers()
  expect(runner.request.mock.calls.map(([req]) => req.id)).toEqual([1, 3])
  expect(scope.postMessage).toHaveBeenCalledTimes(2)
  expect(scope.postMessage).toHaveBeenLastCalledWith(final, [final.cells.buffer, ...final.ratios.map((field) => field.buffer)])
  expect(vi.getTimerCount()).toBe(0)
})
