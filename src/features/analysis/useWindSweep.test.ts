import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useWindSweep } from './useWindSweep'
import type { SweepResult } from './directionSweep'
import type { FootprintBuilding } from './grid'

const buildings: readonly FootprintBuilding[] = []
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

it('throttles, ignores obsolete responses, keeps one worker and terminates when disabled', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  const workers: FakeWorker[] = []
  class FakeWorker {
    onmessage: ((event: { data: SweepResult }) => void) | null = null
    postMessage = vi.fn()
    terminate = vi.fn()
    constructor() { workers.push(this) }
  }
  vi.stubGlobal('Worker', FakeWorker)
  const { result, rerender, unmount } = renderHook(
    ({ radius, enabled, downwash }) => useWindSweep({ centre: [0, 0], radius }, buildings, enabled, downwash),
    { initialProps: { radius: 100, enabled: true, downwash: false } },
  )
  act(() => vi.advanceTimersByTime(0))
  const worker = workers[0]!
  const response: SweepResult = { id: 1, cells: new Float32Array(2), directions: [0], ratios: [new Float32Array([1])], complete: false }
  act(() => worker.onmessage!({ data: response }))
  expect(result.current).toEqual(response)
  rerender({ radius: 101, enabled: true, downwash: false })
  act(() => worker.onmessage!({ data: response }))
  expect(result.current).toBeNull()
  act(() => vi.advanceTimersByTime(249))
  expect(worker.postMessage).toHaveBeenCalledTimes(1)
  rerender({ radius: 102, enabled: true, downwash: true })
  act(() => vi.advanceTimersByTime(1))
  expect(worker.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ id: 3, radius: 102, downwash: true }))
  act(() => worker.onmessage!({ data: { ...response, id: 3 } }))
  expect(result.current?.id).toBe(3)
  expect(workers).toHaveLength(1)
  rerender({ radius: 102, enabled: false, downwash: true })
  expect(result.current).toBeNull()
  expect(worker.terminate).toHaveBeenCalledOnce()
  rerender({ radius: 102, enabled: true, downwash: true })
  act(() => worker.onmessage!({ data: { ...response, id: 5 } }))
  expect(result.current).toBeNull()
  expect(workers).toHaveLength(2)
  unmount()
  expect(workers[1]!.terminate).toHaveBeenCalledOnce()
})

it('returns null without a circle or worker support', () => {
  vi.stubGlobal('Worker', undefined)
  const { result } = renderHook(() => useWindSweep(null, buildings, true, false))
  expect(result.current).toBeNull()
})
