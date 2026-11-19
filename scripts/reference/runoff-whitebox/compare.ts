/**
 * TF-VIS-007 step 3 — compare computeRunoff with WhiteboxTools on the same burned Compact Infill
 * terrain and write the per-class agreement plus a diff PNG.
 *
 * Run after step 2 (the WhiteboxTools FillDepressions → D8Pointer → D8FlowAccumulation commands
 * in README.md have produced `tmp/runoff-whitebox/filled.asc` and `accum.asc`):
 *
 *   npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts compare
 *
 * Writes:
 *   - `tmp/runoff-whitebox/comparison.json`  per-class agreement and the confusion matrix
 *   - `tmp/runoff-whitebox/diff.png`         Terraform-only red, Whitebox-only blue, agreement grey
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { computeRunoff } from '../../../src/features/analysis/runoff'
import {
  buildVariantGround,
  classify,
  loadFootprints,
  loadTerrainRaster,
  readAsc,
  RUNOFF_VARIANTS,
  writeJson,
  type RunoffVariant,
} from './common'

const SITE = 'compact-infill'
const VARIANT = (process.env.RUNOFF_VARIANT ?? 'standard') as RunoffVariant
const DIR = VARIANT === 'standard' ? 'tmp/runoff-whitebox' : `tmp/runoff-whitebox/${VARIANT}`

// ---- minimal PNG writer (RGB, no dependency) ------------------------------------------------
let crc32Table: Uint32Array | undefined
function crc32(bytes: Uint8Array): number {
  if (!crc32Table) {
    crc32Table = new Uint32Array(256)
    for (let n = 0; n < 256; n += 1) {
      let c = n
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crc32Table[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) crc = crc32Table[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

function writeRgbPng(path: string, width: number, height: number, rgb: Uint8Array): void {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour RGB
  const scanlines = new Uint8Array(height * (1 + width * 3))
  for (let row = 0; row < height; row += 1) {
    scanlines[row * (1 + width * 3)] = 0 // filter: none
    scanlines.set(rgb.subarray(row * width * 3, (row + 1) * width * 3), row * (1 + width * 3) + 1)
  }
  const idat = deflateSync(scanlines)
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from(signature),
      Buffer.from(pngChunk('IHDR', ihdr)),
      Buffer.from(pngChunk('IDAT', new Uint8Array(idat))),
      Buffer.from(pngChunk('IEND', new Uint8Array(0))),
    ]),
  )
}

it('compares computeRunoff with WhiteboxTools on the burned terrain (IT-7 steps 3–4)', () => {
  const raster = loadTerrainRaster(SITE)
  const footprints = loadFootprints(SITE)
  const { cols, rows, minX, minY, maxX, maxY } = raster
  const dx = (maxX - minX) / cols
  const dy = (maxY - minY) / rows
  const cellArea = dx * dy
  const count = cols * rows

  if (!RUNOFF_VARIANTS.includes(VARIANT)) throw new Error(`unknown RUNOFF_VARIANT: ${VARIANT}`)
  const baked = buildVariantGround(raster, footprints, VARIANT)
  // Standard burns the footprints inside `computeRunoff`; bare/offset bake the input into the
  // raster first and call `computeRunoff` with no footprints, so `runoff.ts` is unchanged.
  const runoff =
    VARIANT === 'standard' ? computeRunoff(raster, footprints) : computeRunoff({ ...raster, heights: baked.heights }, [])
  expect(Number(runoff.accumulation[123 * cols + 456])).toBeGreaterThanOrEqual(0)

  // WhiteboxTools outputs from README.md step 2.
  const filled = readAsc(`${DIR}/filled.asc`)
  const wbAccum = readAsc(`${DIR}/accum.asc`)
  expect(filled.cols).toBe(cols)
  expect(filled.rows).toBe(rows)
  expect(wbAccum.cols).toBe(cols)
  expect(wbAccum.rows).toBe(rows)

  // WhiteboxTools hollow: fill level minus the ground it was given (same burned ground).
  const wbHollow = new Float64Array(count)
  for (let i = 0; i < count; i += 1) wbHollow[i] = Math.max(0, filled.values[i]! - baked.ground[i]!)

  // Classify every cell with the same thresholds. `classify` is the verbatim copy of `runoffClass`;
  // it takes the mask explicitly so bare/offset (where `computeRunoff` runs with no footprints and
  // therefore an empty `runoff.building`) still mask buildings on both sides.
  const tfClass = new Uint8Array(count)
  const wbClass = new Uint8Array(count)
  for (let i = 0; i < count; i += 1) {
    tfClass[i] = classify(baked.building, runoff.accumulation, runoff.hollow, cellArea, i)
    wbClass[i] = classify(baked.building, wbAccum.values, wbHollow, cellArea, i)
  }

  // ---- per-class agreement and the 4 × 4 confusion matrix -------------------------------
  const classes = [1, 2, 3] as const
  const names: Record<number, string> = { 0: 'none', 1: 'depression', 2: 'flow path', 3: 'main flow path' }
  const perClass = {} as Record<string, { both: number; tfOnly: number; wbOnly: number; agreement: number; total: number }>
  const confusion: Record<string, number> = {}
  let edgeDisagreement = 0
  let totalDisagreement = 0
  const isEdge = (i: number) => {
    const row = Math.floor(i / cols)
    const col = i - row * cols
    return row < 2 || col < 2 || row >= rows - 2 || col >= cols - 2
  }
  for (const c of classes) {
    let both = 0
    let tfOnly = 0
    let wbOnly = 0
    for (let i = 0; i < count; i += 1) {
      const t = tfClass[i] === c
      const w = wbClass[i] === c
      if (t && w) both += 1
      else if (t) tfOnly += 1
      else if (w) wbOnly += 1
    }
    perClass[names[c]!] = { both, tfOnly, wbOnly, agreement: both + tfOnly + wbOnly === 0 ? 1 : both / (both + tfOnly + wbOnly), total: both + tfOnly + wbOnly }
  }
  for (let i = 0; i < count; i += 1) {
    const key = `${tfClass[i]},${wbClass[i]}`
    confusion[key] = (confusion[key] ?? 0) + 1
    if (tfClass[i] !== wbClass[i]) {
      totalDisagreement += 1
      if (isEdge(i)) edgeDisagreement += 1
    }
  }

  const main = perClass['main flow path']!
  const summary = {
    cols,
    rows,
    dx,
    dy,
    cellArea,
    cellCount: count,
    variant: VARIANT,
    buildingCells: baked.building.reduce((sum, value) => sum + value, 0),
    terraform: { pits: runoff.pits, drained: runoff.drained, cells: runoff.cells, conserved: runoff.pits === 0 && runoff.drained === runoff.cells },
    perClass,
    confusion,
    disagreement: { total: totalDisagreement, atEdge: edgeDisagreement, share: totalDisagreement / count },
    mainFlowPathAgreement: main.agreement,
    mainFlowPath: { both: main.both, tfOnly: main.tfOnly, wbOnly: main.wbOnly },
  }
  writeJson(`${DIR}/comparison.json`, summary)

  // ---- diff PNG ---------------------------------------------------------------------------
  const grey = [128, 128, 128] as const
  const red = [220, 40, 40] as const
  const blue = [40, 80, 220] as const
  const rgb = new Uint8Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    const colour = tfClass[i] === wbClass[i] ? grey : tfClass[i]! > wbClass[i]! ? red : blue
    rgb[i * 3] = colour[0]
    rgb[i * 3 + 1] = colour[1]
    rgb[i * 3 + 2] = colour[2]
  }
  writeRgbPng(`${DIR}/diff.png`, cols, rows, rgb)

  // Regression: the headline figure is the agreement on main flow path cells (IT-7 ≥ 95 %,
  // or every class of difference explained). Assert only sanity, not the outcome.
  expect(main.both).toBeGreaterThan(0)
  expect(Number.isFinite(main.agreement)).toBe(true)

  console.log(JSON.stringify(summary, null, 2))
})

