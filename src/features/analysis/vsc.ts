import type { FootprintBuilding } from './grid'
import type { FacadeSample } from './facadeSamples'
import { blockedAlong, prepareScene } from './shadowRay'
import type { LegendEntry } from './climateView'

/**
 * Vertical Sky Component on user-drawn façades (ADR-0021). A fixed 5° hemisphere integration under
 * the CIE standard overcast sky: luminance ∝ (1 + 2 sin θ) / 3. Descriptive bands only; never a
 * daylight assessment or a pass/fail against a guideline.
 */

export const VSC_DISCLAIMER =
  'Indicative Vertical Sky Component — early massing screening, not a daylight assessment.'

export const VSC_STEP_DEG = 5

export type VscBand = 'under-15' | '15-27' | '27-plus'

export const VSC_ORDER: readonly VscBand[] = ['under-15', '15-27', '27-plus']

export const VSC_BAND_LABEL: Record<VscBand, string> = {
  'under-15': 'Under 15 %',
  '15-27': '15–27 %',
  '27-plus': '27 % and above',
}

/** Low sky access is warm/dark; high access is pale, matching the sun-hour ramp's direction. */
export const VSC_COLOUR: Record<VscBand, string> = {
  'under-15': '#9C2F2F',
  '15-27': '#E0B25C',
  '27-plus': '#E8D48A',
}

export function vscBand(vsc: number): VscBand {
  if (vsc < 15) return 'under-15'
  if (vsc < 27) return '15-27'
  return '27-plus'
}

export type VscValue = {
  readonly sample: FacadeSample
  readonly vsc: number
  readonly band: VscBand
}

const DEG = Math.PI / 180

/**
 * VSC as a percentage: vertical-plane sky illuminance ÷ unobstructed horizontal sky illuminance,
 * both under the CIE overcast sky. Directions run azimuth −90°…+90° relative to the façade normal
 * and elevation 0°…90°; a direction counts when no building blocks it.
 *
 * The horizontal reference integrates the full 360° sky, which is what makes an unobstructed
 * vertical façade land on the standard 39.6 %.
 */
export function computeVsc(
  samples: readonly FacadeSample[],
  buildings: readonly FootprintBuilding[],
  stepDeg = VSC_STEP_DEG,
): VscValue[] {
  if (!(stepDeg > 0)) return []
  const scene = prepareScene(buildings)
  const step = stepDeg * DEG
  const elevations: number[] = []
  for (let elevation = stepDeg / 2; elevation < 90; elevation += stepDeg) {
    elevations.push(elevation * DEG)
  }
  const azimuths: number[] = []
  for (let azimuth = -90 + stepDeg / 2; azimuth < 90; azimuth += stepDeg) {
    azimuths.push(azimuth * DEG)
  }

  // The horizontal reference sees the full 360° sky. L is azimuth-independent, so integrate the
  // elevation profile once and multiply by 2π (not by the half-hemisphere count).
  let horizontal = 0
  for (const theta of elevations) {
    const luminance = (1 + 2 * Math.sin(theta)) / 3
    horizontal += luminance * Math.sin(theta) * Math.cos(theta) * step
  }
  horizontal *= 2 * Math.PI

  return samples.map((sample) => {
    const [nx, ny] = sample.normal
    let vertical = 0
    for (const phi of azimuths) {
      const cosPhi = Math.cos(phi)
      const sinPhi = Math.sin(phi)
      // Rotate the outward normal by phi in plan; the sign only mirrors the sweep.
      const dx = nx * cosPhi - ny * sinPhi
      const dy = ny * cosPhi + nx * sinPhi
      for (const theta of elevations) {
        const sinTheta = Math.sin(theta)
        const cosTheta = Math.cos(theta)
        const luminance = (1 + 2 * sinTheta) / 3
        if (cosPhi > 0) {
          const direction = [dx * cosTheta, dy * cosTheta, sinTheta] as const
          if (blockedAlong(sample.p, direction, scene)) continue
        }
        // cos(angle to normal) × solid angle = (cosθ cosφ) × (cosθ Δθ Δφ).
        vertical += luminance * cosTheta * cosTheta * cosPhi * step * step
      }
    }
    const vsc = horizontal === 0 ? 0 : (100 * vertical) / horizontal
    return { sample, vsc, band: vscBand(vsc) }
  })
}

export function vscLegend(values: readonly VscValue[]): LegendEntry[] {
  return VSC_ORDER.map((band) => {
    const count = values.filter((value) => value.band === band).length
    return {
      label: VSC_BAND_LABEL[band],
      colour: VSC_COLOUR[band],
      count,
      share: values.length === 0 ? 0 : count / values.length,
    }
  })
}

export function medianVsc(values: readonly VscValue[]): number | null {
  const sorted = values.map((value) => value.vsc).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? null
  const lower = sorted[middle - 1]
  const upper = sorted[middle]
  return lower === undefined || upper === undefined ? null : (lower + upper) / 2
}
