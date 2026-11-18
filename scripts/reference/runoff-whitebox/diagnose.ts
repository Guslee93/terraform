/**
 * TF-VIS-007 — diagnose the full-tile "unfilled ground" divergence points (Run 4). Read-only.
 *
 * Mirrors `computeRunoff`'s fill and D8 (verbatim, exposing `filled` and `receiver` — which the
 * public API does not return) so each divergence point can be attributed to one of the four
 * hypotheses: H1 flat handling below the 1 mm cut-off, H2 near-ties in D8, H3 cell shape (dx ≠ dy),
 * H4 fill differences. Reads the pipeline's tmp outputs (filled.asc, pointer.asc, accum.asc); needs
 * those outputs, not the WhiteboxTools binary.
 *
 *   npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts diagnose
 */
import { it } from 'vitest'
import { computeRunoff, MAIN_FLOW_PATH_M2 } from '../../../src/features/analysis/runoff'
import { buildVariantGround, loadFootprints, loadTerrainRaster, readAsc } from './common'

const SITE = 'compact-infill'
const DIR = 'tmp/runoff-whitebox'
/** Mirror of runoff.ts's `EPSILON_M`. */
const EPSILON_M = 1e-5

/** Binary min-heap, copied verbatim from runoff.ts. */
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

/** Mirror of computeRunoff's fill + D8, returning the exact Float64 filled heights and receivers. */
function fillAndD8(ground: Float64Array, cols: number, rows: number, dx: number, dy: number) {
  const count = cols * rows
  const filled = ground.slice()
  const seen = new Uint8Array(count)
  const queue = heap(filled, count)
  const seed = (index: number) => { if (!seen[index]) { seen[index] = 1; queue.push(index) } }
  for (let row = 0; row < rows; row += 1) { seed(row * cols); seed(row * cols + cols - 1) }
  for (let col = 0; col < cols; col += 1) { seed(col); seed((rows - 1) * cols + col) }
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
  const receiver = new Int32Array(count).fill(-1)
  const diagonal = Math.hypot(dx, dy)
  let pits = 0
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col
      let best = 0
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr === 0 && dc === 0) continue
          const r = row + dr, c = col + dc
          const outside = r < 0 || c < 0 || r >= rows || c >= cols
          const distance = dr !== 0 && dc !== 0 ? diagonal : dr !== 0 ? dy : dx
          const drop = (filled[index]! - (outside ? -1e9 : filled[r * cols + c]!)) / distance
          if (drop > best) { best = drop; receiver[index] = outside ? -2 : r * cols + c }
        }
      }
      if (receiver[index] === -1) pits += 1
    }
  }
  return { filled, receiver, pits }
}

/** WhiteboxTools D8 pointer → (dr, dc). Convention (fd8_pointer.rs): N=128, NE=1, E=2, SE=4, S=8, SW=16, W=32, NW=64. */
const POINTER: Record<number, readonly [number, number]> = {
  128: [-1, 0], 1: [-1, 1], 2: [0, 1], 4: [1, 1], 8: [1, 0], 16: [1, -1], 32: [0, -1], 64: [-1, -1],
}

