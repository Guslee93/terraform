import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTween } from './useTween'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('useTween', () => {
  it('starts at the first value and eases to a new one', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] })
    const { result, rerender } = renderHook(({ target }) => useTween(target, 400), { initialProps: { target: 10 } })
    expect(result.current).toBe(10)
    rerender({ target: 20 })
    act(() => { vi.advanceTimersByTime(200) })
    expect(result.current).toBeGreaterThan(10)
    expect(result.current).toBeLessThan(20)
    act(() => { vi.advanceTimersByTime(400) })
    expect(result.current).toBe(20)
  })

  it('jumps straight to the target under reduced motion', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    const { result, rerender } = renderHook(({ target }) => useTween(target), { initialProps: { target: 1 } })
    rerender({ target: 5 })
    expect(result.current).toBe(5)
  })
})
