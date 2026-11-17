/**
 * TF-VIS-007 step 1 — export the burned 1 m terrain as an ESRI ASCII grid for WhiteboxTools.
 *
 * Loads the Compact Infill 1 m tile and its 520 context footprints (no drawn blocks), burns the
 * footprints in exactly as `computeRunoff` does (via `burnFootprints`, which mirrors runoff.ts's
 * unexported burn loop), and writes:
 *   - `burned.asc`               the burned DEM, north row first, ESRI ASCII
 *   - `export-metadata.json`     origin, cell size, orientation, footprint count, checksums
 *
 *   npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts export
 */
import { mkdirSync } from 'node:fs'
import { expect, it } from 'vitest'
import { computeRunoff } from '../../../src/features/analysis/runoff'
import { burnFootprints, loadFootprints, loadTerrainRaster, sha256OfFile, writeAsc, writeJson } from './common'

const SITE = 'compact-infill'
const OUT_DIR = 'tmp/runoff-whitebox'

it('exports the burned Compact Infill terrain as an ESRI ASCII grid (IT-7 step 1)', () => {
  mkdirSync(OUT_DIR, { recursive: true })
  const raster = loadTerrainRaster(SITE)
  const footprints = loadFootprints(SITE)
  const { cols, rows, minX, minY, maxX, maxY } = raster
  const dx = (maxX - minX) / cols
  const dy = (maxY - minY) / rows

  const burned = burnFootprints(raster, footprints)
  expect(burned.cells).toBe(cols * rows) // the Compact Infill tile has no cells without data
  expect(burned.building.reduce((sum, value) => sum + value, 0)).toBeGreaterThan(0)

  // Cross-check the mirrored burn-in against the real one: the building mask must match
  // `computeRunoff`'s own burn cell-for-cell.
  const runoff = computeRunoff(raster, footprints)
  for (let index = 0; index < cols * rows; index += 1) {
    expect(burned.building[index]).toBe(runoff.building[index])
  }

  const cellsize = dx // ESRI ASCII stores one square cell size; dy is recorded and differs by <0.1 %.
  const nodata = -9999
  const ascPath = `${OUT_DIR}/burned.asc`
  writeAsc(ascPath, cols, rows, minX, minY, cellsize, nodata, burned.ground)

  const metadata = {
    site: SITE,
    cols,
    rows,
    minX,
    minY,
    maxX,
    maxY,
    dx,
    dy,
    cellArea: dx * dy,
    /** ESRI ASCII has one square `cellsize`; the tile is actually 1 m nominal with dx != dy. */
    ascCellsize: cellsize,
    /** Row 0 is the north edge, first line produced; matches TerrainRaster and ESRI ASCII. */
    orientation: 'north row first',
    nodata,
    buildingRaiseM: 10,
    footprintCount: footprints.length,
    buildingCells: burned.building.reduce((sum, value) => sum + value, 0),
    recordedAt: new Date().toISOString(),
    /** sha256 of the `.asc` text file actually fed to WhiteboxTools. */
    burnedAscSha256: sha256OfFile(ascPath),
    terraformSummaryAllDrained: runoff.pits === 0 && runoff.drained === runoff.cells,
  }
  writeJson(`${OUT_DIR}/export-metadata.json`, metadata)

  expect(metadata.footprintCount).toBe(520)
  expect(metadata.burnedAscSha256).toMatch(/^[0-9a-f]{64}$/)
})
