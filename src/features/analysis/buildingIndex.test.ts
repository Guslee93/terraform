import { describe, expect, it } from 'vitest'
import compactBuildings from '../../../public/sites/compact-infill/buildings.json'
import { parseBuildings } from '../sites/package'
import {
  footprintBoxes,
  indexBuildings,
  insideAnyBuilding,
  type FootprintBuilding,
} from './grid'

// ADR-0023: the context block grew from 137 to 520 buildings, so the noise screening can no longer
// test every building for every cell and street. The index must find exactly the buildings a
// linear scan would have found — no more (which would change the result) and no fewer (which
// would silently drop a screening building).

const box = (minX: number, minY: number, maxX: number, maxY: number, height = 10): FootprintBuilding => ({
  height,
  footprint: [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
  ],
})

/** Deterministic pseudo-random generator: the same case runs on every machine. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0
    return state / 0x1_0000_0000
  }
}

describe('building index', () => {
  it('returns exactly the buildings whose box overlaps the query', () => {
    const random = seeded(20261111)
    const buildings: FootprintBuilding[] = Array.from({ length: 120 }, () => {
      const minX = Math.round(random() * 400 - 200)
      const minY = Math.round(random() * 400 - 200)
      const width = 4 + Math.round(random() * 40)
      const depth = 4 + Math.round(random() * 40)
      return box(minX, minY, minX + width, minY + depth)
    })
    const index = indexBuildings(buildings)
    const boxes = footprintBoxes(buildings)
    for (let query = 0; query < 40; query += 1) {
      const minX = Math.round(random() * 440 - 220)
      const minY = Math.round(random() * 440 - 220)
      const maxX = minX + Math.round(random() * 120)
      const maxY = minY + Math.round(random() * 120)
      const expected = boxes
        .filter((b) => b.maxX >= minX && b.minX <= maxX && b.maxY >= minY && b.minY <= maxY)
        .map((b) => b.building)
      const found = index.query(minX, minY, maxX, maxY)
      expect(found).toHaveLength(expected.length)
      expect(new Set(found)).toEqual(new Set(expected))
    }
  })

  it('finds a building whose edge crosses the queried box', () => {
    // A wall standing on the line between a receiver and a street.
    const wall = box(-2, -20, 2, 20, 8)
    const index = indexBuildings([wall])
    expect(index.query(-5, -10, 5, 10)).toHaveLength(1)
    expect(index.query(50, 50, 60, 60)).toHaveLength(0)
  })

  it('agrees with a linear scan on "is this point inside a building?"', () => {
    const random = seeded(4711)
    const buildings: FootprintBuilding[] = Array.from({ length: 60 }, () => {
      const minX = Math.round(random() * 200 - 100)
      const minY = Math.round(random() * 200 - 100)
      return box(minX, minY, minX + 20, minY + 20)
    })
    const index = indexBuildings(buildings)
    for (let point = 0; point < 60; point += 1) {
      const x = Math.round(random() * 240 - 120)
      const y = Math.round(random() * 240 - 120)
      expect(insideAnyBuilding(x, y, buildings, index)).toBe(insideAnyBuilding(x, y, buildings))
    }
  })

  it('indexes the shipped city block without losing a building', () => {
    const buildings = parseBuildings(compactBuildings).buildings.map((building) => ({
      height: building.height,
      footprint: building.footprint,
    }))
    const index = indexBuildings(buildings)
    // The whole block in one query: every building comes back exactly once.
    const all = index.query(-5000, -5000, 5000, 5000)
    expect(all).toHaveLength(buildings.length)
    expect(new Set(all).size).toBe(buildings.length)
  })
})
