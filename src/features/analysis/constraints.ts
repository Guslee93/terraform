import {
  differencePolygons,
  insetPolygon,
  multiPolygonArea,
  outerRings,
  type MultiPolygonRings,
  type Ring,
} from '../../lib/clip'
import { tierTop } from '../massing/aggregate'
import { footprintSamplePoints, type SiteContext } from '../massing/clearance'
import type { MassVolume, ScenarioDocument } from '../massing/types'

/**
 * Demo constraint envelope (FR-070–FR-075). Everything here is an illustrative design check
 * against limits the site package declares; it is not a regulation, a parcel or a compliance
 * statement, and every surface that shows it carries `CONSTRAINT_DISCLAIMER`.
 */

export const CONSTRAINT_DISCLAIMER = 'Illustrative constraint — not planning advice'

export type HeightReference = 'grade' | 'datum'

export type EnvelopeConstraints = {
  /** Maximum height in metres above the reference; omit to skip the height check. */
  readonly maxHeightM?: number
  /** Inward setback from the study boundary in metres; omit to skip the setback check. */
  readonly setbackM?: number
  /** ADR-0008: `grade` = lowest sampled terrain under the mass; `datum` = site origin (z = 0). */
  readonly heightReference: HeightReference
}

export type EnvelopeSite = SiteContext & {
  readonly constraints: EnvelopeConstraints | null
}

export type EnvelopeStatus = 'within' | 'exceeds' | 'not-evaluated'

export type EnvelopeReason = 'outside-boundary' | 'outside-setback' | 'too-tall'

export const ENVELOPE_STATUS_LABEL: Record<EnvelopeStatus, string> = {
  within: 'Within demo envelope',
  exceeds: 'Exceeds demo envelope',
  'not-evaluated': 'Not evaluated',
}

export type VolumeEnvelope = {
  readonly volumeId: string
  readonly status: EnvelopeStatus
  readonly reasons: readonly EnvelopeReason[]
  /** Footprint parts outside the study boundary (outer rings), for highlighting. */
  readonly outsideBoundaryRings: readonly Ring[]
  /** Footprint parts outside the setback line, including the parts outside the boundary. */
  readonly outsideSetbackRings: readonly Ring[]
  /** Highest tier top above the reference, metres. */
  readonly heightM: number
  /** Reference elevation used, metres above the site origin (0 for `datum`). */
  readonly referenceElevationM: number
  /** heightM − maxHeightM when positive, else 0. */
  readonly heightExcessM: number
}

export type EnvelopeResult = {
  readonly status: EnvelopeStatus
  readonly heightReference: HeightReference
  /** Setback polygons for the scene layer, or null when no setback is configured. */
  readonly setbackPolygon: readonly Ring[] | null
  readonly perVolume: readonly VolumeEnvelope[]
  readonly disclaimer: typeof CONSTRAINT_DISCLAIMER
}

/** Clipping slivers below this area are not violations (touching edges, shared vertices). */
export const ENVELOPE_AREA_TOLERANCE_M2 = 0.01
/** Height excess below this is not a violation (float noise from drags and imports). */
export const ENVELOPE_HEIGHT_TOLERANCE_M = 0.001

/**
 * ADR-0008 reference elevation for a volume: `datum` is the site origin; `grade` is the lowest
 * terrain sample under the tiers that meet the ground (the tallest exposed face).
 */
export function referenceElevation(volume: MassVolume, site: EnvelopeSite, reference: HeightReference): number {
  if (reference === 'datum') return 0
  const lowestBase = Math.min(...volume.tiers.map((tier) => tier.baseElevation))
  let lowest = Infinity
  for (const tier of volume.tiers) {
    if (tier.baseElevation !== lowestBase) continue
    for (const [east, north] of footprintSamplePoints(tier.footprint)) {
      lowest = Math.min(lowest, site.heightAt(east, north))
    }
  }
  return Number.isFinite(lowest) ? lowest : 0
}

function significantRings(parts: MultiPolygonRings): Ring[] {
  return outerRings(parts.filter((rings) => multiPolygonArea([rings]) > ENVELOPE_AREA_TOLERANCE_M2))
}

export function evaluateEnvelope(document: ScenarioDocument, site: EnvelopeSite): EnvelopeResult {
  const constraints = site.constraints
  const heightReference = constraints?.heightReference ?? 'grade'
  const checkHeight = constraints?.maxHeightM !== undefined
  const checkSetback = constraints?.setbackM !== undefined
  const parcel: MultiPolygonRings = [[site.studyArea]]
  const setback = checkSetback ? insetPolygon(site.studyArea, constraints.setbackM ?? 0) : null

  if (!constraints || (!checkHeight && !checkSetback)) {
    return {
      status: 'not-evaluated',
      heightReference,
      setbackPolygon: null,
      perVolume: document.volumes.map((volume) => ({
        volumeId: volume.id,
        status: 'not-evaluated',
        reasons: [],
        outsideBoundaryRings: [],
        outsideSetbackRings: [],
        heightM: 0,
        referenceElevationM: 0,
        heightExcessM: 0,
      })),
      disclaimer: CONSTRAINT_DISCLAIMER,
    }
  }

  const perVolume = document.volumes.map((volume): VolumeEnvelope => {
    const reasons: EnvelopeReason[] = []
    const footprints: MultiPolygonRings = volume.tiers.map((tier) => [tier.footprint.vertices])

    let outsideBoundaryRings: Ring[] = []
    let outsideSetbackRings: Ring[] = []
    if (setback) {
      outsideBoundaryRings = significantRings(differencePolygons(footprints, parcel))
      outsideSetbackRings = significantRings(differencePolygons(footprints, setback))
      if (outsideBoundaryRings.length > 0) reasons.push('outside-boundary')
      if (outsideSetbackRings.length > 0) reasons.push('outside-setback')
    }

    const referenceElevationM = referenceElevation(volume, site, heightReference)
    const heightM = Math.max(...volume.tiers.map((tier) => tierTop(tier))) - referenceElevationM
    let heightExcessM = 0
    if (checkHeight) {
      const excess = heightM - (constraints.maxHeightM ?? 0)
      if (excess > ENVELOPE_HEIGHT_TOLERANCE_M) {
        heightExcessM = excess
        reasons.push('too-tall')
      }
    }

    return {
      volumeId: volume.id,
      status: reasons.length > 0 ? 'exceeds' : 'within',
      reasons,
      outsideBoundaryRings,
      outsideSetbackRings,
      heightM,
      referenceElevationM,
      heightExcessM,
    }
  })

  return {
    status: perVolume.some((volume) => volume.status === 'exceeds') ? 'exceeds' : 'within',
    heightReference,
    setbackPolygon: setback ? outerRings(setback) : null,
    perVolume,
    disclaimer: CONSTRAINT_DISCLAIMER,
  }
}

/** Convenience for the manifest's constraints block; the reference is the caller's choice (ADR-0008). */
export function constraintsFromManifest(
  manifest: { readonly maxHeightMeters: number; readonly setbackMeters: number },
  heightReference: HeightReference = 'grade',
): EnvelopeConstraints {
  return { maxHeightM: manifest.maxHeightMeters, setbackM: manifest.setbackMeters, heightReference }
}
