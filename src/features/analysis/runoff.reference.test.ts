import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { computeRunoff, MAIN_FLOW_PATH_M2, runoffClass } from './runoff'

/**
 * Regression against the WhiteboxTools reference (feasibility IT-7, TF-VIS-007). The fixtures are
 * a ≤200 × 200 cell crop of the Compact Infill 1 m terrain centred on a main flow path, plus the
 * WhiteboxTools D8 flow accumulation for that crop, written by
 * `scripts/reference/runoff-whitebox/crop.ts`. Both `computeRunoff` and WhiteboxTools see the same
 * cropped tile with its edges as outlets; the test asserts they agree on main-flow-path cells.
 */

const FIXTURES = 'src/features/analysis/__fixtures__/runoff-reference'

/**
 * Exact agreement floor on main-flow-path cells (Jaccard). Measured ≈ 67 % on the full tile and
 * ≈ 64 % on this crop (docs/qa/runoff-reference.md). The bare-terrain control run refuted the
 * courtyard explanation; the gap sits in how the two tools route water across filled flats. This is
 * a regression floor, not the acceptance rule.
 */
const MAIN_PATH_AGREEMENT_MIN = 0.6

/**
 * IT-7 acceptance adopted by the owner on 2026-11-18 (docs/qa/runoff-reference.md, "Proposed
 * acceptance"): no invented paths — at least 95 % of Terraform's main-path cells lie within
 * `NO_INVENTED_PATHS_CELLS` cells of a WhiteboxTools main path. Measured 97.0 % on this crop.
 * Missed reference paths are disclosed in RUNOFF_LIMITS, not asserted here.
 */
const NO_INVENTED_PATHS_MIN = 0.95
const NO_INVENTED_PATHS_CELLS = 2

type CropHeader = { cols: number; rows: number; minX: number; minY: number; maxX: number; maxY: number }

function readFloats(path: string): Float32Array {
  const bytes = readFileSync(path)
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return new Float32Array(buffer)
}

/** Minimal ESRI ASCII reader; the reference accumulation is a WhiteboxTools `.asc` output (north row first). */
function readAsc(path: string): { cols: number; rows: number; values: Float64Array } {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/)
  let cols = 0
  let rows = 0
  const data: string[] = []
  let inData = false
  for (const raw of lines) {
    const line = raw.trim()
    if (line === '') continue
    const lower = line.toLowerCase()
    if (!inData && lower.startsWith('ncols')) cols = Number(line.split(/\s+/)[1])
    else if (!inData && lower.startsWith('nrows')) rows = Number(line.split(/\s+/)[1])
    else if (!inData && (lower.startsWith('xllcorner') || lower.startsWith('yllcorner') || lower.startsWith('cellsize') || lower.startsWith('nodata'))) continue
    else {
      inData = true
      data.push(line)
    }
  }
  const values = new Float64Array(cols * rows)
  let at = 0
  for (const line of data) for (const token of line.split(/\s+/)) if (token !== '') values[at++] = Number(token)
  return { cols, rows, values }
}

describe('runoff against the WhiteboxTools reference (IT-7)', () => {
  const header: CropHeader = JSON.parse(readFileSync(`${FIXTURES}/crop-header.json`, 'utf8'))
  const heights = readFloats(`${FIXTURES}/crop-heights.bin`)
  const footprints = (JSON.parse(readFileSync(`${FIXTURES}/crop-buildings.json`, 'utf8')) as { footprints: Vec2[][] }).footprints
  const reference = readAsc(`${FIXTURES}/crop-reference-accumulation.asc`)
  const raster = { ...header, heights }

  it('fits the 200 × 200 cell crop limit and carries data', () => {
    expect(header.cols).toBeGreaterThan(0)
    expect(header.cols).toBeLessThanOrEqual(200)
    expect(header.rows).toBeGreaterThan(0)
    expect(header.rows).toBeLessThanOrEqual(200)
    expect(heights.length).toBe(header.cols * header.rows)
    expect(reference.cols).toBe(header.cols)
    expect(reference.rows).toBe(header.rows)
  })

  it('agrees with the stored WhiteboxTools accumulation on main flow path cells', () => {
    const runoff = computeRunoff(raster, footprints)
    expect(runoff.pits).toBe(0)
    const { cellArea } = runoff
    let both = 0
    let terraformOnly = 0
    let whiteboxOnly = 0
    for (let index = 0; index < runoff.accumulation.length; index += 1) {
      const terraformMain = runoffClass(runoff, index) === 3
      // The reference already burns the same footprints; buildings are never a main path, so
      // mask them on the reference side with the same building map computeRunoff produced.
      const whiteboxMain = !runoff.building[index] && reference.values[index]! * cellArea >= MAIN_FLOW_PATH_M2
      if (terraformMain && whiteboxMain) both += 1
      else if (terraformMain) terraformOnly += 1
      else if (whiteboxMain) whiteboxOnly += 1
    }
    const union = both + terraformOnly + whiteboxOnly
    expect(union).toBeGreaterThan(0) // the crop must contain main-path cells
    const agreement = both / union
    expect(agreement).toBeGreaterThanOrEqual(MAIN_PATH_AGREEMENT_MIN)
  })

  it('draws no main flow path the reference lacks (IT-7 acceptance, within 2 cells)', () => {
    const runoff = computeRunoff(raster, footprints)
    const { cols, rows } = header
    const whiteboxMain = (index: number) => !runoff.building[index] && reference.values[index]! * runoff.cellArea >= MAIN_FLOW_PATH_M2
    let near = 0
    let total = 0
    for (let index = 0; index < runoff.accumulation.length; index += 1) {
      if (runoff.building[index] || runoffClass(runoff, index) !== 3) continue
      total += 1
      const row = Math.floor(index / cols)
      const col = index - row * cols
      let found = false
      for (let dr = -NO_INVENTED_PATHS_CELLS; dr <= NO_INVENTED_PATHS_CELLS && !found; dr += 1) {
        for (let dc = -NO_INVENTED_PATHS_CELLS; dc <= NO_INVENTED_PATHS_CELLS; dc += 1) {
          const r = row + dr
          const c = col + dc
          if (r >= 0 && c >= 0 && r < rows && c < cols && whiteboxMain(r * cols + c)) { found = true; break }
        }
      }
      if (found) near += 1
    }
    expect(total).toBeGreaterThan(0)
    expect(near / total).toBeGreaterThanOrEqual(NO_INVENTED_PATHS_MIN)
  })
})
