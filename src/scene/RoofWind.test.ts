import { expect, it } from 'vitest'
import { roofGeometry, roofSlice } from './RoofWind'
import { DEFAULT_WIND } from '../features/analysis/climateView'
import { flowFrame } from '../features/analysis/lbm'
import type { Vec2 } from '../lib/coordinates'

const slices = [35, 2, 20, 10].map((z) => ({ z, velocity: new Float32Array(32 * 32 * 2).fill(1), solid: new Uint8Array(32 * 32) }))
it('chooses the lowest slice at or above a roof, capped at the top slice', () => {
  expect(roofSlice(slices, 8)?.z).toBe(10)
  expect(roofSlice(slices, 50)?.z).toBe(35)
  expect(roofSlice(slices, 20)?.z).toBe(20)
  expect(roofSlice([], 8)).toBeUndefined()
})
it('covers roofs at centroid terrain + height + 0.3, excluding buildings outside the circle', () => {
  const footprint: Vec2[] = [[0, 0], [9, 0], [9, 9], [0, 9]]
  const flow = { id: 1, frame: flowFrame([[-50, -50], [50, -50], [50, 50], [-50, 50]], 270, 32, 32), velocity: slices[0]!.velocity, solid: slices[0]!.solid, settled: true, slices }
  const circle = { centre: [0, 0] as Vec2, radius: 20 }
  const building = { height: 8, footprint }
  const geometry = roofGeometry([building], flow, circle, () => 11, DEFAULT_WIND, null)
  const p = geometry.getAttribute('position')
  expect(p.count).toBeGreaterThan(0)
  let area = 0
  for (let i = 0; i < p.count; i += 3) {
    expect(p.getY(i)).toBeCloseTo(19.3)
    area += Math.abs((p.getX(i + 1) - p.getX(i)) * (p.getZ(i + 2) - p.getZ(i)) - (p.getX(i + 2) - p.getX(i)) * (p.getZ(i + 1) - p.getZ(i))) / 2
  }
  expect(area).toBeCloseTo(81)
  expect(roofGeometry([building], { ...flow, slices: undefined }, circle, () => 0, DEFAULT_WIND, null).getAttribute('position').count).toBe(0)
  expect(roofGeometry([building], flow, { centre: [100, 100], radius: 20 }, () => 0, DEFAULT_WIND, null).getAttribute('position').count).toBe(0)
  geometry.dispose()
})
