/**
 * TF-VIS-007 — tolerance analysis on the committed crop or the full tile. Exact cell-by-cell
 * Jaccard treats a path shifted by one cell as a total miss, so this measures, for main and flow
 * paths, how many of each tool's cells lie within k cells of the other's (k = 0…3), then locates
 * the reference main-path cells Terraform misses and the points where the two flows part.
 *
 * Two scopes:
 *   - `crop` (default) — reads only committed fixtures; needs no WhiteboxTools.
 *   - `tile` — reads the full Compact Infill tile and the pipeline's WhiteboxTools output
 *     (`tmp/runoff-whitebox[/<variant>]/accum.asc`, produced by README step 2), selected with
 *     `RUNOFF_TOLERANCE_SCOPE=tile` and `RUNOFF_VARIANT` (standard / bare / offset).
 *
 *   npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts tolerance
 *   RUNOFF_TOLERANCE_SCOPE=tile RUNOFF_VARIANT=standard npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts tolerance
 */
import { readFileSync } from 'node:fs'
import { it } from 'vitest'
import type { Vec2 } from '../../../src/lib/coordinates'
import { computeRunoff, FLOW_PATH_M2, MAIN_FLOW_PATH_M2 } from '../../../src/features/analysis/runoff'
import {
  buildVariantGround,
  classify,
  loadFootprints,
  loadTerrainRaster,
  readAsc,
  RUNOFF_VARIANTS,
  type RunoffVariant,
} from './common'

const FIXTURES = 'src/features/analysis/__fixtures__/runoff-reference'
const SITE = 'compact-infill'
const SCOPE = (process.env.RUNOFF_TOLERANCE_SCOPE ?? 'crop') as 'crop' | 'tile'
const VARIANT = (process.env.RUNOFF_VARIANT ?? 'standard') as RunoffVariant
/** A Terraform hollow deeper than this is "in a filled hollow", not "on unfilled ground". */
const HOLLOW_FILLED_M = 0.001

function readAscValues(path: string): number[] {
  const values: number[] = []
  let inData = false
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim().toLowerCase()
    if (!line) continue
    if (!inData && /^(ncols|nrows|xll|yll|cellsize|nodata)/.test(line)) continue
    inData = true
    for (const token of line.split(/\s+/)) values.push(Number(token))
  }
  return values
}

