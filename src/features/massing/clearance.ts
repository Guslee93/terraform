import type { Vec2 } from '../../lib/coordinates'
import { pointInPolygon, polygonArea, segmentsIntersect } from '../../lib/polygon'
import type { Footprint, MassTier, ScenarioDocument } from './types'

/**
 * Scenario-level clearance warnings (ADR-0004 §4, M2 deliverable 9, QA-06). Renderer-free:
 * the caller supplies the study boundary and a terrain sampler in local ENU metres.
 * These are illustrative design warnings, never validation errors, and nothing is
 * auto-corrected.
 */

/** Gap under a mass, in metres, before it counts as floating. Illustrative threshold. */
export const FLOAT_TOLERANCE_M = 0.5
// A cut is flagged only when the slope buries more than one storey of the ground tier:
// a shallow plinth cut is normal, a buried storey is a condition the massing does not model.

export type SiteContext = {
  /** Open ring of the authored study boundary (not a cadastral parcel). */
  readonly studyArea: readonly Vec2[]
  /** Terrain height relative to the site origin. */
  readonly heightAt: (east: number, north: number) => number
}

export type ClearanceIssue = {
  readonly kind: 'boundary-crossing' | 'boundary-outside' | 'floating' | 'cut'
  readonly message: string
  /** Metres, for terrain issues. */
  readonly amount?: number
}

type BoundaryState = 'inside' | 'crossing' | 'outside'

function boundaryState(footprint: Footprint, studyArea: readonly Vec2[]): BoundaryState {
  const ring = footprint.vertices
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    if (!a || !b) continue
    for (let j = 0; j < studyArea.length; j += 1) {
      const c = studyArea[j]
      const d = studyArea[(j + 1) % studyArea.length]
      if (c && d && segmentsIntersect(a, b, c, d)) return 'crossing'
    }
  }
  if (ring.every((point) => pointInPolygon(point, studyArea))) return 'inside'
  // No edge contact and not inside: outside, unless the mass encloses the whole study area.
  const corner = studyArea[0]
  return corner && pointInPolygon(corner, ring) ? 'crossing' : 'outside'
}

/**
 * Terrain sample points for a footprint: corners, points along each edge and an interior
 * grid, so a hump or dip inside the outline is found as well as one under a corner.
 */
export function footprintSamplePoints(footprint: Footprint): Vec2[] {
  const ring = footprint.vertices
  // ponytail: fixed-density grid, ~15 samples per side; switch to terrain-cell nodes if precision matters.
  const spacing = Math.max(2, Math.sqrt(polygonArea(ring)) / 15)
  const points: Vec2[] = [...ring]

  ring.forEach((a, index) => {
    const b = ring[(index + 1) % ring.length]
    if (!b) return
    const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / spacing)
    for (let step = 1; step < steps; step += 1) {
      const t = step / steps
      points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  })

  const easts = ring.map(([east]) => east)
  const norths = ring.map(([, north]) => north)
  for (let east = Math.min(...easts); east <= Math.max(...easts); east += spacing) {
    for (let north = Math.min(...norths); north <= Math.max(...norths); north += spacing) {
      if (pointInPolygon([east, north], ring)) points.push([east, north])
    }
  }
  return points
}

function terrainIssues(groundTiers: readonly MassTier[], site: SiteContext): ClearanceIssue[] {
  let floating = 0
  let cut = 0
  let cutFlagged = false
  for (const tier of groundTiers) {
    const heights = footprintSamplePoints(tier.footprint).map(([east, north]) => site.heightAt(east, north))
    floating = Math.max(floating, tier.baseElevation - Math.min(...heights))
    const tierCut = Math.max(...heights) - tier.baseElevation
    cut = Math.max(cut, tierCut)
    if (tierCut > tier.storeyHeight) cutFlagged = true
  }
  const issues: ClearanceIssue[] = []
  if (floating > FLOAT_TOLERANCE_M) {
    issues.push({
      kind: 'floating',
      amount: floating,
      message: `Floats up to ${floating.toFixed(1)} m above the ground`,
    })
  }
  if (cutFlagged) {
    issues.push({ kind: 'cut', amount: cut, message: `Cuts up to ${cut.toFixed(1)} m into the slope` })
  }
  return issues
}

/** Warnings per volume id; volumes without issues are absent from the map. */
export function checkClearance(
  document: ScenarioDocument,
  site: SiteContext,
): ReadonlyMap<string, readonly ClearanceIssue[]> {
  const result = new Map<string, readonly ClearanceIssue[]>()

  for (const volume of document.volumes) {
    const issues: ClearanceIssue[] = []

    const states = volume.tiers.map((tier) => boundaryState(tier.footprint, site.studyArea))
    if (states.every((state) => state === 'outside')) {
      issues.push({ kind: 'boundary-outside', message: 'Outside the study boundary' })
    } else if (states.some((state) => state !== 'inside')) {
      issues.push({ kind: 'boundary-crossing', message: 'Crosses the study boundary' })
    }

    // Only tiers at the mass's lowest base meet the ground; upper tiers sit on the tiers below.
    const lowest = Math.min(...volume.tiers.map((tier) => tier.baseElevation))
    issues.push(...terrainIssues(volume.tiers.filter((tier) => tier.baseElevation === lowest), site))

    if (issues.length > 0) result.set(volume.id, issues)
  }
  return result
}
