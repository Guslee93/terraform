import { describe, expect, it } from 'vitest'
import { createWaterGeometry } from './waterGeometry'
import type { WaterSurface } from '../features/sites/waterSurface'

/** A square pond, level at 4 m. */
const POND: WaterSurface = {
  id: 'pond',
  ring: [[0, 0], [20, 0], [20, 20], [0, 20]],
  levels: [4, 4, 4, 4],
}

/** The same pond traced the other way round, and 2 m higher on one side. */
const REVERSED: WaterSurface = {
  id: 'reversed',
  ring: [[0, 20], [20, 20], [20, 0], [0, 0]],
  levels: [6, 6, 6, 6],
}

describe('createWaterGeometry', () => {
  it('draws a body as a flat surface at its own level', () => {
    const geometry = createWaterGeometry([POND])
    const position = geometry.getAttribute('position')
    expect(position.count).toBe(6)
    for (let index = 0; index < position.count; index += 1) {
      expect(position.getY(index)).toBeCloseTo(4, 6)
    }
    // The outline is the mapped one: north is -z, east is x.
    const easts = Array.from({ length: position.count }, (_, index) => position.getX(index)).sort((a, b) => a - b)
    expect(easts[0]).toBeCloseTo(0, 6)
    expect(easts[position.count - 1]).toBeCloseTo(20, 6)
  })

  it('points the faces up whatever way the outline runs', () => {
    for (const surface of [POND, REVERSED]) {
      const geometry = createWaterGeometry([surface])
      const position = geometry.getAttribute('position')
      const ax = position.getX(0), az = position.getZ(0)
      const bx = position.getX(1), bz = position.getZ(1)
      const cx = position.getX(2), cz = position.getZ(2)
      // The normal of a counter-clockwise face in the east-north plane points up.
      const ux = bx - ax, uz = bz - az
      const vx = cx - ax, vz = cz - az
      const ny = uz * vx - ux * vz
      expect(ny).toBeGreaterThan(0)
    }
  })

  it('draws nothing for a body that is too small to have an area', () => {
    const geometry = createWaterGeometry([{ id: 'sliver', ring: [[0, 0], [10, 0]], levels: [1, 1] }])
    expect(geometry.getAttribute('position').count).toBe(0)
  })
})
