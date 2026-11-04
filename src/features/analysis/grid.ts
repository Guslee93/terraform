import { pointInPolygon } from '../../lib/polygon'
import type { Vec2 } from '../../lib/coordinates'

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

export type FootprintBuilding = { readonly height: number; readonly footprint: readonly Vec2[] }

export function insideAnyBuilding(x: number, y: number, buildings: readonly FootprintBuilding[]) {
  return buildings.some((b) => pointInPolygon([x, y], b.footprint))
}
