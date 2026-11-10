import { pointInPolygon } from '../../lib/polygon'
import type { Vec2, Vec3 } from '../../lib/coordinates'
import type { FootprintBuilding } from './grid'
import { sunDirection, sunDirectionEnu } from './sun'
import { localDayMinuteToInstant, type LocalDate } from './time'

/**
 * Exact shadow test for extruded footprints (ADR-0021). A building is a vertical extrusion of its
 * footprint from its own ground to `height`; terrain does not cast shade (documented limitation).
 * Heights passed in `p` are therefore relative to the same local ground.
 *
 * Screening only: this answers "does a building block this direction", never a daylight,
 * sunlight-hours or compliance question. The claim wording lives with each analysis module.
 */

const RAY_EPSILON = 1e-6
const PARALLEL_EPSILON = 1e-12

type Edge = { readonly a: Vec2; readonly b: Vec2; readonly ex: number; readonly ey: number }

/** A footprint with the bounds and edges the ray test needs, computed once per analysis. */
export type PreparedBuilding = {
  readonly building: FootprintBuilding
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
  readonly centre: Vec2
  /** Bounding-circle radius in plan, used to reject buildings behind or beyond the ray. */
  readonly radius: number
  readonly edges: readonly Edge[]
}

export function prepareBuildings(buildings: readonly FootprintBuilding[]): PreparedBuilding[] {
  return buildings.map((building) => {
    const xs = building.footprint.map((point) => point[0])
    const ys = building.footprint.map((point) => point[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const edges = building.footprint.map((a, index): Edge => {
      const b = building.footprint[(index + 1) % building.footprint.length] ?? a
      return { a, b, ex: b[0] - a[0], ey: b[1] - a[1] }
    })
    return {
      building,
      minX,
      minY,
      maxX,
      maxY,
      centre: [(minX + maxX) / 2, (minY + maxY) / 2],
      radius: Math.hypot(maxX - minX, maxY - minY) / 2,
      edges,
    }
  })
}

const DEFAULT_GRID_CELL_M = 20

/** Uniform grid of building bounding boxes; a ray visits only the cells it crosses. */
export type BuildingGrid = {
  readonly cellM: number
  readonly minX: number
  readonly minY: number
  readonly cols: number
  readonly rows: number
  readonly cells: readonly (readonly number[])[]
}

/**
 * Prepared footprints plus a spatial index. `visited` is scratch memory for de-duplicating a ray's
 * candidates; queries are sequential, so one scene can be reused for every sample in an analysis.
 */
export type PreparedScene = {
  readonly buildings: readonly PreparedBuilding[]
  readonly grid: BuildingGrid
  /** Tallest building in the scene; a ray above it cannot be blocked. */
  readonly maxHeight: number
  readonly visited: Uint32Array
  stamp: number
}

export function prepareScene(
  buildings: readonly FootprintBuilding[],
  cellM = DEFAULT_GRID_CELL_M,
): PreparedScene {
  const prepared = prepareBuildings(buildings)
  return {
    buildings: prepared,
    grid: buildBuildingGrid(prepared, cellM),
    maxHeight: prepared.reduce((maximum, building) => Math.max(maximum, building.building.height), 0),
    visited: new Uint32Array(prepared.length),
    stamp: 0,
  }
}

function buildBuildingGrid(buildings: readonly PreparedBuilding[], cellM: number): BuildingGrid {
  if (buildings.length === 0) {
    return { cellM, minX: 0, minY: 0, cols: 0, rows: 0, cells: [] }
  }
  const minX = Math.min(...buildings.map((building) => building.minX))
  const minY = Math.min(...buildings.map((building) => building.minY))
  const maxX = Math.max(...buildings.map((building) => building.maxX))
  const maxY = Math.max(...buildings.map((building) => building.maxY))
  const cols = Math.max(1, Math.ceil((maxX - minX) / cellM))
  const rows = Math.max(1, Math.ceil((maxY - minY) / cellM))
  const cells: number[][] = Array.from({ length: cols * rows }, () => [])
  buildings.forEach((building, index) => {
    const x0 = Math.max(0, Math.floor((building.minX - minX) / cellM))
    const x1 = Math.min(cols - 1, Math.floor((building.maxX - minX) / cellM))
    const y0 = Math.max(0, Math.floor((building.minY - minY) / cellM))
    const y1 = Math.min(rows - 1, Math.floor((building.maxY - minY) / cellM))
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) cells[y * cols + x]?.push(index)
    }
  })
  return { cellM, minX, minY, cols, rows, cells }
}

