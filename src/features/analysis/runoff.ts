import type { Vec2 } from '../../lib/coordinates'
import { pointInPolygon } from '../../lib/polygon'
import type { TerrainRaster } from './terrainTools'
import { bandsOf } from './graphics'

/**
 * Stormwater runoff screening on the 1 m terrain (ADR-0038): where surface water would run and
 * where the ground forms hollows, from the shape of the terrain alone, with buildings as blocks.
 * Priority-Flood+Epsilon (Barnes et al. 2014) fills the depressions; D8 sends each cell's water to
 * its steepest downhill neighbour. A screening model (feasibility 08 §1): no rainfall, no
 * infiltration, no pipes or kerbs, no depths, no return periods. Renderer-free.
 */

export const RUNOFF_NOTE = 'Screening: flow paths and depressions on bare-earth terrain with buildings as blocks. No rainfall, drainage or depths.'
export const RUNOFF_LIMITS = 'The edge of the terrain tile is treated as an outlet, so water arriving from outside it is not included. Kerbs, culverts, drains and pipes are not in the model.'
/** Buildings are solid blocks, so a courtyard they close in has no way out: the model has no gateways or drains. */
export const RUNOFF_COURTYARDS = 'A courtyard closed in by buildings shows as a depression, because the model has no gateways or drains.'

/** How far a building is raised above the ground it stands on, so water runs around it. */
const BUILDING_RAISE_M = 10
/** Drop per cell kept along a filled flat, so every filled cell still has a way out. */
const EPSILON_M = 1e-5
/** A hollow shallower than this is noise in a lidar terrain model, not a depression. */
export const DEPRESSION_MIN_M = 0.05
/** Contributing area from which a cell is drawn as a flow path, and as a main one (m²). */
export const FLOW_PATH_M2 = 500
export const MAIN_FLOW_PATH_M2 = 5000

export type Runoff = {
  readonly cols: number
  readonly rows: number
  /** Ground area of one cell, m². */
  readonly cellArea: number
  /** Cells draining through each cell, itself included. Multiply by `cellArea` for m². */
  readonly accumulation: Float32Array
  /** How far each cell lies below the level at which its hollow spills, in metres; 0 outside hollows. */
  readonly hollow: Float32Array
  /** 1 where a building stands. */
  readonly building: Uint8Array
  /** Cells whose water leaves through the edge of the tile. Equals `cells` when nothing is lost. */
  readonly drained: number
  /** Cells with data. */
  readonly cells: number
  /** Cells left with no downhill neighbour after the fill: 0 when the fill is complete. */
  readonly pits: number
}

/** A binary min-heap of cell indices ordered by their height. */
function heap(keys: Float64Array, capacity: number) {
  const items = new Int32Array(capacity)
  let size = 0
  return {
    get size() { return size },
    push(index: number) {
      let at = size++
      while (at > 0) {
        const parent = (at - 1) >> 1
        if (keys[items[parent]!]! <= keys[index]!) break
        items[at] = items[parent]!
        at = parent
      }
      items[at] = index
    },
    pop(): number {
      const top = items[0]!
      const last = items[--size]!
      let at = 0
      for (;;) {
        let child = 2 * at + 1
        if (child >= size) break
        if (child + 1 < size && keys[items[child + 1]!]! < keys[items[child]!]!) child += 1
        if (keys[last]! <= keys[items[child]!]!) break
        items[at] = items[child]!
        at = child
      }
      items[at] = last
      return top
    },
  }
}

/**
 * Runoff over a terrain raster. `footprints` are the buildings (context and drawn), in local ENU;
 * each is raised as a block so the flow goes around it. Cells without data are outlets.
 */
