import { intersectPolygons, multiPolygonArea, unionPolygons, type MultiPolygonRings } from '../../lib/clip'
import type { Vec2 } from '../../lib/coordinates'
import { polygonArea } from '../../lib/polygon'
import type { FootprintBuilding } from './grid'

export type SiteFacts = {
  /** Study area, m². */
  readonly studyAreaM2: number
  /** Buildings overlapping the study area. */
  readonly buildingCount: number
  /** Footprint area inside the study area (overlaps counted once), m². */
  readonly builtM2: number
  /** builtM2 / studyAreaM2, 0–1. */
  readonly coverage: number
  readonly tallestM: number | null
  readonly meanHeightM: number | null
}

/** Area facts from geometry only: footprints are clipped to the study area, overlaps merged. */
export function siteFacts(studyArea: readonly Vec2[], buildings: readonly FootprintBuilding[]): SiteFacts {
  const studyAreaM2 = polygonArea(studyArea)
  const boundary: MultiPolygonRings = [[studyArea]]
  const inside = buildings.filter((b) => b.footprint.length >= 3 && multiPolygonArea(intersectPolygons([[b.footprint]], boundary)) > 0)
  const built = unionPolygons(inside.map((b) => [b.footprint] as const))
  const builtM2 = multiPolygonArea(intersectPolygons(built, boundary))
  const heights = inside.map((b) => b.height)
  return {
    studyAreaM2,
    buildingCount: inside.length,
    builtM2,
    coverage: studyAreaM2 > 0 ? builtM2 / studyAreaM2 : 0,
    tallestM: heights.length ? Math.max(...heights) : null,
    meanHeightM: heights.length ? heights.reduce((sum, h) => sum + h, 0) / heights.length : null,
  }
}
