import type { Vec2 } from '../../lib/coordinates'
import {
  differencePolygons,
  intersectPolygons,
  multiPolygonArea,
  unionPolygons,
  type MultiPolygonRings,
} from '../../lib/clip'
import { polygonArea } from '../../lib/polygon'
import { footprintUnion, scenarioVolume, volumeMaxHeight, volumeVolume } from './aggregate'
import type { MassTier, MassVolume, ScenarioDocument } from './types'

/**
 * Scenario metrics for the M3 cards (FR-050–FR-055), defined in ADR-0007.
 *
 * Concept GFA is level-indexed: every storey of every tier contributes one floor plate at its
 * own base elevation; plates within `LEVEL_TOLERANCE_M` of each other form one level, and a
 * level's area is the union of its plates. Nothing is inferred from mesh overlap and no slab is
 * counted twice. None of these numbers is a statutory floor-area or utilisation figure.
 */

/** Plates closer than this in elevation are the same level. */
export const LEVEL_TOLERANCE_M = 0.1

export type FloorLevel = {
  /** Lowest plate elevation in the level, metres above the site origin. */
  readonly elevation: number
  /** Union of the plates at this level, m². */
  readonly areaM2: number
}

export type VolumeMetrics = {
  readonly volumeId: string
  readonly name: string
  readonly gfaM2: number
  readonly groundFootprintM2: number
  readonly volumeM3: number
  readonly maxHeightM: number
  /** Ascending by elevation; `storeys.length` is the storey count. */
  readonly storeys: readonly FloorLevel[]
}

export type ScenarioMetrics = {
  /** Level-indexed union across every volume in the document. */
  readonly gfaM2: number
  /** Σ perVolume.gfaM2; exceeds `gfaM2` only when buildings interpenetrate. */
  readonly gfaByBuildingM2: number
  readonly groundFootprintM2: number
  readonly footprintWithinParcelM2: number
  readonly footprintOutsideParcelM2: number
  readonly parcelAreaM2: number
  /** footprintWithinParcelM2 / parcelAreaM2, as a ratio (0.108 for 10.8 %). */
  readonly coverageWithinParcel: number
  /** gfaM2 / parcelAreaM2 — `Concept GFA ratio`, never BRA/BYA (FR-055). */
  readonly conceptGfaRatio: number
  readonly volumeM3: number
  readonly maxHeightM: number
  readonly buildingCount: number
  readonly perVolume: readonly VolumeMetrics[]
}

type Plate = { elevation: number; ring: readonly Vec2[] }

function tierPlates(tier: MassTier): Plate[] {
  const plates: Plate[] = []
  for (let storey = 0; storey < tier.storeys; storey += 1) {
    plates.push({ elevation: tier.baseElevation + storey * tier.storeyHeight, ring: tier.footprint.vertices })
  }
  return plates
}

/** Group plates into levels by elevation and union each level's plates. */
export function floorLevels(tiers: readonly MassTier[]): FloorLevel[] {
  const plates = tiers.flatMap(tierPlates).sort((a, b) => a.elevation - b.elevation)
  const levels: FloorLevel[] = []
  let group: Plate[] = []
  const flush = () => {
    const first = group[0]
    if (!first) return
    const area =
      group.length === 1
        ? polygonArea(first.ring)
        : multiPolygonArea(unionPolygons(group.map((plate) => [plate.ring])))
    levels.push({ elevation: first.elevation, areaM2: area })
    group = []
  }
  for (const plate of plates) {
    const first = group[0]
    if (first && plate.elevation - first.elevation >= LEVEL_TOLERANCE_M) flush()
    group.push(plate)
  }
  flush()
  return levels
}

export function volumeMetrics(volume: MassVolume): VolumeMetrics {
  const storeys = floorLevels(volume.tiers)
  return {
    volumeId: volume.id,
    name: volume.name,
    gfaM2: storeys.reduce((total, level) => total + level.areaM2, 0),
    groundFootprintM2: multiPolygonArea(footprintUnion(volume.tiers.map((tier) => tier.footprint))),
    volumeM3: volumeVolume(volume),
    maxHeightM: volume.tiers.length === 0 ? 0 : volumeMaxHeight(volume),
    storeys,
  }
}

/** Level-indexed GFA across the whole document, so interpenetrating buildings do not double count. */
export function scenarioLevelGfa(document: ScenarioDocument): number {
  return floorLevels(document.volumes.flatMap((volume) => volume.tiers)).reduce(
    (total, level) => total + level.areaM2,
    0,
  )
}

/**
 * Ground footprint split by the parcel (FR-054). `parcel` is the open study-boundary ring in
 * ENU metres; a footprint fully outside contributes nothing to coverage.
 */
export function parcelCoverage(
  ground: MultiPolygonRings,
  parcel: readonly Vec2[],
): { withinM2: number; outsideM2: number; parcelAreaM2: number } {
  const parcelAreaM2 = polygonArea(parcel)
  const groundM2 = multiPolygonArea(ground)
  if (groundM2 === 0 || parcelAreaM2 === 0) return { withinM2: 0, outsideM2: groundM2, parcelAreaM2 }
  const withinM2 = multiPolygonArea(intersectPolygons(ground, [[parcel]]))
  const outsideM2 = multiPolygonArea(differencePolygons(ground, [[parcel]]))
  return { withinM2, outsideM2, parcelAreaM2 }
}

export function scenarioMetrics(document: ScenarioDocument, parcel: readonly Vec2[]): ScenarioMetrics {
  const perVolume = document.volumes.map(volumeMetrics)
  const ground = footprintUnion(document.volumes.flatMap((volume) => volume.tiers.map((tier) => tier.footprint)))
  const coverage = parcelCoverage(ground, parcel)
  const gfaM2 = scenarioLevelGfa(document)
  return {
    gfaM2,
    gfaByBuildingM2: perVolume.reduce((total, volume) => total + volume.gfaM2, 0),
    groundFootprintM2: multiPolygonArea(ground),
    footprintWithinParcelM2: coverage.withinM2,
    footprintOutsideParcelM2: coverage.outsideM2,
    parcelAreaM2: coverage.parcelAreaM2,
    coverageWithinParcel: coverage.parcelAreaM2 > 0 ? coverage.withinM2 / coverage.parcelAreaM2 : 0,
    conceptGfaRatio: coverage.parcelAreaM2 > 0 ? gfaM2 / coverage.parcelAreaM2 : 0,
    volumeM3: scenarioVolume(document),
    maxHeightM: perVolume.reduce((maximum, volume) => Math.max(maximum, volume.maxHeightM), 0),
    buildingCount: document.volumes.length,
    perVolume,
  }
}
