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
