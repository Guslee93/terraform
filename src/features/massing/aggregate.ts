import { multiPolygonArea, unionPolygons, type MultiPolygonRings } from '../../lib/clip'
import { polygonArea } from '../../lib/polygon'
import type { Footprint, MassTier, MassVolume, ScenarioDocument } from './types'

export function tierHeight(tier: Pick<MassTier, 'storeys' | 'storeyHeight'>): number {
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

/** Ground union of footprints as planar polygons (outer ring + holes). */
export function footprintUnion(footprints: readonly Footprint[]): MultiPolygonRings {
  return unionPolygons(footprints.map((footprint) => [footprint.vertices]))
}

/** Area of the union of footprints projected to the ground, in square metres. */
export function unionFootprintArea(footprints: readonly Footprint[]): number {
  return multiPolygonArea(footprintUnion(footprints))
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
