import type { FootprintBuilding } from './grid'
import type { FacadeSample } from './facadeSamples'
import { blockedAlong, prepareScene, type SunSample } from './shadowRay'
import {
  SUN_HOURS_BAND_LABEL,
  SUN_HOURS_COLOUR,
  SUN_HOURS_DISCLAIMER,
  SUN_HOURS_ORDER,
  sunHoursBand,
  type SunHoursBand,
} from './sunHours'
import type { LegendEntry } from './climateView'

/**
 * Direct sun on user-drawn façades (ADR-0021). A sample is sunlit when the sun is in front of the
 * wall and no building blocks it; the façade's own building is not skipped, because another wing
 * can shade it. Same wording as ground sun hours: geometric, clear sky, not a daylight assessment.
 */

export const FACADE_SUN_DISCLAIMER = SUN_HOURS_DISCLAIMER

export type FacadeSunValue = {
  readonly sample: FacadeSample
  readonly hours: number
  readonly band: SunHoursBand
}

export function computeFacadeSun(
  samples: readonly FacadeSample[],
  buildings: readonly FootprintBuilding[],
  sunSamples: readonly SunSample[],
  stepMin = 15,
): FacadeSunValue[] {
  const scene = prepareScene(buildings)
  const stepHours = stepMin / 60
  const dayHours = sunSamples.length * stepHours
  return samples.map((sample) => {
    const [nx, ny] = sample.normal
    let sunlit = 0
    for (const sun of sunSamples) {
      if (nx * sun.enu[0] + ny * sun.enu[1] <= 0) continue
      if (!blockedAlong(sample.p, sun.enu, scene)) sunlit += 1
    }
    const hours = sunlit * stepHours
    return { sample, hours, band: sunHoursBand(hours, dayHours) }
  })
}

export function facadeSunLegend(values: readonly FacadeSunValue[]): LegendEntry[] {
  return SUN_HOURS_ORDER.map((band) => {
    const count = values.filter((value) => value.band === band).length
    return {
      label: SUN_HOURS_BAND_LABEL[band],
      colour: SUN_HOURS_COLOUR[band],
      count,
      share: values.length === 0 ? 0 : count / values.length,
    }
  })
}

export function medianFacadeSun(values: readonly FacadeSunValue[]): number | null {
  const sorted = values.map((value) => value.hours).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? null
  const lower = sorted[middle - 1]
  const upper = sorted[middle]
  return lower === undefined || upper === undefined ? null : (lower + upper) / 2
}