/** Distance along the ray to the far side of the grid box, or -1 when the ray misses it. */
function gridExitDistance(p: Vec3, hx: number, hy: number, grid: BuildingGrid): number {
  let tMin = 0
  let tMax = Number.POSITIVE_INFINITY
  const maxX = grid.minX + grid.cols * grid.cellM
  const maxY = grid.minY + grid.rows * grid.cellM
  if (Math.abs(hx) < PARALLEL_EPSILON) {
    if (p[0] < grid.minX || p[0] > maxX) return -1
  } else {
    const a = (grid.minX - p[0]) / hx
    const b = (maxX - p[0]) / hx
    tMin = Math.max(tMin, Math.min(a, b))
    tMax = Math.min(tMax, Math.max(a, b))
  }
  if (Math.abs(hy) < PARALLEL_EPSILON) {
    if (p[1] < grid.minY || p[1] > maxY) return -1
  } else {
    const a = (grid.minY - p[1]) / hy
    const b = (maxY - p[1]) / hy
    tMin = Math.max(tMin, Math.min(a, b))
    tMax = Math.min(tMax, Math.max(a, b))
  }
  return tMin <= tMax ? tMax : -1
}

function candidateBlocks(
  prepared: PreparedBuilding,
  p: Vec3,
  hx: number,
  hy: number,
  tanElev: number,
  skip: FootprintBuilding | undefined,
): boolean {
  const building = prepared.building
  if (building === skip || !(building.height > p[2])) return false

  // A point inside the footprint and below the roof is inside the solid.
  if (
    p[0] >= prepared.minX &&
    p[0] <= prepared.maxX &&
    p[1] >= prepared.minY &&
    p[1] <= prepared.maxY &&
    pointInPolygon([p[0], p[1]], building.footprint)
  ) {
    return true
  }

  // Bounding-circle prefilter: nothing behind the ray, nothing beyond the height limit.
  const projection = (prepared.centre[0] - p[0]) * hx + (prepared.centre[1] - p[1]) * hy
  if (projection + prepared.radius <= RAY_EPSILON) return false
  if (tanElev > 0 && projection - prepared.radius > (building.height - p[2]) / tanElev) return false

  let entry = Number.POSITIVE_INFINITY
  for (const { a, ex, ey } of prepared.edges) {
    const denominator = hx * ey - hy * ex
    if (Math.abs(denominator) < PARALLEL_EPSILON) continue
    const ox = a[0] - p[0]
    const oy = a[1] - p[1]
    const t = (ox * ey - oy * ex) / denominator
    if (t <= RAY_EPSILON || t >= entry) continue
    const u = (ox * hy - oy * hx) / denominator
    if (u < 0 || u > 1) continue
    entry = t
  }
  return entry < Number.POSITIVE_INFINITY && p[2] + entry * tanElev < building.height
}

/**
 * True when the ray from `p` along `dir` meets a building before rising above its roof.
 *
 * The test is exact for extruded footprints, not stepped: only the first footprint crossing can
 * block, because the ray's height only increases with distance and a building has one height.
 * `dir` is an ENU direction (need not be unit length); a negative vertical component is blocked,
 * and a horizontal ray is tested at constant height (used by the VSC hemisphere).
 *
 * The ray is walked through the building grid (Amanatides–Woo), so only footprints near the ray are
 * tested. `scene.visited` is scratch memory: queries on one scene must stay sequential.
 */
