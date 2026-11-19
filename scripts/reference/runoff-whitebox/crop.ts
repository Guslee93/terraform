/**
 * TF-VIS-007 step 4 — crop a ≤200 × 200 cell window around one main flow path, store the crop and
 * the WhiteboxTools accumulation for it as committed fixtures, so `runoff.reference.test.ts` can
 * check `computeRunoff` against the reference tool without re-running the whole tile.
 *
 * Also runs WhiteboxTools on the cropped burned terrain (same FillDepressions → D8Pointer →
 * D8FlowAccumulation pipeline as the full tile) and saves that accumulation as the reference.
 * Requires the WhiteboxTools binary, given by the WBT_BIN environment variable (see README.md).
 *
 *   npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts crop
 *
 * Writes under `src/features/analysis/__fixtures__/runoff-reference/`:
 *   - `crop-header.json`                    crop bounds (ENU metres, cell size preserved)
 *   - `crop-heights.bin`                    raw (unburned) Float32 heights, north row first
 *   - `crop-buildings.json`                 the footprints that overlap the crop (original ENU)
 *   - `crop-reference-accumulation.asc`     WhiteboxTools D8FlowAccumulation (`cells`) for the crop
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { computeRunoff, runoffClass } from '../../../src/features/analysis/runoff'
import { burnFootprints, loadFootprints, loadTerrainRaster, readAsc, writeAsc, writeJson } from './common'

const SITE = 'compact-infill'
const TMP = 'tmp/runoff-whitebox'
const FIXTURES = 'src/features/analysis/__fixtures__/runoff-reference'
const WINDOW = 200
const WBT = process.env.WBT_BIN ?? '/home/node/whiteboxtools/WhiteboxTools_linux_amd64/WBT/whitebox_tools'

it('writes the crop fixtures and the WhiteboxTools reference accumulation (IT-7 step 4)', () => {
  mkdirSync(FIXTURES, { recursive: true })
  mkdirSync(TMP, { recursive: true })
  const raster = loadTerrainRaster(SITE)
  const footprints = loadFootprints(SITE)
  const { cols, rows } = raster
  const dx = (raster.maxX - raster.minX) / cols
  const dy = (raster.maxY - raster.minY) / rows

  const runoff = computeRunoff(raster, footprints)

  // Pick the cell with the most accumulation — the mouth of the main channel — and centre a
  // WINDOW × WINDOW crop on it, clamped to the tile.
  let centre = 0
  for (let i = 1; i < runoff.accumulation.length; i += 1) {
    if (runoff.accumulation[i]! > runoff.accumulation[centre]!) centre = i
  }
  const centreRow = Math.floor(centre / cols)
  const centreCol = centre - centreRow * cols
  const col0 = Math.max(0, Math.min(cols - WINDOW, centreCol - Math.floor(WINDOW / 2)))
  const row0 = Math.max(0, Math.min(rows - WINDOW, centreRow - Math.floor(WINDOW / 2)))
  const cropCols = Math.min(WINDOW, cols - col0)
  const cropRows = Math.min(WINDOW, rows - row0)

  // Crop bounds and raw heights (row 0 = the north edge, as in the full tile).
  const cropMinX = raster.minX + col0 * dx
  const cropMaxX = raster.minX + (col0 + cropCols) * dx
  const cropMaxY = raster.maxY - row0 * dy
  const cropMinY = raster.maxY - (row0 + cropRows) * dy
  const heights = new Float32Array(cropCols * cropRows)
  for (let r = 0; r < cropRows; r += 1) {
    for (let c = 0; c < cropCols; c += 1) heights[r * cropCols + c] = raster.heights[(row0 + r) * cols + (col0 + c)]!
  }

  // Footprints that intersect the crop bbox (vertices stay in the original ENU frame).
  const cropFootprints = footprints.filter((ring) => {
    const xs = ring.map((point) => point[0])
    const ys = ring.map((point) => point[1])
    return Math.min(...xs) < cropMaxX && Math.max(...xs) > cropMinX && Math.min(...ys) < cropMaxY && Math.max(...ys) > cropMinY
  })

  const cropRaster = { cols: cropCols, rows: cropRows, minX: cropMinX, minY: cropMinY, maxX: cropMaxX, maxY: cropMaxY, heights }
  const cropRunoff = computeRunoff(cropRaster, cropFootprints)
  let cropMain = 0
  for (let i = 0; i < cropCols * cropRows; i += 1) if (runoffClass(cropRunoff, i) === 3) cropMain += 1
  expect(cropMain).toBeGreaterThan(10) // the window must sit on a real main channel
  expect(cropFootprints.length).toBeGreaterThan(0)

  // The same burned ground the test's computeRunoff will produce, fed to WhiteboxTools.
  const burned = burnFootprints(cropRaster, cropFootprints)
  writeAsc(`${TMP}/crop-burned.asc`, cropCols, cropRows, cropMinX, cropMinY, dx, -9999, burned.ground)

  // FillDepressions → D8Pointer → D8FlowAccumulation, exactly as the full tile (README.md §2).
  // `--flat_increment=0.00001` matches the app's EPSILON_M and avoids a WhiteboxTools v2.4.0 bug
  // in the auto flat-increment (README.md §2).
  execFileSync(WBT, ['-r=FillDepressions', '-v', `--wd=${process.cwd()}/${TMP}`, '-i=crop-burned.asc', '-o=crop-filled.tif', '--fix_flats', '--flat_increment=0.00001'], { stdio: 'inherit' })
  execFileSync(WBT, ['-r=D8Pointer', '-v', `--wd=${process.cwd()}/${TMP}`, '-i=crop-filled.tif', '-o=crop-pointer.tif'], { stdio: 'inherit' })
  execFileSync(WBT, ['-r=D8FlowAccumulation', '-v', `--wd=${process.cwd()}/${TMP}`, '-i=crop-pointer.tif', '-o=crop-accum.asc', '--pntr', '--out_type=cells'], { stdio: 'inherit' })

  const reference = readAsc(`${TMP}/crop-accum.asc`)
  expect(reference.cols).toBe(cropCols)
  expect(reference.rows).toBe(cropRows)

  // Committed fixtures.
  writeJson(`${FIXTURES}/crop-header.json`, {
    schemaVersion: 1,
    siteId: SITE,
    cols: cropCols,
    rows: cropRows,
    minX: cropMinX,
    minY: cropMinY,
    maxX: cropMaxX,
    maxY: cropMaxY,
    /** Whole-tile cell of the crop's north-west cell, for tracing back to the source tile. */
    sourceCol0: col0,
    sourceRow0: row0,
    cellArea: dx * dy,
  })
  writeFileSync(`${FIXTURES}/crop-heights.bin`, Buffer.from(heights.buffer.slice(heights.byteOffset, heights.byteOffset + heights.byteLength)))
  writeJson(`${FIXTURES}/crop-buildings.json`, { schemaVersion: 1, siteId: SITE, footprints: cropFootprints })
  writeAsc(`${FIXTURES}/crop-reference-accumulation.asc`, cropCols, cropRows, cropMinX, cropMinY, dx, -9999, reference.values)

  expect(cropCols).toBeLessThanOrEqual(WINDOW)
  expect(cropRows).toBeLessThanOrEqual(WINDOW)
})