it('diagnoses the standard-variant unfilled-ground divergence points', () => {
  const raster = loadTerrainRaster(SITE)
  const footprints = loadFootprints(SITE)
  const { cols, rows } = raster
  const dx = (raster.maxX - raster.minX) / cols
  const dy = (raster.maxY - raster.minY) / rows
  const cellArea = dx * dy
  const count = cols * rows

  const baked = buildVariantGround(raster, footprints, 'standard')
  const runoff = computeRunoff(raster, footprints)
  const { filled: tfFilled, receiver: tfReceiver } = fillAndD8(baked.ground, cols, rows, dx, dy)

  // Cross-check the mirror against computeRunoff's hollow (which is filled − ground).
  let hollowMismatch = 0
  for (let index = 0; index < count; index += 1) {
    if (Math.abs(runoff.hollow[index]! - Math.max(0, tfFilled[index]! - baked.ground[index]!)) > 1e-6) hollowMismatch += 1
  }
  console.log(`mirror cross-check: ${hollowMismatch} hollow mismatches out of ${count} cells`)

  const wbtFilled = readAsc(`${DIR}/filled.asc`).values
  const wbtPointer = readAsc(`${DIR}/pointer.asc`).values
  const wbtAccum = readAsc(`${DIR}/accum.asc`).values
  const raw = raster.heights // the raw (unburned) terrain

  // Divergence points: reference main-path cell where Terraform > 50 % flow, next to a downstream
  // reference cell where Terraform < 5 %.
  const ratio = (index: number) => runoff.accumulation[index]! / wbtAccum[index]!
  const isWbtMain = (index: number) => !baked.building[index] && wbtAccum[index]! * cellArea >= MAIN_FLOW_PATH_M2
  const points: { index: number; next: number }[] = []
  for (let index = 0; index < count; index += 1) {
    if (!isWbtMain(index) || ratio(index) <= 0.5) continue
    const row = Math.floor(index / cols), col = index % cols
    for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
      const r = row + dr, c = col + dc
      if ((!dr && !dc) || r < 0 || c < 0 || r >= rows || c >= cols) continue
      const next = r * cols + c
      if (!isWbtMain(next) || ratio(next) >= 0.05 || wbtAccum[next]! <= wbtAccum[index]!) continue
      points.push({ index, next })
    }
  }

  const wbtReceiver = (index: number) => {
    const p = wbtPointer[index]!
    if (!(p in POINTER)) return -2
    const [dr, dc] = POINTER[p]!
    const row = Math.floor(index / cols), col = index % cols
    const r = row + dr, c = col + dc
    if (r < 0 || c < 0 || r >= rows || c >= cols) return -2
    return r * cols + c
  }

  console.log(`\n${points.length} divergence points (${points.filter(({ index }) => tfFilled[index]! - baked.ground[index]! <= 0.001).length} on unfilled ground)\n`)
  console.log('row,col | raw (cell→tf rec→wbt rec) | tf hollow | wbt fill | best/second drop + margin | tf rec | wbt rec | dz | H1 flat | H2 near-tie | H4 fill-diff')
  for (const { index, next } of points) {
    const tfHollow = Math.max(0, tfFilled[index]! - baked.ground[index]!)
    if (tfHollow > 0.001) continue // Run 3's "unfilled ground" is Terraform hollow ≤ 1 mm
    const row = Math.floor(index / cols), col = index % cols
    const rn = Math.floor(next / cols), cn = next % cols
    // Terraform's drops to all 8 neighbours.
    const drops: { drop: number; n: number }[] = []
    const diagonal = Math.hypot(dx, dy)
    for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue
      const r = row + dr, c = col + dc
      const outside = r < 0 || c < 0 || r >= rows || c >= cols
      const distance = dr !== 0 && dc !== 0 ? diagonal : dr !== 0 ? dy : dx
      const drop = (tfFilled[index]! - (outside ? -1e9 : tfFilled[r * cols + c]!)) / distance
      drops.push({ drop, n: outside ? -2 : r * cols + c })
    }
    drops.sort((a, b) => b.drop - a.drop)
    const best = drops[0]!, second = drops[1]!
    const margin = best.drop === 0 ? Infinity : (best.drop - second.drop) / best.drop

    const wbtFill = wbtFilled[index]! - baked.ground[index]!
    const dz = baked.ground[next]! - baked.ground[index]!

    // H1: a true flat — the cell's raw height equals the downstream cell's raw height (DTM is 1 cm).
    const flat = raw[index]! === raw[next]!
    // H2: near-tie — the best and second drops are within 5 % relative margin.
    const nearTie = margin < 0.05
    // H4: WhiteboxTools raised this cell (or the downstream) by more than 1 mm where Terraform did not.
    const fillDiff = Math.abs(wbtFilled[index]! - tfFilled[index]!) > 0.001 || Math.abs(wbtFilled[next]! - tfFilled[next]!) > 0.001

    console.log(`(${row},${col})→(${rn},${cn}) | raw ${raw[index]}→${raw[next]} (tf ${tfReceiver[index]}→wbt ${wbtReceiver(index)}) | hollow ${tfHollow.toFixed(4)} | wbt fill ${wbtFill.toFixed(4)} | drops ${best.drop.toFixed(6)}/${second.drop.toFixed(6)} m=${margin === Infinity ? '∞' : margin.toFixed(3)} | tf ${tfReceiver[index]} wbt ${wbtReceiver(index)} | dz ${dz.toFixed(3)} | flat=${flat} nearTie=${nearTie} fillDiff=${fillDiff}`)
  }
})
