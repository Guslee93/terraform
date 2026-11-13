import { pointInPolygon } from '../../lib/polygon'
import type { BuildingDraft } from './buildings'
import { frameBounds, type ImportFrame } from './frame'
import { clipRing, outerRings, repairRing, toLocal, type Point2, type Ring } from './geometry'
import { wayPoints, type OsmData } from './osm'
import type { TileFeature } from './tiles'

const ROW_SPACING = 8
/** Grid spacing (m) of illustrative trees per mapped area; anything else gets none. */
const ILLUSTRATIVE_SPACING: Record<string, number> = { wood: 9, garden: 14, park: 16, cemetery: 18 }
const MAX_TREES = 3000

/**
 * The mapped trees of an OpenStreetMap response, as [lon, lat] lines.
 *
 * A tree is a node (`natural=tree`); a tree row is a way (`natural=tree_row`) whose nodes are the
 * trees along it. The response is the same one the water outlines are read from, so a frame
 * costs one request for both (ADR-0027).
 */
export function parseOsmTrees(data: OsmData): [number, number][][] {
  const lines: [number, number][][] = []
  for (const node of data.nodes) {
    if (node.tags.natural === 'tree') lines.push([[node.lon, node.lat]])
  }
  for (const way of data.ways) {
    if (way.tags.natural !== 'tree_row') continue
    const points = wayPoints(data, way)
    if (points.length) lines.push(points)
  }
  return lines
}

/** Mapped tree lines to local ENU points; rows are resampled every 8 m. */
export function mappedTrees(lines: readonly [number, number][][], frame: ImportFrame): Point2[] {
  return lines.flatMap((line) => {
    const local = toLocal(line, frame)
    return local.length > 1 ? resampleRow(local) : local
  })
}

/** Resample a tree row in local metres so the gaps match ROW_SPACING, not the mapper's vertices. */
export function resampleRow(row: Ring): Ring {
  const out: Ring = []
  for (let i = 1; i < row.length; i++) {
    const [ax, ay] = row[i - 1]!, [bx, by] = row[i]!
    const steps = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / ROW_SPACING))
    for (let s = i === 1 ? 0 : 1; s <= steps; s++) out.push([ax + ((bx - ax) * s) / steps, ay + ((by - ay) * s) / steps])
  }
  return out
}

/** Deterministic 0–1 jitter so the same import always places the same trees. */
function jitter(x: number, y: number, salt: number): number {
  let v = Math.imul(Math.round(x * 10) ^ 0x9e3779b9, 0x85ebca6b)
  v = Math.imul(v ^ Math.round(y * 10) ^ salt, 0xc2b2ae35)
  v ^= v >>> 16
  return (v >>> 0) / 0x100000000
}

/**
 * Illustrative trees on a jittered grid inside mapped woods, gardens, parks and cemeteries.
 * Not tree positions: used only when no mapped trees are available.
 *
 * The grid is laid on the repaired ring, the same ring the studio paints the ground from, so a
 * canopy always stands on the green it was placed for (ADR-0024).
 */
export function illustrativeTrees(features: readonly TileFeature[], frame: ImportFrame): Point2[] {
  const extent = frameBounds(frame).enu
  const points: Point2[] = []
  for (const f of features) {
    const key = f.layer === 'landcover' && f.properties.class === 'wood' ? 'wood'
      : f.layer === 'landcover' && f.properties.subclass === 'garden' ? 'garden'
      : f.layer === 'landcover' && (f.properties.subclass === 'park' || f.properties.subclass === 'village_green' || f.properties.subclass === 'recreation_ground') ? 'park'
        : f.layer === 'landuse' && f.properties.class === 'cemetery' ? 'cemetery' : null
    if (!key) continue
    const spacing = ILLUSTRATIVE_SPACING[key]!
    for (const outer of outerRings(f.geometry)) {
      for (const ring of repairRing(clipRing(toLocal(outer, frame), extent))) {
        if (ring.length < 3) continue
        const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1])
        // Grid anchored to whole multiples so overlapping areas share points instead of doubling them.
        for (let x = Math.ceil(Math.min(...xs) / spacing) * spacing; x <= Math.max(...xs); x += spacing) {
          for (let y = Math.ceil(Math.min(...ys) / spacing) * spacing; y <= Math.max(...ys); y += spacing) {
            const point: Point2 = [x + (jitter(x, y, 1) - 0.5) * spacing * 0.7, y + (jitter(x, y, 2) - 0.5) * spacing * 0.7]
            if (pointInPolygon(point, ring)) points.push(point)
          }
        }
      }
    }
  }
  return points
}

/** Local ENU tree points inside the frame, off building footprints, deduplicated at 1 m, capped. */
export function placeTrees(points: readonly Point2[], buildings: readonly BuildingDraft[], frame: ImportFrame): [number, number][] {
  const [minX, minY, maxX, maxY] = frameBounds(frame).enu
  const boxes = buildings.map(({ footprint }) => {
    const xs = footprint.map((p) => p[0]), ys = footprint.map((p) => p[1])
    return { ring: footprint, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as const }
  })
  const seen = new Set<string>()
  const out: [number, number][] = []
  for (const [x, y] of points) {
    if (x < minX || x > maxX || y < minY || y > maxY) continue
    const key = `${Math.round(x)},${Math.round(y)}`
    if (seen.has(key)) continue
    if (boxes.some(({ box, ring }) => x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3] && pointInPolygon([x, y], ring))) continue
    seen.add(key)
    out.push([Number(x.toFixed(2)), Number(y.toFixed(2))])
  }
  // Over the cap, thin evenly: stopping at the first MAX_TREES would leave part of the frame bare.
  if (out.length <= MAX_TREES) return out
  const step = out.length / MAX_TREES
  return Array.from({ length: MAX_TREES }, (_, index) => out[Math.floor(index * step)]!)
}