it('measures Terraform ↔ WhiteboxTools path agreement with a cell tolerance', () => {
  let cols: number
  let rows: number
  let heights: ArrayLike<number>
  let buildingMask: Uint8Array
  let reference: ArrayLike<number>
  let runoff: ReturnType<typeof computeRunoff>

  if (SCOPE === 'tile') {
    if (!RUNOFF_VARIANTS.includes(VARIANT)) throw new Error(`unknown RUNOFF_VARIANT: ${VARIANT}`)
    const raster = loadTerrainRaster(SITE)
    const footprints = loadFootprints(SITE)
    const baked = buildVariantGround(raster, footprints, VARIANT)
    // Standard burns inside `computeRunoff`; bare/offset bake the input first, as compare.ts does.
    runoff = VARIANT === 'standard' ? computeRunoff(raster, footprints) : computeRunoff({ ...raster, heights: baked.heights }, [])
    const dir = VARIANT === 'standard' ? 'tmp/runoff-whitebox' : `tmp/runoff-whitebox/${VARIANT}`
    const accum = readAsc(`${dir}/accum.asc`)
    cols = accum.cols
    rows = accum.rows
    heights = baked.ground
    buildingMask = baked.building
    reference = accum.values
  } else {
    const header = JSON.parse(readFileSync(`${FIXTURES}/crop-header.json`, 'utf8'))
    const bytes = readFileSync(`${FIXTURES}/crop-heights.bin`)
    heights = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
    const footprints = (JSON.parse(readFileSync(`${FIXTURES}/crop-buildings.json`, 'utf8')) as { footprints: Vec2[][] }).footprints
    reference = readAscValues(`${FIXTURES}/crop-reference-accumulation.asc`)
    cols = (header as { cols: number }).cols
    rows = (header as { rows: number }).rows
    runoff = computeRunoff({ ...header, heights }, footprints)
    buildingMask = runoff.building
  }
  const count = cols * rows
  const cellArea = runoff.cellArea

  const near = (mask: Uint8Array, index: number, k: number) => {
    const row = Math.floor(index / cols), col = index % cols
    for (let dr = -k; dr <= k; dr += 1) for (let dc = -k; dc <= k; dc += 1) {
      const r = row + dr, c = col + dc
      if (r >= 0 && c >= 0 && r < rows && c < cols && mask[r * cols + c]) return true
    }
    return false
  }
  const masks = (minClass: number, area: number) => {
    const terraform = new Uint8Array(count), whitebox = new Uint8Array(count)
    for (let index = 0; index < count; index += 1) {
      if (buildingMask[index]) continue
      terraform[index] = classify(buildingMask, runoff.accumulation, runoff.hollow, cellArea, index) >= minClass ? 1 : 0
      whitebox[index] = reference[index]! * cellArea >= area ? 1 : 0
    }
    return { terraform, whitebox }
  }
  const pct = (a: number, b: number) => `${((a / b) * 100).toFixed(1)} %`

  console.log(`scope ${SCOPE}${SCOPE === 'tile' ? ` variant ${VARIANT}` : ''}: pits ${runoff.pits}, cells ${count}`)
  for (const [name, minClass, area] of [['main', 3, MAIN_FLOW_PATH_M2], ['flow', 2, FLOW_PATH_M2]] as const) {
    const { terraform, whitebox } = masks(minClass, area)
    for (const k of [0, 1, 2, 3]) {
      let tNear = 0, tCount = 0, wNear = 0, wCount = 0
      for (let index = 0; index < count; index += 1) {
        if (terraform[index]) { tCount += 1; if (near(whitebox, index, k)) tNear += 1 }
        if (whitebox[index]) { wCount += 1; if (near(terraform, index, k)) wNear += 1 }
      }
      console.log(`${name} k=${k}: Terraform near WhiteboxTools ${pct(tNear, tCount)} of ${tCount}; WhiteboxTools near Terraform ${pct(wNear, wCount)} of ${wCount}`)
    }
  }

  // Reference main-path cells Terraform misses by more than 3 cells: where are they, how much flow does Terraform carry there?
  const { terraform, whitebox } = masks(3, MAIN_FLOW_PATH_M2)
  const byEdge: Record<string, number> = {}
  const ratios: number[] = []
  for (let index = 0; index < count; index += 1) {
    if (!whitebox[index] || near(terraform, index, 3)) continue
    const row = Math.floor(index / cols), col = index % cols
    const edge = Math.min(row, col, rows - 1 - row, cols - 1 - col)
    const key = edge === 0 ? 'on edge' : edge <= 2 ? '1–2 from edge' : edge <= 10 ? '3–10' : '> 10'
    byEdge[key] = (byEdge[key] ?? 0) + 1
    ratios.push(runoff.accumulation[index]! / reference[index]!)
  }
  ratios.sort((a, b) => a - b)
  console.log('missed by > 3 cells, by distance to the edge:', byEdge)
  console.log(`Terraform / WhiteboxTools accumulation there: median ${ratios[Math.floor(ratios.length / 2)]?.toFixed(3)}, max ${ratios.at(-1)?.toFixed(3)}`)

  // Divergence: a reference main-path cell where Terraform still carries the flow, next to a
  // downstream reference cell where it has lost it. Classified by Terraform's hollow at the
  // divergence point: "in a filled hollow" (hollow > 1 mm) vs "on unfilled ground".
  const ratio = (index: number) => runoff.accumulation[index]! / reference[index]!
  const inHollow: string[] = []
  const unfilled: string[] = []
  for (let index = 0; index < count; index += 1) {
    if (!whitebox[index] || ratio(index) <= 0.5) continue
    const row = Math.floor(index / cols), col = index % cols
    for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
      const r = row + dr, c = col + dc
      if ((!dr && !dc) || r < 0 || c < 0 || r >= rows || c >= cols) continue
      const next = r * cols + c
      if (!whitebox[next] || ratio(next) >= 0.05 || reference[next]! <= reference[index]!) continue
      const line = `(${row},${col}) → (${r},${c}): hollow ${runoff.hollow[index]!.toFixed(3)} m, dz ${(heights[next]! - heights[index]!).toFixed(3)} m, reference ${reference[index]} → ${reference[next]}, Terraform ${runoff.accumulation[index]!.toFixed(0)} → ${runoff.accumulation[next]!.toFixed(0)}`
      if (runoff.hollow[index]! > HOLLOW_FILLED_M) inHollow.push(line)
      else unfilled.push(line)
    }
  }
  console.log(`divergence points: ${inHollow.length} in a filled hollow, ${unfilled.length} on unfilled ground`)
  for (const line of inHollow) console.log(`  [filled hollow] ${line}`)
  for (const line of unfilled) console.log(`  [unfilled ground] ${line}`)
})
