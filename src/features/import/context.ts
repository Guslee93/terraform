import type { LandCoverArea, Road } from '../sites/package'
import { frameBounds, type ImportFrame, type Origin } from './frame'
import { clipPolyline, clipRing, outerRings, repairRing, toLocal, type Point2, type Ring } from './geometry'
import type { TileFeature } from './tiles'
/** Kept equal to scripts/spike-import.mjs (the C3 reference is intentionally unchanged). */
export const ROAD_WIDTHS: Readonly<Record<string, number>> = {
  motorway: 14, trunk: 12, primary: 12, secondary: 10, tertiary: 8,
  residential: 6, unclassified: 6, living_street: 5, service: 4,
  pedestrian: 5, footway: 2.5, path: 2, cycleway: 2.5, steps: 2, track: 3,
}
function distanceToRun(point: Point2, run: Ring): number {
  let distance = Infinity
  for (let i = 1; i < run.length; i++) {
    const a = run[i - 1]!, b = run[i]!
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)))
    distance = Math.min(distance, Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy))
  }
  return distance
}
export function extractRoads(features: readonly TileFeature[], frame: ImportFrame, origin: Origin = frame): Road[] {
  const extent = frameBounds(frame, origin).enu
  const kept: { className: string; run: Ring }[] = []
  const roads: Road[] = []
  for (const feature of features) {
    const className = feature.properties.class
    if (feature.layer !== 'transportation' || feature.properties.brunnel === 'tunnel' || typeof className !== 'string') continue
    const highway = className === 'minor' ? 'residential' : className === 'path' ? 'footway' : className
    const width = Object.hasOwn(ROAD_WIDTHS, highway) ? ROAD_WIDTHS[highway] : undefined
    if (!width) continue
    const g = feature.geometry
    const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []
    for (const line of lines) for (const run of clipPolyline(toLocal(line, origin), extent)) {
      if (kept.some((prior) => prior.className === className && run.every((p) => distanceToRun(p, prior.run) <= 0.5))) continue
      kept.push({ className, run })
      roads.push({ id: `${feature.id ?? 'anonymous'}-${roads.length}`, highway, width, centreline: run })
    }
  }
  return roads
}
export function extractLandCover(features: readonly TileFeature[], frame: ImportFrame, origin: Origin = frame): LandCoverArea[] {
  const areas: LandCoverArea[] = []
  const extent = frameBounds(frame, origin).enu
  for (const f of features) {
    const kind = f.layer === 'park' ? 'park' : f.layer === 'water' ? 'water' : f.layer === 'landcover' && (f.properties.class === 'grass' || f.properties.class === 'wood') ? f.properties.class : null
    if (!kind) continue
    for (const outer of outerRings(f.geometry)) for (const ring of repairRing(clipRing(toLocal(outer, origin), extent))) {
      areas.push({ id: `${f.layer}-${f.id ?? 'anonymous'}-${areas.length}`, kind, ring })
    }
  }
  return areas
}
