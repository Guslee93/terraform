import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useWindFlow } from './useWindFlow'
import type { FootprintBuilding } from './grid'
import type { Vec2 } from '../../lib/coordinates'

const area: readonly Vec2[] = [[-50, -50], [50, -50], [50, 50], [-50, 50]]
const buildings: readonly FootprintBuilding[] = []

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('passes the default flag and resends when slices change, using the same worker', () => {
  vi.useFakeTimers()
  const postMessage = vi.fn()
  const terminate = vi.fn()
  const construct = vi.fn()
  class FakeWorker {
    constructor() { construct() }
    postMessage = postMessage
    terminate = terminate
    onmessage = null
  }
  vi.stubGlobal('Worker', FakeWorker)
  const initialProps: { slices?: boolean } = {}
  const { rerender, unmount } = renderHook(
    ({ slices }: { slices?: boolean }) => useWindFlow(area, buildings, 270, true, false, slices),
    { initialProps },
  )
  act(() => { vi.advanceTimersByTime(100) })
  expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ slices: false, reset: true }))
  rerender({ slices: true })
  act(() => { vi.advanceTimersByTime(100) })
  expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ slices: true, reset: false, id: 2 }))
  rerender({ slices: false })
  act(() => { vi.advanceTimersByTime(100) })
  expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ slices: false, id: 3 }))
  expect(construct).toHaveBeenCalledTimes(1)
  unmount()
  expect(terminate).toHaveBeenCalledOnce()
})

// C23 finding 1: a settled result for superseded inputs must never count as current, even when
// it arrives after the newer request was only scheduled (still inside the throttle window).
it('treats a delayed result for older inputs as not current', () => {
  vi.useFakeTimers()
  const workers: { onmessage: ((event: MessageEvent) => void) | null }[] = []
  class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null
    constructor() { workers.push(this) }
    postMessage = vi.fn()
    terminate = vi.fn()
  }
  vi.stubGlobal('Worker', FakeWorker)
  const { result, rerender } = renderHook(
    ({ from }: { from: number }) => useWindFlow(area, buildings, from, true),
    { initialProps: { from: 270 } },
  )
  act(() => { vi.advanceTimersByTime(100) }) // request 1 sent
  rerender({ from: 0 }) // new inputs: revision 2, request not yet sent (throttled)
  const stale = { id: 1, frame: {} as never, velocity: new Float32Array(2), solid: new Uint8Array(1), settled: true }
  act(() => { workers[0]!.onmessage!({ data: stale } as MessageEvent) })
  expect(result.current.flow?.id).toBe(1) // still shown as a live preview
  expect(result.current.isCurrent(result.current.flow)).toBe(false) // but cannot become a baseline
  act(() => { vi.advanceTimersByTime(100) })
  const fresh = { ...stale, id: 2 }
  act(() => { workers[0]!.onmessage!({ data: fresh } as MessageEvent) })
  expect(result.current.isCurrent(result.current.flow)).toBe(true)
})