export function computeRunoff(raster: Pick<TerrainRaster, 'cols' | 'rows' | 'minX' | 'minY' | 'maxX' | 'maxY' | 'heights'>, footprints: readonly (readonly Vec2[])[] = []): Runoff {
  const { cols, rows } = raster
  const count = cols * rows
  const dx = (raster.maxX - raster.minX) / cols
  const dy = (raster.maxY - raster.minY) / rows
  const ground = new Float64Array(count)
  const outlet = new Uint8Array(count)
  let cells = 0
  for (let index = 0; index < count; index += 1) {
    const height = raster.heights[index]!
    if (Number.isNaN(height)) { outlet[index] = 1; ground[index] = -1e9 } else { ground[index] = height; cells += 1 }
  }

  // Buildings as blocks: every cell whose centre lies in a footprint is raised.
  const building = new Uint8Array(count)
  for (const footprint of footprints) {
    if (footprint.length < 3) continue
    const xs = footprint.map((point) => point[0]), ys = footprint.map((point) => point[1])
    const col0 = Math.max(0, Math.floor((Math.min(...xs) - raster.minX) / dx)), col1 = Math.min(cols - 1, Math.floor((Math.max(...xs) - raster.minX) / dx))
    const row0 = Math.max(0, Math.floor((raster.maxY - Math.max(...ys)) / dy)), row1 = Math.min(rows - 1, Math.floor((raster.maxY - Math.min(...ys)) / dy))
    for (let row = row0; row <= row1; row += 1) {
      for (let col = col0; col <= col1; col += 1) {
        const index = row * cols + col
        if (building[index] || outlet[index]) continue
        if (pointInPolygon([raster.minX + (col + 0.5) * dx, raster.maxY - (row + 0.5) * dy], footprint)) { building[index] = 1; ground[index]! += BUILDING_RAISE_M }
      }
    }
  }

  // Priority-Flood+Epsilon from the edge inwards: a cell lower than the way out is raised to it.
  const filled = ground.slice()
  const seen = new Uint8Array(count)
  const queue = heap(filled, count)
  const seed = (index: number) => { if (!seen[index]) { seen[index] = 1; queue.push(index) } }
  for (let row = 0; row < rows; row += 1) { seed(row * cols); seed(row * cols + cols - 1) }
  for (let col = 0; col < cols; col += 1) { seed(col); seed((rows - 1) * cols + col) }
  for (let index = 0; index < count; index += 1) if (outlet[index]) seed(index)
  while (queue.size > 0) {
    const index = queue.pop()
    const row = Math.floor(index / cols), col = index - row * cols
    const level = filled[index]!
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        const r = row + dr, c = col + dc
        if ((dr === 0 && dc === 0) || r < 0 || c < 0 || r >= rows || c >= cols) continue
        const next = r * cols + c
        if (seen[next]) continue
        seen[next] = 1
        if (filled[next]! <= level) filled[next] = level + EPSILON_M
        queue.push(next)
      }
    }
  }

  // D8: each cell hands its water to the neighbour with the steepest drop; off the tile is downhill.
  const receiver = new Int32Array(count).fill(-1)
  const diagonal = Math.hypot(dx, dy)
  let pits = 0
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col
      if (outlet[index]) { receiver[index] = -2; continue }
      let best = 0
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr === 0 && dc === 0) continue
          const r = row + dr, c = col + dc
          const outside = r < 0 || c < 0 || r >= rows || c >= cols
          const distance = dr !== 0 && dc !== 0 ? diagonal : dr !== 0 ? dy : dx
          const drop = (filled[index]! - (outside ? -1e9 : filled[r * cols + c]!)) / distance
          if (drop > best) { best = drop; receiver[index] = outside || outlet[r * cols + c] ? -2 : r * cols + c }
        }
      }
      if (receiver[index] === -1) pits += 1
    }
  }
  const order = new Uint32Array(count)
  for (let index = 0; index < count; index += 1) order[index] = index
  order.sort((a, b) => filled[b]! - filled[a]!)
  const accumulation = new Float32Array(count)
  for (let index = 0; index < count; index += 1) accumulation[index] = outlet[index] ? 0 : 1
  let drained = 0
  for (const index of order) {
    const to = receiver[index]!
    if (to >= 0) accumulation[to]! += accumulation[index]!
    else if (to === -2) drained += accumulation[index]!
  }

  const hollow = new Float32Array(count)
  for (let index = 0; index < count; index += 1) if (!outlet[index]) hollow[index] = Math.max(0, filled[index]! - ground[index]!)
  return { cols, rows, cellArea: dx * dy, accumulation, hollow, building, drained, cells, pits }
}

export type RunoffSummary = {
  /** Share of the open ground (not building) lying in a hollow deeper than `DEPRESSION_MIN_M`. */
  readonly depressionShare: number
  /** Open-ground cells on a flow path, and on a main one. */
  readonly flowPathCells: number
  readonly mainFlowPathCells: number
  /** True when every cell's water reaches the edge: the fill left no pit. */
  readonly conserved: boolean
}

export function runoffSummary(runoff: Runoff): RunoffSummary {
  let open = 0, hollows = 0, paths = 0, main = 0
  for (let index = 0; index < runoff.accumulation.length; index += 1) {
    if (runoff.building[index] || runoff.accumulation[index] === 0) continue
    open += 1
    if (runoff.hollow[index]! > DEPRESSION_MIN_M) hollows += 1
    const area = runoff.accumulation[index]! * runoff.cellArea
    if (area >= FLOW_PATH_M2) paths += 1
    if (area >= MAIN_FLOW_PATH_M2) main += 1
  }
  return { depressionShare: open ? hollows / open : 0, flowPathCells: paths, mainFlowPathCells: main, conserved: runoff.pits === 0 && Math.abs(runoff.drained - runoff.cells) < 0.5 }
}

/** What a cell is drawn as: 0 nothing, 1 depression, 2 flow path, 3 main flow path. Buildings are never drawn. */
export function runoffClass(runoff: Runoff, index: number): 0 | 1 | 2 | 3 {
  if (runoff.building[index]) return 0
  const area = runoff.accumulation[index]! * runoff.cellArea
  if (area >= MAIN_FLOW_PATH_M2) return 3
  if (area >= FLOW_PATH_M2) return 2
  return runoff.hollow[index]! > DEPRESSION_MIN_M ? 1 : 0
}

/**
 * Legend, low to high emphasis. Colours: the studio's existing blues; to be revisited in the design
 * phase. Screening outputs get no number beside them except the share of ground in depressions.
 */
export const RUNOFF_LEGEND = [
  { label: `Depressions and enclosed courtyards (hollows deeper than ${DEPRESSION_MIN_M * 100} cm)`, colour: bandsOf('runoff')[0]!.colour },
  { label: `Flow paths (water from ${FLOW_PATH_M2} m² or more)`, colour: bandsOf('runoff')[1]!.colour },
  { label: `Main flow paths (water from ${MAIN_FLOW_PATH_M2.toLocaleString('en-GB').replace(',', ' ')} m² or more)`, colour: bandsOf('runoff')[2]!.colour },
] as const
