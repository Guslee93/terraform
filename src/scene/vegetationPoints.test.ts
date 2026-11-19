import { describe, expect, it } from 'vitest'
import {
  buildVegetationPoints,
  CANOPY_RADIUS_M,
  CANOPY_RADII,
  contrastRatio,
  hexToRgb,
  relativeLuminance,
  TRUNK_HEIGHT_M,
  VEGETATION_COLOUR,
  type VegetationTree,
} from './vegetationPoints'
import { tintGroundColour } from './styleColour'
import { IDENTITY } from './style'

describe('buildVegetationPoints (TF-VIS-029)', () => {
  const trees: VegetationTree[] = [
    { east: 0, north: 0, ground: 10, scale: 1, shape: 'round' },
    { east: 20, north: 10, ground: 12, scale: 0.8, shape: 'tall' },
  ]

  it('is deterministic for the same seed', () => {
    const a = buildVegetationPoints(trees, 123)
    const b = buildVegetationPoints(trees, 123)
    expect(Array.from(a.full.positions)).toEqual(Array.from(b.full.positions))
    expect(Array.from(a.full.colors)).toEqual(Array.from(b.full.colors))
  })

  it('gives different points for different seeds', () => {
    expect(Array.from(buildVegetationPoints(trees, 1).full.positions))
      .not.toEqual(Array.from(buildVegetationPoints(trees, 2).full.positions))
  })

  it('produces the expected point count and LOD fractions', () => {
    const points = buildVegetationPoints(trees, 1)
    const full = points.full.positions.length / 3
    const mid = points.mid.positions.length / 3
    const far = points.far.positions.length / 3
    // 42 canopy + 4 trunk points per tree.
    expect(full).toBe(2 * 46)
    expect(mid / full).toBeGreaterThan(0.35)
    expect(mid / full).toBeLessThan(0.45)
    expect(far / full).toBeGreaterThan(0.1)
    expect(far / full).toBeLessThan(0.2)
  })

  it('keeps every point inside the canopy or trunk bounds', () => {
    const single: VegetationTree[] = [{ east: 0, north: 0, ground: 0, scale: 1, shape: 'round' }]
    const points = buildVegetationPoints(single, 1)
    const [rx, ry, rz] = CANOPY_RADII.round
    const maxReach = Math.max(rx * CANOPY_RADIUS_M, ry * CANOPY_RADIUS_M, rz * CANOPY_RADIUS_M)
    const centreY = (TRUNK_HEIGHT_M + CANOPY_RADIUS_M * 0.75)
    const positions = points.full.positions
    for (let index = 0; index < positions.length; index += 3) {
      const x = positions[index]!
      const y = positions[index + 1]!
      const z = positions[index + 2]!
      expect(Math.abs(x)).toBeLessThanOrEqual(maxReach + 1e-6)
      expect(Math.abs(z)).toBeLessThanOrEqual(maxReach + 1e-6)
      expect(y).toBeGreaterThanOrEqual(-1e-6)
      expect(y).toBeLessThanOrEqual(centreY + maxReach + 1e-6)
    }
  })

  it('parses #RRGGBB colours without three.js', () => {
    expect(hexToRgb('#FFFFFF')).toEqual([1, 1, 1])
    expect(hexToRgb('#000000')).toEqual([0, 0, 0])
    expect(hexToRgb('#8C9A8A')[0]).toBeCloseTo(0x8c / 255, 5)
  })

  it('computes WCAG relative luminance', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
  })

  it('contrasts at least 1.6:1 against the tinted ground', () => {
    // The tinted terrain vertex colour is the lightest ground the trees sit on (worst case).
    const ground = tintGroundColour('#EEEAE3', IDENTITY.groundTint!)
    expect(contrastRatio(VEGETATION_COLOUR, ground)).toBeGreaterThanOrEqual(1.6)
  })
})
