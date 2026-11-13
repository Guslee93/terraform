import { pointInPolygon } from '../../lib/polygon'
import type { LandCoverArea } from '../sites/package'
import { frameBounds, type ImportFrame } from './frame'
import { clipPolyline, clipRing, lineToRibbon, repairRing, toLocal, type Point2, type Ring } from './geometry'
import { wayPoints, type OsmData, type OsmWay } from './osm'

/**
 * The water of a frame, read from OpenStreetMap's own geometry (ADR-0027).
 *
 * The vector tiles carry water as a *generalised* outline: at the z14 the OpenMapTiles planet
 * tiles stop at, the Nidelva at Trondheim arrives with stair-stepped edges along the tile grid,
 * and the river's centre line is drawn again as a ribbon on top of the same water. The outline
 * itself is the defect, so the studio reads the mapped geometry instead: the closed ways that
 * map the river's surface, the relations that map a wider water body, and the centre lines of
 * the watercourses that have no area at all.
 */

/** A mapped water body: a closed area, or a watercourse mapped as a line. */
export type WaterGeometry =
  | { kind: 'area'; id: string; ring: [number, number][] }
  | { kind: 'line'; id: string; run: [number, number][]; width: number }

/** Widths for a watercourse mapped as a line, in metres. Illustrative, like the road widths. */
export const WATERWAY_WIDTHS: Readonly<Record<string, number>> = { river: 10, canal: 6, stream: 4 }

/** The tags that map a water area, matching the curated builder (ADR-0005, LANDCOVER_TAGS). */
const AREA_TAGS: readonly (readonly [string, string])[] = [
  ['natural', 'water'],
  ['waterway', 'riverbank'],
  ['landuse', 'reservoir'],
  ['landuse', 'basin'],
]

/** The tags that map a watercourse as a line rather than as an area. */
const LINE_TAGS: readonly string[] = ['river', 'canal', 'stream']

function isAreaTag(tags: Record<string, string>): boolean {
  return AREA_TAGS.some(([key, value]) => tags[key] === value)
}

function lineTag(tags: Record<string, string>): string | null {
  const waterway = tags.waterway
  return typeof waterway === 'string' && LINE_TAGS.includes(waterway) ? waterway : null
}

/** The mapped width of a watercourse, in metres. The tag is free text, so it is read leniently. */
function taggedWidth(tags: Record<string, string>): number | null {
  const raw = tags.width
  if (typeof raw !== 'string') return null
  const value = Number.parseFloat(raw.replace(',', '.'))
  return Number.isFinite(value) && value > 0 && value < 500 ? value : null
}

const samePoint = (a: Point2, b: Point2) => Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7

/** Join 2 rings that share an endpoint, in either direction. */
function joinRings(a: Ring, b: Ring): Ring | null {
  const aFirst = a[0]!, aLast = a[a.length - 1]!
  const bFirst = b[0]!, bLast = b[b.length - 1]!
  if (samePoint(aLast, bFirst)) return [...a, ...b.slice(1)]
  if (samePoint(bLast, aFirst)) return [...b, ...a.slice(1)]
  if (samePoint(aFirst, bFirst)) return [...[...b].reverse(), ...a.slice(1)]
  if (samePoint(aLast, bLast)) return [...a, ...[...b].reverse().slice(1)]
  return null
}

/**
 * Stitch the member ways of a relation into closed rings.
 *
 * The relation's members are separate ways that share endpoints; the order in the response is
 * not guaranteed, so the rings are joined by matching endpoints until nothing more fits.
 */
