import { describe, expect, it } from 'vitest'
import { createFootprint, createRectangleFootprint, createTier } from '../features/massing/factories'
import { createTierGeometry, roofHandlePosition } from './massGeometry'

describe('mass geometry adapter', () => {
  it('extrudes a tier into the renderer frame (east, up, -north)', () => {
    const tier = createTier({
      footprint: createRectangleFootprint(18, 12, [100, 40]),
      baseElevation: 2,
      storeys: 3,
      storeyHeight: 3.2,
    })
    const geometry = createTierGeometry(tier)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    expect(box?.min.x).toBeCloseTo(91, 6)
    expect(box?.max.x).toBeCloseTo(109, 6)
    expect(box?.min.y).toBeCloseTo(2, 6)
    expect(box?.max.y).toBeCloseTo(11.6, 6)
    // North 34…46 maps to z −46…−34.
    expect(box?.min.z).toBeCloseTo(-46, 6)
    expect(box?.max.z).toBeCloseTo(-34, 6)
    geometry.dispose()
  })

  it('extrudes non-convex footprints', () => {
    const tier = createTier({
      footprint: createFootprint([
        [0, 0],
        [20, 0],
        [20, 5],
        [10, 5],
        [10, 10],
        [0, 10],
      ]),
      storeys: 2,
    })
    const geometry = createTierGeometry(tier)
    expect(geometry.getAttribute('position').count).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('places the roof handle at the top centre of the tier', () => {
    const tier = createTier({
      footprint: createRectangleFootprint(10, 8, [5, -3]),
      baseElevation: 9.6,
      storeys: 2,
      storeyHeight: 3.2,
    })
    const [x, y, z] = roofHandlePosition(tier)
    expect(x).toBeCloseTo(5, 6)
    expect(y).toBeCloseTo(16, 6)
    expect(z).toBeCloseTo(3, 6)
  })
})
