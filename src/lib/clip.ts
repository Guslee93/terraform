import { difference, featureCollection, intersect, polygon, union } from '@turf/turf'
import type { Feature, MultiPolygon, Polygon, Position } from 'geojson'
import type { Vec2 } from './coordinates'
import { polygonArea, signedArea } from './polygon'

/**
 * Planar polygon booleans on local ENU metres. Turf's union/intersect/difference are
 * coordinate-agnostic (polyclip), so they are exact here; turf's buffer and area are geodesic
 * and must not be used on ENU coordinates (ADR-0002).
 *
 * A `Ring` is an open ring; a `PolygonRings` is an outer ring followed by holes.
 */
export type Ring = readonly Vec2[]
export type PolygonRings = readonly Ring[]
export type MultiPolygonRings = readonly PolygonRings[]

type Geometry = Feature<Polygon | MultiPolygon> | null

function closeRing(ring: Ring): Position[] {
  const first = ring[0]
  if (!first) throw new Error('Cannot build a polygon from an empty ring')
  return [...ring.map(([east, north]) => [east, north]), [first[0], first[1]]]
}

function toFeature(rings: PolygonRings): Feature<Polygon> {
  return polygon(rings.map(closeRing))
}

/** GeoJSON rings back to open ENU rings, dropping the closing vertex and degenerate rings. */
function fromGeometry(geometry: Geometry): MultiPolygonRings {
  if (!geometry) return []
  const polygons =
    geometry.geometry.type === 'Polygon'
      ? [geometry.geometry.coordinates]
      : geometry.geometry.coordinates
  const result: PolygonRings[] = []
  for (const rings of polygons) {
    const converted = rings
      .map((ring) => {
        const open = ring.slice(0, -1).map((position): Vec2 => [position[0] ?? 0, position[1] ?? 0])
        return open
      })
      .filter((ring) => ring.length >= 3 && polygonArea(ring) > 0)
    if (converted[0]) result.push(converted)
  }
  return result
}

function collection(polygons: MultiPolygonRings) {
  return featureCollection(polygons.map(toFeature))
}

/** Union of polygons; an empty input gives an empty result. */
export function unionPolygons(polygons: MultiPolygonRings): MultiPolygonRings {
  const valid = polygons.filter((rings) => rings[0] && rings[0].length >= 3)
  if (valid.length === 0) return []
  if (valid.length === 1) return valid
  return fromGeometry(union(collection(valid)))
}

/** Area shared by `a` and `b`. */
export function intersectPolygons(a: MultiPolygonRings, b: MultiPolygonRings): MultiPolygonRings {
  if (a.length === 0 || b.length === 0) return []
  const left = unionPolygons(a)
  const right = unionPolygons(b)
  if (left.length === 0 || right.length === 0) return []
  return fromGeometry(intersect(featureCollection([toMulti(left), toMulti(right)])))
}

/** Area of `a` not covered by `b`. */
export function differencePolygons(a: MultiPolygonRings, b: MultiPolygonRings): MultiPolygonRings {
  const left = unionPolygons(a)
  if (left.length === 0) return []
  const right = unionPolygons(b)
  if (right.length === 0) return left
  return fromGeometry(difference(featureCollection([toMulti(left), toMulti(right)])))
}

function toMulti(polygons: MultiPolygonRings): Feature<MultiPolygon> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiPolygon',
      coordinates: polygons.map((rings) => rings.map(closeRing)),
    },
  }
}

/** Planar area in m²: outer rings minus holes. */
export function multiPolygonArea(polygons: MultiPolygonRings): number {
  let total = 0
  for (const rings of polygons) {
    const [outer, ...holes] = rings
    if (!outer) continue
    let area = Math.abs(signedArea(outer))
    for (const hole of holes) area -= Math.abs(signedArea(hole))
    total += Math.max(area, 0)
  }
  return total
}

/** Outer rings only, for layers that draw outlines. */
export function outerRings(polygons: MultiPolygonRings): Ring[] {
  return polygons.flatMap((rings) => (rings[0] ? [rings[0]] : []))
}

/** Segments per full circle for round joins at reflex corners of `insetPolygon`. */
const INSET_ARC_SEGMENTS = 48

/**
 * Planar inward offset of a simple ring by `distance` metres: the ring's area minus every
 * point within `distance` of its boundary. Exact along edges; reflex corners are rounded with
 * an inscribed 48-gon, so the setback there is up to 0.2 % short. Robust for concave rings:
 * the result may be several polygons or empty when the ring is too narrow.
 */
export function insetPolygon(ring: Ring, distance: number): MultiPolygonRings {
  if (!(distance >= 0) || !Number.isFinite(distance)) throw new Error('Inset distance must be a finite, non-negative number')
  if (ring.length < 3) return []
  if (distance === 0) return [[ring]]

  const strips: PolygonRings[] = []
  const disc: Vec2[] = []
  for (let step = 0; step < INSET_ARC_SEGMENTS; step += 1) {
    const angle = (2 * Math.PI * step) / INSET_ARC_SEGMENTS
    disc.push([Math.cos(angle) * distance, Math.sin(angle) * distance])
  }
  for (let index = 0; index < ring.length; index += 1) {
    const a = ring[index]
    const b = ring[(index + 1) % ring.length]
    if (!a || !b) continue
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (length === 0) continue
    const nx = (-(b[1] - a[1]) / length) * distance
    const ny = ((b[0] - a[0]) / length) * distance
    strips.push([
      [
        [a[0] - nx, a[1] - ny],
        [b[0] - nx, b[1] - ny],
        [b[0] + nx, b[1] + ny],
        [a[0] + nx, a[1] + ny],
      ],
    ])
    strips.push([disc.map(([x, y]): Vec2 => [a[0] + x, a[1] + y])])
  }
  return differencePolygons([[ring]], strips)
}
