import { describe, expect, it } from 'vitest'
import { worstArrowSegments } from './WorstArrows'

describe('worstArrowSegments', () => {
  it('points downwind of the worst direction and skips unsolved cells', () => {
    // Two cells on the 12 m sub-lattice (indices multiple of 3) and one unsolved.
    const cells = new Float32Array([0, 0, 12, 0, 24, 0])
    const segs = worstArrowSegments(cells, [270, 0, Number.NaN])
    expect(segs).toHaveLength(6) // 2 arrows × (shaft + 2 head strokes)
    const [x0, , x1] = segs[0]! // wind from W blows east: shaft runs −x → +x
    expect(x1!).toBeGreaterThan(x0!)
    const [, y0, , y1] = segs[3]! // wind from N blows south: shaft runs +y → −y
    expect(y1!).toBeLessThan(y0!)
  })
  it('keeps only every third lattice cell each way', () => {
    const cells = new Float32Array([0, 0, 4, 0, 8, 0, 12, 0])
    expect(worstArrowSegments(cells, [0, 0, 0, 0])).toHaveLength(6)
  })
})
