import type { Vec3 } from '../../lib/coordinates'
import { normalizeRing, pointInPolygon } from '../../lib/polygon'
import { ridgeOffset, roofHeightAt } from '../sites/roof'
import { footprintTouchesCircle, insideCircle, type AnalysisCircle } from './circle'
import type { FootprintBuilding } from './grid'
import { blockedAlong, prepareScene, type PreparedScene, type SunSample } from './shadowRay'

/**
 * Sun hours on every surface in the analysis circle (ADR-0031): the open ground, every roof and
 * every façade of the buildings that touch the circle, for one date and a window of the day. The
 * same exact shadow ray as the other sun analyses (ADR-0021): clear sky, buildings only, terrain casts
 * no shade. Hours = sunlit 15-minute samples × 15 / 60. Renderer-free; the worker runs it.
 */

/** Ground and roof cells (m). */
export const SUN_SURFACE_CELL_M = 2
/** Façade vertices along a wall (m, at most). */
export const SUN_FACADE_ALONG_M = 2
/** Façade vertices up a wall (m, at most): about a storey. */
export const SUN_FACADE_STOREY_M = 3
/** Test points sit this far outside a wall, so the wall itself never blocks them. */
const FACADE_OFFSET_M = 0.1
/** And this far above a roof. */
const ROOF_OFFSET_M = 0.05
/** End columns sit this far in from a wall's corners, off the neighbouring wall's plane. */
const CORNER_INSET_M = 0.05

/** The day's samples inside a window of local minutes, `from` inclusive, `to` exclusive (0–1440). */
export function windowSunSamples(samples: readonly SunSample[], fromMinute: number, toMinute: number): SunSample[] {
  return samples.filter((sample) => sample.minute >= fromMinute && sample.minute < toMinute)
}

/** Ground and roofs on one plan grid. Row-major from (minX, minY); a value per cell centre. */
export type SunSurfaceGrid = {
  readonly minX: number
  readonly minY: number
  readonly cols: number
  readonly rows: number
  readonly cellM: number
  /** Hours of direct sun; NaN where nothing is measured. */
  readonly hours: Float32Array
  /** −1 for open ground, else the index of the building whose roof the cell lies on; −2 for nothing. */
  readonly surface: Int32Array
}

/** Every wall of the buildings in the circle, as a grid of vertices per wall. */
export type SunFacadeMesh = {
  /** Plan x, y (local ENU, 0.1 m outside the wall) and z above the building's base, per vertex. */
  readonly positions: Float32Array
  readonly hours: Float32Array
  /** The building each vertex belongs to: the scene lifts z by that building's base. */
  readonly building: Int32Array
  /** Three vertex indices per triangle. */
  readonly triangles: Uint32Array
}

export type CircleSunHours = {
  /** Hours the sun is above the horizon inside the window: the most any surface can get. */
  readonly possibleHours: number
  /** Indices of the buildings that touch the circle: their roofs and façades are measured. */
  readonly included: readonly number[]
  readonly surface: SunSurfaceGrid
  readonly facades: SunFacadeMesh
  /** Medians over what lies inside the circle; null where there is none. */
  readonly median: { readonly ground: number | null; readonly roofs: number | null; readonly facades: number | null }
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  values.sort((a, b) => a - b)
  const middle = values.length >> 1
  return values.length % 2 ? values[middle]! : (values[middle - 1]! + values[middle]!) / 2
}

/** Roof surface height above the building's base at a plan position (ADR-0022 gables, else flat). */
const roofAt = (building: FootprintBuilding, x: number, y: number) =>
  Math.max(0, building.roof ? roofHeightAt(building.roof, x, y) : building.height)