export function stitchRings(rings: readonly Ring[]): Ring[] {
  const remaining = rings.filter((ring) => ring.length >= 2).map((ring) => [...ring])
  let joined = true
  while (joined && remaining.length > 1) {
    joined = false
    for (let i = 0; i < remaining.length && !joined; i += 1) {
      for (let j = 0; j < remaining.length && !joined; j += 1) {
        if (i === j) continue
        const merged = joinRings(remaining[i]!, remaining[j]!)
        if (!merged) continue
        remaining.splice(j, 1)
        remaining[i] = merged
        joined = true
      }
    }
  }
  return remaining
    .filter((ring) => ring.length >= 4 && samePoint(ring[0]!, ring[ring.length - 1]!))
    .map((ring) => ring.slice(0, -1))
}

/** The water of an OpenStreetMap response, as [lon, lat] geometry. */
export function parseOsmWater(data: OsmData): WaterGeometry[] {
  const wayById = new Map<string, OsmWay>(data.ways.map((way) => [way.id, way]))
  const geometry: WaterGeometry[] = []

  for (const way of data.ways) {
    const points = wayPoints(data, way)
    if (points.length < 2) continue
    const closed = way.refs.length > 2 && way.refs[0] === way.refs[way.refs.length - 1]
    if (isAreaTag(way.tags) && closed) {
      geometry.push({ kind: 'area', id: `way/${way.id}`, ring: points })
      continue
    }
    const className = lineTag(way.tags)
    if (className && !closed) {
      geometry.push({
        kind: 'line',
        id: `way/${way.id}`,
        run: points,
        width: taggedWidth(way.tags) ?? WATERWAY_WIDTHS[className]!,
      })
    }
  }

  for (const relation of data.relations) {
    if (!isAreaTag(relation.tags)) continue
    const outer = relation.members
      .filter((member) => member.type === 'way' && (member.role === 'outer' || member.role === ''))
      .map((member) => wayById.get(member.ref))
      .filter((way): way is OsmWay => way !== undefined)
      .map((way) => wayPoints(data, way))
    for (const ring of stitchRings(outer)) {
      geometry.push({ kind: 'area', id: `relation/${relation.id}`, ring })
    }
  }

  return geometry
}

/** The share of a run that lies inside one of the mapped water areas. */
function insideAreaShare(run: readonly Point2[], areas: readonly Ring[]): number {
  if (!areas.length || !run.length) return 0
  let inside = 0
  for (const point of run) if (areas.some((area) => pointInPolygon(point, area))) inside += 1
  return inside / run.length
}

/**
 * The repair can reject a ring it cannot make simple. One unmappable body must not fail the
 * whole import, so a body that cannot be repaired is left out.
 */
function safeRepair(points: Ring): Ring[] {
  try {
    return repairRing(points, 4)
  } catch {
    return []
  }
}

/**
 * The water of a frame as the studio's land-cover areas, in local ENU metres.
 *
 * The areas are drawn from the mapped outline. A watercourse that runs inside a mapped area is
 * the same water seen from its centre line, so the area is drawn and the centre line is not.
 */
export function waterAreas(geometry: readonly WaterGeometry[], frame: ImportFrame): LandCoverArea[] {
  const extent = frameBounds(frame).enu
  const areas: LandCoverArea[] = []
  const areaRings: Ring[] = []

  for (const item of geometry) {
    if (item.kind !== 'area') continue
    const local = toLocal(item.ring, frame)
    const repaired = safeRepair(clipRing(local, extent))
    repaired.forEach((ring, index) => {
      areaRings.push(ring)
      areas.push({ id: repaired.length === 1 ? item.id : `${item.id}-${index + 1}`, kind: 'water', ring })
    })
  }

  for (const item of geometry) {
    if (item.kind !== 'line') continue
    const local = toLocal(item.run, frame)
    let index = 0
    for (const run of clipPolyline(local, extent)) {
      // The same water twice: the area carries the real width, the centre line only the course.
      if (insideAreaShare(run, areaRings) >= 0.5) continue
      for (const ring of safeRepair(lineToRibbon(run, item.width))) {
        index += 1
        areas.push({ id: index === 1 ? item.id : `${item.id}-${index}`, kind: 'water', ring })
      }
    }
  }

  return areas
}
