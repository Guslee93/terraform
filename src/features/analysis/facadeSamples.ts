import { normalizeRing } from '../../lib/polygon'
import type { Vec2, Vec3 } from '../../lib/coordinates'

/**
 * Façade sampling for the sun-hours and VSC screening layers (ADR-0021). Only user-drawn masses
 * are sampled: the existing city context would multiply the point count without adding a design
 * decision. Normals point out of the footprint; samples sit 0.1 m outside the wall.
 */

export const FACADE_SAMPLE_SPACING_M = 3
export const FACADE_HEIGHT_STEP_M = 3
export const FACADE_OFFSET_M = 0.1

/** A tier in local heights: `baseZ`/`topZ` are metres above the tier's ground. */
export type FacadeTier = {
  readonly tierIndex: number
  readonly footprint: readonly Vec2[]
  readonly baseZ: number
  readonly topZ: number
  /** Absolute terrain height the local heights are measured from, so the scene can draw them. */
  readonly ground?: number
}

export type FacadeMass = {
  readonly id: string
  readonly tiers: readonly FacadeTier[]
}

export type FacadeSample = {
  /** Point 0.1 m outside the wall, at a sample height above local ground. */
  readonly p: Vec3
  /** Outward unit normal in plan (east, north). */
  readonly normal: Vec2
  readonly massId: string
  readonly tierIndex: number
  /** The tier's ground; `p[2]` is measured from it. */
  readonly ground?: number
}

/** A façade sample with the colour chosen by the active analysis. */
export type FacadeColourSample = {
  readonly sample: FacadeSample
  readonly colour: string
}

/**
 * Walk every exterior edge of every tier, sampling mid-storey heights. The ring is normalised
 * counter-clockwise, so the outward normal of edge (dx, dy) is (dy, −dx).
 */
export function facadeSamples(
  masses: readonly FacadeMass[],
  alongStepM = FACADE_SAMPLE_SPACING_M,
  heightStepM = FACADE_HEIGHT_STEP_M,
): FacadeSample[] {
  const samples: FacadeSample[] = []
  for (const mass of masses) {
    for (const tier of mass.tiers) {
      const ring = normalizeRing(tier.footprint)
      if (ring.length < 3) continue
      const heights: number[] = []
      const heightStep = heightStepM > 0 ? heightStepM : FACADE_HEIGHT_STEP_M
      for (let z = tier.baseZ + heightStep / 2; z < tier.topZ; z += heightStep) heights.push(z)
      if (heights.length === 0 && tier.topZ > tier.baseZ) heights.push((tier.baseZ + tier.topZ) / 2)
      if (heights.length === 0) continue
      for (let index = 0; index < ring.length; index += 1) {
        const a = ring[index]
        const b = ring[(index + 1) % ring.length]
        if (!a || !b) continue
        const dx = b[0] - a[0]
        const dy = b[1] - a[1]
        const length = Math.hypot(dx, dy)
        if (!(length > 1e-6)) continue
        const nx = dy / length
        const ny = -dx / length
        const stepM = alongStepM > 0 ? alongStepM : FACADE_SAMPLE_SPACING_M
        const steps = Math.max(1, Math.round(length / stepM))
        for (let step = 0; step < steps; step += 1) {
          const t = (step + 0.5) / steps
          const x = a[0] + dx * t + nx * FACADE_OFFSET_M
          const y = a[1] + dy * t + ny * FACADE_OFFSET_M
          for (const z of heights) {
            samples.push({
              p: [x, y, z],
              normal: [nx, ny],
              massId: mass.id,
              tierIndex: tier.tierIndex,
              ...(tier.ground === undefined ? {} : { ground: tier.ground }),
            })
          }
        }
      }
    }
  }
  return samples
}