export function computeCircleSunHours(
  buildings: readonly FootprintBuilding[],
  circle: AnalysisCircle,
  samples: readonly SunSample[],
  stepMin = 15,
  cellM = SUN_SURFACE_CELL_M,
): CircleSunHours {
  const scene: PreparedScene = prepareScene(buildings)
  const stepHours = stepMin / 60
  const sunlitHours = (p: Vec3, skip?: FootprintBuilding, nx = 0, ny = 0) => {
    let sunlit = 0
    for (const sun of samples) {
      // A wall sees only the sun in front of it.
      if ((nx !== 0 || ny !== 0) && nx * sun.enu[0] + ny * sun.enu[1] <= 0) continue
      if (!blockedAlong(p, sun.enu, scene, skip)) sunlit += 1
    }
    return sunlit * stepHours
  }

  const included = buildings.flatMap((building, index) =>
    building.height > 0 && footprintTouchesCircle(building.footprint, circle.centre, circle.radius) ? [index] : [])
  const boxes = included.map((index) => {
    const footprint = buildings[index]!.footprint
    const xs = footprint.map((p) => p[0]), ys = footprint.map((p) => p[1])
    return { index, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
  })

  // Ground in the circle and whole roofs of the buildings touching it, on one grid.
  const [cx, cy] = circle.centre
  let minX = cx - circle.radius, maxX = cx + circle.radius, minY = cy - circle.radius, maxY = cy + circle.radius
  for (const box of boxes) {
    minX = Math.min(minX, box.minX); maxX = Math.max(maxX, box.maxX)
    minY = Math.min(minY, box.minY); maxY = Math.max(maxY, box.maxY)
  }
  const cols = Math.max(1, Math.ceil((maxX - minX) / cellM)), rows = Math.max(1, Math.ceil((maxY - minY) / cellM))
  const hours = new Float32Array(cols * rows).fill(Number.NaN)
  const surface = new Int32Array(cols * rows).fill(-2)
  const groundValues: number[] = [], roofValues: number[] = []
  for (let row = 0; row < rows; row += 1) {
    const y = minY + (row + 0.5) * cellM
    for (let col = 0; col < cols; col += 1) {
      const x = minX + (col + 0.5) * cellM
      // The highest roof over this point: an upper tier covers the tier below it.
      let roofIndex = -1, roofZ = Number.NEGATIVE_INFINITY
      for (const box of boxes) {
        if (x < box.minX || x > box.maxX || y < box.minY || y > box.maxY) continue
        const building = buildings[box.index]!
        if (!pointInPolygon([x, y], building.footprint)) continue
        const z = roofAt(building, x, y)
        if (z > roofZ) { roofZ = z; roofIndex = box.index }
      }
      const cell = row * cols + col
      const inCircle = insideCircle(x, y, circle)
      if (roofIndex >= 0) {
        // A roof does not shade itself; another tier or building can.
        const value = sunlitHours([x, y, roofZ + ROOF_OFFSET_M], buildings[roofIndex])
        hours[cell] = value
        surface[cell] = roofIndex
        if (inCircle) roofValues.push(value)
      } else if (inCircle) {
        const value = sunlitHours([x, y, 0])
        hours[cell] = value
        surface[cell] = -1
        groundValues.push(value)
      }
    }
  }

  // Façades: a grid of vertices per wall, about a storey high and 2 m wide.
  const positions: number[] = [], facadeHours: number[] = [], owner: number[] = [], triangles: number[] = []
  const facadeValues: number[] = []
  for (const index of included) {
    const building = buildings[index]!
    const ring = normalizeRing(building.footprint)
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i]!, b = ring[(i + 1) % ring.length]!
      const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy)
      if (!(length > 1e-6)) continue
      // Counter-clockwise ring: the outward normal of (dx, dy) is (dy, −dx).
      const nx = dy / length, ny = -dx / length
      const steps = Math.max(1, Math.ceil(length / SUN_FACADE_ALONG_M))
      const ts = Array.from({ length: steps + 1 }, (_, k) => k / steps)
      // A gable end peaks where the ridge crosses the wall: a column there keeps the peak.
      if (building.roof) {
        const oa = ridgeOffset(building.roof, a[0], a[1]), ob = ridgeOffset(building.roof, b[0], b[1])
        if (oa * ob < 0) ts.push(oa / (oa - ob))
        ts.sort((p, q) => p - q)
      }
      const inset = length > 4 * CORNER_INSET_M ? CORNER_INSET_M / length : 0
      const columns = ts.map((t) => {
        const tt = Math.min(1 - inset, Math.max(inset, t))
        const x = a[0] + dx * tt, y = a[1] + dy * tt
        return { x: x + nx * FACADE_OFFSET_M, y: y + ny * FACADE_OFFSET_M, top: roofAt(building, x, y) }
      })
      const tallest = Math.max(...columns.map((column) => column.top))
      if (!(tallest > 0)) continue
      const levels = Math.max(1, Math.ceil(tallest / SUN_FACADE_STOREY_M))
      const first = owner.length
      for (const column of columns) {
        const inCircle = insideCircle(column.x, column.y, circle)
        for (let k = 0; k <= levels; k += 1) {
          const z = (column.top * k) / levels
          const value = sunlitHours([column.x, column.y, z], undefined, nx, ny)
          positions.push(column.x, column.y, z)
          facadeHours.push(value)
          owner.push(index)
          if (inCircle) facadeValues.push(value)
        }
      }
      for (let c = 0; c < columns.length - 1; c += 1) {
        for (let k = 0; k < levels; k += 1) {
          const v00 = first + c * (levels + 1) + k, v10 = v00 + levels + 1
          triangles.push(v00, v10, v10 + 1, v00, v10 + 1, v00 + 1)
        }
      }
    }
  }

  return {
    possibleHours: samples.length * stepHours,
    included,
    surface: { minX, minY, cols, rows, cellM, hours, surface },
    facades: {
      positions: Float32Array.from(positions),
      hours: Float32Array.from(facadeHours),
      building: Int32Array.from(owner),
      triangles: Uint32Array.from(triangles),
    },
    median: { ground: median(groundValues), roofs: median(roofValues), facades: median(facadeValues) },
  }
}

/**
 * The sun-hours ramp, from no direct sun to all the sun the window offers (ADR-0031): one warm hue
 * family, dark to light, so shade reads dark and full sun bright on the white buildings — and neither
 * end disappears into them. After ColorBrewer YlOrBr (Cynthia Brewer, Apache-2.0), reversed and without
 * its near-white first step. Lightness rises monotonically.
 */
export const SUN_HOURS_RAMP: readonly string[] = ['#662506', '#993404', '#CC4C02', '#EC7014', '#FE9929', '#FEC44F', '#FEE391']

const RAMP_RGB = SUN_HOURS_RAMP.map((hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number])

/** Ramp colour (0–1 channels) for `hours` of `possibleHours`; no possible sun is the dark end. */
export function sunHoursRgb(hours: number, possibleHours: number): [number, number, number] {
  const share = possibleHours > 0 ? Math.min(1, Math.max(0, hours / possibleHours)) : 0
  const position = share * (RAMP_RGB.length - 1)
  const low = Math.min(RAMP_RGB.length - 2, Math.floor(position)), t = position - low
  const a = RAMP_RGB[low]!, b = RAMP_RGB[low + 1]!
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

/** The same colour as a hex string. */
export function sunHoursColour(hours: number, possibleHours: number): string {
  return `#${sunHoursRgb(hours, possibleHours).map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`
}
