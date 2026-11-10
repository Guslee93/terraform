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

export function insideAnyBuilding(x: number, y: number, buildings: readonly FootprintBuilding[]) {
  return buildings.some((b) => pointInPolygon([x, y], b.footprint))
}

/** Regular n-gon approximating a circle (counter-clockwise, local ENU metres). */
export function circlePolygon(centre: Vec2, radius: number, n = 48): Vec2[] {
  return Array.from({ length: n }, (_, i): Vec2 => {
    const a = (2 * Math.PI * i) / n
    return [centre[0] + radius * Math.cos(a), centre[1] + radius * Math.sin(a)]
  })
}
