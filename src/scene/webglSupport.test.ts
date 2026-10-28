import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectWebGL } from './webglSupport'

afterEach(() => vi.restoreAllMocks())

describe('detectWebGL', () => {
  it.each(['webgl2', 'webgl'] as const)('detects %s and releases the throwaway context', (supported) => {
    const loseContext = vi.fn()
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    vi.mocked(getContext, { partial: true }).mockImplementation((kind) => kind === supported
      ? { getExtension: () => ({ loseContext }) }
      : null)
    expect(detectWebGL()).toBe(supported)
    expect(getContext.mock.calls.map(([kind]) => kind)).toEqual(
      supported === 'webgl2' ? ['webgl2'] : ['webgl2', 'webgl'],
    )
    expect(loseContext).toHaveBeenCalledOnce()
  })
  it('returns none when neither context is available', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(detectWebGL()).toBe('none')
  })
  it('returns none when context creation throws', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('WebGL blocked')
    })
    expect(detectWebGL()).toBe('none')
  })
})
