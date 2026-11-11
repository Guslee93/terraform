import type { LandCoverArea, LandCoverKind, Road } from '../sites/package'
import { frameBounds, type ImportFrame, type Origin } from './frame'
import { clipPolyline, clipRing, lineToRibbon, outerRings, repairRing, toLocal, type Point2, type Ring } from './geometry'
import type { TileFeature } from './tiles'
/** Kept equal to scripts/spike-import.mjs (the C3 reference is intentionally unchanged). */
export const ROAD_WIDTHS: Readonly<Record<string, number>> = {
  motorway: 14, trunk: 12, primary: 12, secondary: 10, tertiary: 8,
  residential: 6, unclassified: 6, living_street: 5, service: 4,
  pedestrian: 5, footway: 2.5, path: 2, cycleway: 2.5, steps: 2, track: 3,
}

/**
 * Widths for the OpenMapTiles `path` class, which mixes pedestrian streets, footways,
 * cycleways, steps, passages and transit platforms. The OSM subclass says which one it is.
 */
const PATH_WIDTHS: Readonly<Record<string, number>> = {
  pedestrian: 5, footway: 2.5, cycleway: 2.5, path: 2, steps: 2, bridleway: 2, corridor: 2,
}

/** Waterway classes drawn as a surface. Drains and ditches are too small to matter. */
const WATERWAY_WIDTHS: Readonly<Record<string, number>> = { river: 10, canal: 6, stream: 4 }

/** `landcover` subclasses that are a park or a garden rather than open grass. */
const PARK_SUBCLASSES = new Set([
  'park', 'garden', 'village_green', 'recreation_ground', 'golf_course',
])

/** Transportation polygons that are paved ground rather than a bridge deck or a pier. */
const PLAZA_SUBCLASSES = new Set(['pedestrian', 'footway'])

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
    const subclass = typeof feature.properties.subclass === 'string' ? feature.properties.subclass : undefined
    // A transit platform is a structure on the street, not a street.
    if (className === 'path' && subclass === 'platform') continue
    const highway = className === 'minor'
      ? 'residential'
      : className === 'path'
        ? subclass ?? 'footway'
        : className
    const width = className === 'path' ? PATH_WIDTHS[highway] : ROAD_WIDTHS[highway]
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

/**
 * The ground tint for a polygon feature. The OpenMapTiles `park` layer holds protected areas
 * rather than urban parks; urban parks arrive as `landcover` grass with a park subclass.
 */
function landCoverKind(feature: TileFeature): LandCoverKind | null {
  if (feature.layer === 'park') return 'nature'
  if (feature.layer === 'water') return 'water'
  if (feature.layer !== 'landcover') return null
  const className = feature.properties.class
  if (className === 'wood') return 'wood'
  if (className !== 'grass') return null
  const subclass = typeof feature.properties.subclass === 'string' ? feature.properties.subclass : undefined
  return subclass && PARK_SUBCLASSES.has(subclass) ? 'park' : 'grass'
}
export function extractLandCover(features: readonly TileFeature[], frame: ImportFrame, origin: Origin = frame): LandCoverArea[] {
  const areas: LandCoverArea[] = []
  const extent = frameBounds(frame, origin).enu
  for (const f of features) {
    if (f.layer === 'waterway') {
      // Rivers and streams mapped as lines become illustrative ribbons of water.
      const className = f.properties.class
      const width = typeof className === 'string' ? WATERWAY_WIDTHS[className] : undefined
      if (!width) continue
      const g = f.geometry
      const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []
      for (const line of lines) for (const run of clipPolyline(toLocal(line, origin), extent)) {
        for (const ring of repairRing(clipRing(lineToRibbon(run, width), extent))) {
          areas.push({ id: `waterway-${f.id ?? 'anonymous'}-${areas.length}`, kind: 'water', ring })
        }
      }
      continue
    }
    if (f.layer === 'transportation') {
      // Plazas and pedestrian areas are polygons in the transportation layer, not centrelines.
      const subclass = typeof f.properties.subclass === 'string' ? f.properties.subclass : undefined
      if (!subclass || !PLAZA_SUBCLASSES.has(subclass)) continue
      for (const outer of outerRings(f.geometry)) {
        for (const ring of repairRing(clipRing(toLocal(outer, origin), extent))) {
          areas.push({ id: `plaza-${f.id ?? 'anonymous'}-${areas.length}`, kind: 'plaza', ring })
        }
      }
      continue
    }
    const kind = landCoverKind(f)
    if (!kind) continue
    for (const outer of outerRings(f.geometry)) for (const ring of repairRing(clipRing(toLocal(outer, origin), extent))) {
      areas.push({ id: `${f.layer}-${f.id ?? 'anonymous'}-${areas.length}`, kind, ring })
    }
  }
  return areas
}
