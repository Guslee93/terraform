import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../../lib/polygon'
import type { LandCoverArea } from './package'
import { dropTreesOnWater } from './treePlacement'

const area = (id: string, kind: LandCoverArea['kind'], ring: LandCoverArea['ring']): LandCoverArea => ({ id, kind, ring })

const lake = area('water-1', 'water', [[-50, -50], [50, -50], [50, 50], [-50, 50]])
const park = area('park-1', 'park', [[-150, -150], [150, -150], [150, 150], [-150, 150]])

describe('dropTreesOnWater (ADR-0024)', () => {
  it('removes a tree that stands on painted water', () => {
    expect(dropTreesOnWater([[0, 0], [80, 80]], [lake, park])).toEqual([[80, 80]])
  })

  it('keeps every tree when the package paints no water', () => {
    const trees: [number, number][] = [[0, 0], [80, 80]]
    expect(dropTreesOnWater(trees, [park])).toEqual(trees)
    expect(dropTreesOnWater(trees, [])).toEqual(trees)
  })

  it('ignores land cover that is not water', () => {
    // A tree standing on a park, a pitch or a plaza is standing on ground.
    const trees: [number, number][] = [[0, 0]]
    const areas = [
      area('park-1', 'park', [[-150, -150], [150, -150], [150, 150], [-150, 150]]),
      area('pitch-1', 'pitch', [[-150, -150], [150, -150], [150, 150], [-150, 150]]),
      area('plaza-1', 'plaza', [[-150, -150], [150, -150], [150, 150], [-150, 150]]),
      area('wetland-1', 'wetland', [[-150, -150], [150, -150], [150, 150], [-150, 150]]),
    ]
    expect(dropTreesOnWater(trees, areas)).toEqual(trees)
  })

  it('removes a tree just inside the water edge and keeps one just outside it', () => {
    expect(dropTreesOnWater([[49.99, 0], [50.01, 0]], [lake])).toEqual([[50.01, 0]])
  })

  it('drops a tree in a hole of a ring-shaped water area', () => {
    // Two rings: the outer bounds hold, so the tree must still be tested against the polygon.
    const ring: LandCoverArea['ring'] = [[-100, -100], [100, -100], [100, 100], [-100, 100], [-100, -100]]
    expect(dropTreesOnWater([[0, 0], [140, 0]], [area('water-1', 'water', ring)])).toEqual([[140, 0]])
  })

  it('leaves the input array untouched', () => {
    const trees: [number, number][] = [[0, 0]]
    dropTreesOnWater(trees, [lake])
    expect(trees).toEqual([[0, 0]])
  })

  it('keeps the tree count and order of the survivors', () => {
    const trees: [number, number][] = [[-100, 0], [0, 0], [100, 0]]
    const kept = dropTreesOnWater(trees, [lake])
    expect(kept).toHaveLength(2)
    expect(kept[0]).toEqual([-100, 0])
    expect(kept[1]).toEqual([100, 0])
    expect(kept.every((tree) => !pointInPolygon(tree, lake.ring))).toBe(true)
  })
})