export function blockedAlong(
  p: Vec3,
  dir: Vec3,
  scene: PreparedScene,
  skip?: FootprintBuilding,
): boolean {
  const up = dir[2]
  if (up < 0) return true
  const horizontal = Math.hypot(dir[0], dir[1])
  // Straight up: no extruded footprint can stand between the point and the zenith.
  if (horizontal < PARALLEL_EPSILON) return false
  const hx = dir[0] / horizontal
  const hy = dir[1] / horizontal
  const tanElev = up / horizontal
  const { buildings, grid } = scene
  if (grid.cols === 0 || grid.rows === 0) return false

  if (!(scene.maxHeight > p[2])) return false
  let maxDistance = tanElev > 0 ? (scene.maxHeight - p[2]) / tanElev : Number.POSITIVE_INFINITY
  const exit = gridExitDistance(p, hx, hy, grid)
  if (exit < 0) return false
  maxDistance = Math.min(maxDistance, exit)

  scene.stamp += 1
  if (scene.stamp > 0x7fff_ffff) {
    scene.visited.fill(0)
    scene.stamp = 1
  }
  const stamp = scene.stamp

  let cx = Math.floor((p[0] - grid.minX) / grid.cellM)
  let cy = Math.floor((p[1] - grid.minY) / grid.cellM)
  const stepX = hx >= 0 ? 1 : -1
  const stepY = hy >= 0 ? 1 : -1
  const deltaX = hx === 0 ? Number.POSITIVE_INFINITY : Math.abs(grid.cellM / hx)
  const deltaY = hy === 0 ? Number.POSITIVE_INFINITY : Math.abs(grid.cellM / hy)
  const boundaryX = grid.minX + (hx >= 0 ? (cx + 1) * grid.cellM : cx * grid.cellM)
  const boundaryY = grid.minY + (hy >= 0 ? (cy + 1) * grid.cellM : cy * grid.cellM)
  let tMaxX = hx === 0 ? Number.POSITIVE_INFINITY : (boundaryX - p[0]) / hx
  let tMaxY = hy === 0 ? Number.POSITIVE_INFINITY : (boundaryY - p[1]) / hy
  let distance = 0
  let guard = grid.cols + grid.rows + Math.abs(cx) + Math.abs(cy) + 8

  while (distance <= maxDistance && guard > 0) {
    guard -= 1
    if (cx >= 0 && cx < grid.cols && cy >= 0 && cy < grid.rows) {
      const indices = grid.cells[cy * grid.cols + cx]
      if (indices) {
        for (const index of indices) {
          if (scene.visited[index] === stamp) continue
          scene.visited[index] = stamp
          const prepared = buildings[index]
          if (prepared && candidateBlocks(prepared, p, hx, hy, tanElev, skip)) return true
        }
      }
    }
    if (tMaxX < tMaxY) {
      distance = tMaxX
      cx += stepX
      tMaxX += deltaX
    } else {
      distance = tMaxY
      cy += stepY
      tMaxY += deltaY
    }
  }
  return false
}

/**
 * True when the ray from `p` toward the sun hits a building before rising above it. The sun at or
 * below the horizon always blocks direct sun.
 */
export function blockedTowardSun(
  p: Vec3,
  sunEnu: Vec3,
  buildings: readonly FootprintBuilding[],
  skip?: FootprintBuilding,
): boolean {
  if (!(sunEnu[2] > 0)) return true
  return blockedAlong(p, sunEnu, prepareScene(buildings), skip)
}

export type SunLocation = {
  readonly latitude: number
  readonly longitude: number
  readonly timeZone: string
}

export type SunSample = {
  /** Local minute of day (00:00 = 0). */
  readonly minute: number
  /** Unit vector towards the sun in local ENU metres. */
  readonly enu: Vec3
  readonly elevationDeg: number
}

/**
 * The day's above-horizon sun positions in local wall-clock time, built once and reused for every
 * test point. `stepMin` is the sampling interval; sun hours are `count × stepMin / 60`.
 */
export function daySunSamples(
  date: LocalDate,
  location: SunLocation,
  stepMin = 15,
): SunSample[] {
  if (!(stepMin > 0)) return []
  const samples: SunSample[] = []
  for (let minute = 0; minute < 1440; minute += stepMin) {
    const { instant } = localDayMinuteToInstant(date, minute, location.timeZone)
    const direction = sunDirection(instant, location.latitude, location.longitude)
    if (!(direction.elevationDeg > 0)) continue
    samples.push({
      minute,
      enu: sunDirectionEnu(direction),
      elevationDeg: direction.elevationDeg,
    })
  }
  return samples
}
