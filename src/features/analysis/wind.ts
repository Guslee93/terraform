import { pointInPolygon } from '../../lib/polygon'
import type { Vec2 } from '../../lib/coordinates'
import { insideAnyBuilding, sampleGrid, type FootprintBuilding, type GridCell } from './grid'

export const WIND_DISCLAIMER = 'Screening estimate — not a wind simulation'

/** How far upwind a cell looks for obstructions, and the ray sampling step. */
export const FETCH_M = 200
export const RAY_STEP_M = 5
/** Obstruction angle (degrees) at which a cell counts as fully sheltered. */
export const FULL_SHELTER_DEG = 20

export type WindClass = 'sheltered' | 'moderate' | 'exposed' | 'very-exposed'
export type WindCell = GridCell & { readonly exposure: number | null; readonly cls: WindClass | null }

export const WIND_CLASS_LABEL: Record<WindClass, string> = {
  sheltered: 'Sheltered',
  moderate: 'Moderately exposed',
  exposed: 'Exposed',
  'very-exposed': 'Very exposed',
}

export function windClass(exposure: number): WindClass {
  if (exposure < 0.25) return 'sheltered'
  if (exposure < 0.5) return 'moderate'
  if (exposure < 0.75) return 'exposed'
  return 'very-exposed'
}

/**
 * Exposure 0 (fully sheltered) … 1 (open) for wind blowing FROM `fromBearingDeg` (compass,
 * 0 = north, 90 = east). Looks upwind for the steepest building obstruction angle atan(h/d).
 * ponytail: ignores terrain and building width; add a lateral spread if narrow slabs mislead.
 */
export function exposureAt(x: number, y: number, fromBearingDeg: number, buildings: readonly FootprintBuilding[]): number {
  const rad = (fromBearingDeg * Math.PI) / 180
  const ux = Math.sin(rad)
  const uy = Math.cos(rad)
  let maxAngle = 0
  for (let d = RAY_STEP_M; d <= FETCH_M; d += RAY_STEP_M) {
    const p: Vec2 = [x + ux * d, y + uy * d]
    for (const b of buildings) {
      if (pointInPolygon(p, b.footprint)) maxAngle = Math.max(maxAngle, Math.atan(b.height / d) * (180 / Math.PI))
    }
  }
  return 1 - Math.min(1, maxAngle / FULL_SHELTER_DEG)
}

export function computeWind(
  studyArea: readonly Vec2[],
  buildings: readonly FootprintBuilding[],
  fromBearingDeg: number,
  cellM = 10,
): WindCell[] {
  return sampleGrid(studyArea, cellM).map((c) => {
    if (insideAnyBuilding(c.x, c.y, buildings)) return { ...c, exposure: null, cls: null }
    const exposure = exposureAt(c.x, c.y, fromBearingDeg, buildings)
    return { ...c, exposure, cls: windClass(exposure) }
  })
}
