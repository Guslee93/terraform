/**
 * TF-VIS-007 (Run 6) — a textbook Priority-Flood fill (Barnes, Lehman & Mulla 2014, Algorithm 1)
 * as an independent reference: every grid-edge cell (and every cell beside a no-data cell) is seeded
 * at its own height, and a cell is raised to `max(own height, popped cell's height)` with **no
 * epsilon**. Written from the paper, not from runoff.ts. Writes the filled DEM of each variant as
 * `.asc` to the pipeline's tmp dir so WhiteboxTools can route it (D8Pointer → D8FlowAccumulation).
 *
 *   npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts textbookFill
 */
import { expect, it } from 'vitest'
import {
  buildVariantGround,
  loadFootprints,
  loadTerrainRaster,
  RUNOFF_VARIANTS,
  writeAsc,
} from './common'

const SITE = 'compact-infill'

/** Binary min-heap over Float64 keys. */
function makeHeap(keys: Float64Array, capacity: number) {
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
 * Barnes et al. 2014, Algorithm 1 — priority-flood depression fill, 8-connected, no epsilon.
 * `ground` is mutated in place (raised) and returned. A cell is raised to the popped cell's height,
 * never above it, so flats stay flat.
 */
export function priorityFlood(ground: Float64Array, cols: number, rows: number): Float64Array {
  const count = cols * rows
  const solved = new Uint8Array(count)
  const queue = makeHeap(ground, count)
  const seed = (index: number) => { if (!solved[index]) { solved[index] = 1; queue.push(index) } }
  // Every grid-edge cell is an outlet at its own height.
  for (let row = 0; row < rows; row += 1) { seed(row * cols); seed(row * cols + cols - 1) }
  for (let col = 0; col < cols; col += 1) { seed(col); seed((rows - 1) * cols + col) }
  // Cells beside a no-data cell are also outlets (the full tile has no no-data, so this is a no-op here).
  for (let index = 0; index < count; index += 1) {
    if (!Number.isFinite(ground[index]!)) continue
    const row = Math.floor(index / cols), col = index % cols
    for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
      const r = row + dr, c = col + dc
      if ((!dr && !dc) || r < 0 || c < 0 || r >= rows || c >= cols) continue
      if (!Number.isFinite(ground[r * cols + c]!)) seed(index)
    }
  }
  while (queue.size > 0) {
    const index = queue.pop()
    const level = ground[index]!
    const row = Math.floor(index / cols), col = index - row * cols
    for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
      const r = row + dr, c = col + dc
      if ((!dr && !dc) || r < 0 || c < 0 || r >= rows || c >= cols) continue
      const next = r * cols + c
      if (solved[next] || !Number.isFinite(ground[next]!)) continue
      solved[next] = 1
      if (ground[next]! < level) ground[next] = level // no epsilon
      queue.push(next)
    }
  }
  return ground
}

/** A pit fills to its spill (the edge height). */
it('fills a pit to its spill', () => {
  // 3×3, centre is a 1 m pit inside a 3 m rim.
  const g = new Float64Array([3, 3, 3, 3, 1, 3, 3, 3, 3])
  priorityFlood(g, 3, 3)
  expect(g[4]).toBe(3)
  expect(g[0]).toBe(3)
})

/** A channel that drains downhill to the edge is not raised. */
it('does not raise a channel that drains to the edge', () => {
  // Left column (col 0) is the edge and descends 5→3→1; the interior drains into it.
  const g = new Float64Array([
    5, 5, 5,
    3, 4, 5,
    1, 2, 5,
  ])
  priorityFlood(g, 3, 3)
  expect(g[4]).toBe(4) // (1,1) drains to (1,0)=3, not raised
  expect(g[7]).toBe(2) // (2,1) drains to (2,0)=1, not raised
  expect(g[1]).toBe(5) // (0,1) unchanged
})

it('writes the textbook-filled DEM of each variant to the pipeline tmp dir', () => {
  const raster = loadTerrainRaster(SITE)
  const footprints = loadFootprints(SITE)
  const { cols, rows, minX, minY, maxX } = raster
  const dx = (maxX - minX) / cols
  const nodata = -9999
  const summary: Record<string, number> = {}
  for (const variant of RUNOFF_VARIANTS) {
    const baked = buildVariantGround(raster, footprints, variant)
    const original = baked.ground.slice()
    const filled = priorityFlood(baked.ground, cols, rows)
    const raised = original.reduce((sum, g, i) => sum + (filled[i]! > g ? 1 : 0), 0)
    summary[variant] = raised
    const dir = variant === 'standard' ? 'tmp/runoff-whitebox' : `tmp/runoff-whitebox/${variant}`
    writeAsc(`${dir}/textbook.asc`, cols, rows, minX, minY, dx, nodata, filled)
  }
  console.log('textbook fill: raised (filled > ground) cells per variant:', JSON.stringify(summary))
})
