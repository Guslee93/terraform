import { featureCollection, polygon, union } from '@turf/turf'
import { polygonArea } from '../../lib/polygon'
import type { Footprint, MassTier, MassVolume, ScenarioDocument } from './types'

export function tierHeight(tier: MassTier): number {
  return tier.storeys * tier.storeyHeight
}

export function tierTop(tier: MassTier): number {
  return tier.baseElevation + tierHeight(tier)
}

export function tierFootprintArea(tier: MassTier): number {
  return polygonArea(tier.footprint.vertices)
}

export function tierGfa(tier: MassTier): number {
  return tierFootprintArea(tier) * tier.storeys
}

export function tierVolume(tier: MassTier): number {
  return tierFootprintArea(tier) * tierHeight(tier)
}

function featureFromFootprint(footprint: Footprint) {
  const vertices = footprint.vertices
  const first = vertices[0]
  if (!first) throw new Error('Cannot build a polygon from an empty footprint')
  const ring = [...vertices, first].map(([east, north]) => [east, north])
  return polygon([ring])
}

function planarRingArea(ring: readonly (readonly number[])[]): number {
  let area = 0
  const count = ring.length
  for (let index = 0; index < count; index += 1) {
    const current = ring[index]
    const next = ring[(index + 1) % count]
    if (!current || !next) continue
    const x1 = current[0] ?? 0
    const y1 = current[1] ?? 0
    const x2 = next[0] ?? 0
    const y2 = next[1] ?? 0
    area += x1 * y2 - x2 * y1
  }
  return area / 2
}

function planarPolygonArea(rings: readonly (readonly (readonly number[])[])[]): number {
  const outer = rings[0]
  if (!outer) return 0
  let area = Math.abs(planarRingArea(outer))
  for (let index = 1; index < rings.length; index += 1) {
    const hole = rings[index]
    if (hole) area -= Math.abs(planarRingArea(hole))
  }
  return Math.max(area, 0)
}

/** Area of the union of footprints projected to the ground, in square metres. */
export function unionFootprintArea(footprints: readonly Footprint[]): number {
  if (footprints.length === 0) return 0
  if (footprints.length === 1) {
    const only = footprints[0]
    return only ? polygonArea(only.vertices) : 0
  }

  const merged = union(featureCollection(footprints.map(featureFromFootprint)))
  if (!merged) return 0

  if (merged.geometry.type === 'Polygon') {
    return planarPolygonArea(merged.geometry.coordinates)
  }
  return merged.geometry.coordinates.reduce(
    (total, polygonCoordinates) => total + planarPolygonArea(polygonCoordinates),
    0,
  )
}

export function volumeGroundFootprintArea(volume: MassVolume): number {
  return unionFootprintArea(volume.tiers.map((tier) => tier.footprint))
}

export function volumeGfa(volume: MassVolume): number {
  return volume.tiers.reduce((total, tier) => total + tierGfa(tier), 0)
}

export function volumeVolume(volume: MassVolume): number {
  return volume.tiers.reduce((total, tier) => total + tierVolume(tier), 0)
}

export function volumeMaxHeight(volume: MassVolume): number {
  return volume.tiers.reduce((maximum, tier) => Math.max(maximum, tierTop(tier)), -Infinity)
}

export function scenarioGfa(document: ScenarioDocument): number {
  return document.volumes.reduce((total, volume) => total + volumeGfa(volume), 0)
}

export function scenarioVolume(document: ScenarioDocument): number {
  return document.volumes.reduce((total, volume) => total + volumeVolume(volume), 0)
}

/** Highest tier top relative to the site origin; may be negative on sloped sites. 0 when empty. */
export function scenarioMaxHeight(document: ScenarioDocument): number {
  if (document.volumes.length === 0) return 0
  return document.volumes.reduce(
    (maximum, volume) => Math.max(maximum, volumeMaxHeight(volume)),
    -Infinity,
  )
}

export function scenarioGroundFootprintArea(document: ScenarioDocument): number {
  const footprints = document.volumes.flatMap((volume) =>
    volume.tiers.map((tier) => tier.footprint),
  )
  return unionFootprintArea(footprints)
}

export function scenarioCoverage(document: ScenarioDocument, studyAreaM2: number): number {
  if (!(studyAreaM2 > 0)) return 0
  return scenarioGroundFootprintArea(document) / studyAreaM2
}
