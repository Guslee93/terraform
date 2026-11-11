import { pointInPolygon } from '../../lib/polygon'
import type { Vec2 } from '../../lib/coordinates'
import type { Roof } from '../sites/roof'

export type GridCell = { readonly x: number; readonly y: number }

/** Cell centres, on a regular lattice anchored at the polygon's min corner, that fall inside it. */
export function sampleGrid(polygon: readonly Vec2[], cellM: number): GridCell[] {
  if (polygon.length < 3 || !(cellM > 0)) return []
  const xs = polygon.map((p) => p[0])
  const ys = polygon.map((p) => p[1])
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const cells: GridCell[] = []
  for (let y = minY + cellM / 2; y < Math.max(...ys); y += cellM) {
    for (let x = minX + cellM / 2; x < Math.max(...xs); x += cellM) {
      if (pointInPolygon([x, y], polygon)) cells.push({ x, y })
    }
  }
  return cells
}

/**
 * `height` is above the building's own base. `roof` and `baseElevation` are carried for drawing only
 * (ADR-0022): every analysis treats a building as flat at `height`. A context building stands on
 * `baseElevation` (its lowest corner); a drawn mass has none and stands on the terrain at its centroid.
 */
export type FootprintBuilding = { readonly height: number; readonly footprint: readonly Vec2[]; readonly roof?: Roof; readonly baseElevation?: number }

/** A reusable "is this point inside a building" test with a bounding-box shortcut per building. */
export function footprintTester(buildings: readonly FootprintBuilding[]): (x: number, y: number) => boolean {
  const boxes = buildings.map((building) => {
    const xs = building.footprint.map((point) => point[0])
    const ys = building.footprint.map((point) => point[1])
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys), footprint: building.footprint }
  })
  return (x, y) => boxes.some((box) => x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY && pointInPolygon([x, y], box.footprint))
}

export function insideAnyBuilding(
  x: number,
  y: number,
  buildings: readonly FootprintBuilding[],
  index?: BuildingIndex,
) {
  const candidates = index ? index.query(x, y, x, y) : buildings
  return candidates.some((b) => pointInPolygon([x, y], b.footprint))
}

/** Bounding box of one building footprint, in local metres. */
export type FootprintBox = {
  readonly minX: number
  readonly maxX: number
  readonly minY: number
  readonly maxY: number
  readonly building: FootprintBuilding
}

/**
 * Uniform-grid index over building footprints (ADR-0023). Screening one line against every
 * building in a city block costs a point-in-polygon plus a segment test per footprint edge; with
 * a few hundred context buildings that is seconds per edit. The index answers "which buildings can
 * this box touch?" in a handful of candidates, so the screening result is unchanged — only the
 * work is less. Renderer-free domain logic.
 */
export type BuildingIndex = {
  /** Buildings whose bounding box overlaps the given box — the same set a linear scan finds. */
  query(minX: number, minY: number, maxX: number, maxY: number): FootprintBuilding[]
}

/** Grid cell size in metres. Footprints are small; 20 m keeps the buckets to one or two buildings. */
export const BUILDING_INDEX_CELL_M = 20

/** Bounding boxes of the given buildings. A footprint with no vertices has no box. */
export function footprintBoxes(buildings: readonly FootprintBuilding[]): FootprintBox[] {
  const boxes: FootprintBox[] = []
  for (const building of buildings) {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const [x, y] of building.footprint) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    if (!Number.isFinite(minX)) continue
    boxes.push({ minX, maxX, minY, maxY, building })
  }
  return boxes
}

/**
 * Index buildings by bounding box. A building is filed under every grid cell its box touches, so
 * a query returns it whenever the queried box overlaps the building's own box — exactly the
 * buildings a linear scan would have to test.
 */
export function indexBuildings(
  buildings: readonly FootprintBuilding[],
  cellM = BUILDING_INDEX_CELL_M,
): BuildingIndex {
  const boxes = footprintBoxes(buildings)
  const cells = new Map<number, Map<number, number[]>>()
  const size = cellM > 0 ? cellM : BUILDING_INDEX_CELL_M
  boxes.forEach((box, index) => {
    const gx0 = Math.floor(box.minX / size)
    const gx1 = Math.floor(box.maxX / size)
    const gy0 = Math.floor(box.minY / size)
    const gy1 = Math.floor(box.maxY / size)
    for (let gy = gy0; gy <= gy1; gy += 1) {
      for (let gx = gx0; gx <= gx1; gx += 1) {
        const row = cells.get(gx)
        if (row) {
          const bucket = row.get(gy)
          if (bucket) bucket.push(index)
          else row.set(gy, [index])
        } else {
          cells.set(gx, new Map([[gy, [index]]]))
        }
      }
    }
  })
  // A stamp per box avoids allocating a set on every query.
  const seen = new Int32Array(boxes.length)
  let stamp = 0
  return {
    query(minX, minY, maxX, maxY) {
      stamp += 1
      const found: FootprintBuilding[] = []
      const gx0 = Math.floor(minX / size)
      const gx1 = Math.floor(maxX / size)
      const gy0 = Math.floor(minY / size)
      const gy1 = Math.floor(maxY / size)
      for (let gy = gy0; gy <= gy1; gy += 1) {
        for (let gx = gx0; gx <= gx1; gx += 1) {
          const bucket = cells.get(gx)?.get(gy)
          if (!bucket) continue
          for (const index of bucket) {
            if (seen[index] === stamp) continue
            seen[index] = stamp
            const box = boxes[index]!
            // The bucket is a superset: a neighbour cell can share it without overlapping.
            if (box.maxX < minX || box.minX > maxX || box.maxY < minY || box.minY > maxY) continue
            found.push(box.building)
          }
        }
      }
      return found
    },
  }
}

/** Regular n-gon approximating a circle (counter-clockwise, local ENU metres). */
export function circlePolygon(centre: Vec2, radius: number, n = 48): Vec2[] {
  return Array.from({ length: n }, (_, i): Vec2 => {
    const a = (2 * Math.PI * i) / n
    return [centre[0] + radius * Math.cos(a), centre[1] + radius * Math.sin(a)]
  })
}
