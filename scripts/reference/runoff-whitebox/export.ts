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
import { buildVariantGround, loadFootprints, loadTerrainRaster, RUNOFF_VARIANTS, sha256OfFile, writeAsc, writeJson, type RunoffVariant } from './common'

const SITE = 'compact-infill'
const OUT_ROOT = 'tmp/runoff-whitebox'
const VARIANT = (process.env.RUNOFF_VARIANT ?? 'standard') as RunoffVariant
const OUT_DIR = VARIANT === 'standard' ? OUT_ROOT : `${OUT_ROOT}/${VARIANT}`

it('exports the Compact Infill terrain as an ESRI ASCII grid for WhiteboxTools (IT-7 step 1)', () => {
  if (!RUNOFF_VARIANTS.includes(VARIANT)) throw new Error(`unknown RUNOFF_VARIANT: ${VARIANT}`)
  mkdirSync(OUT_DIR, { recursive: true })
  const raster = loadTerrainRaster(SITE)
  const footprints = loadFootprints(SITE)
  const { cols, rows, minX, minY, maxX, maxY } = raster
  const dx = (maxX - minX) / cols
  const dy = (maxY - minY) / rows

  const baked = buildVariantGround(raster, footprints, VARIANT)
  expect(baked.cells).toBe(cols * rows) // the Compact Infill tile has no cells without data
  const buildingCells = baked.building.reduce((sum, value) => sum + value, 0)
  if (VARIANT === 'bare') expect(buildingCells).toBe(0)
  else expect(buildingCells).toBeGreaterThan(0)

  // Cross-check the mirrored burn-in. Standard must match `computeRunoff`'s own mask cell-for-cell;
  // offset must match the standard mask (offsets never move a boundary) so the only change is the
  // per-building height, never which cells are buildings. Bare has no buildings to cross-check
  // beyond the `buildingCells === 0` assertion above.
  let terraformSummaryAllDrained: boolean | null = null
  if (VARIANT === 'standard') {
    const runoff = computeRunoff(raster, footprints)
    for (let index = 0; index < cols * rows; index += 1) {
      expect(baked.building[index]).toBe(runoff.building[index])
    }
    terraformSummaryAllDrained = runoff.pits === 0 && runoff.drained === runoff.cells
  } else if (VARIANT === 'offset') {
    const standard = buildVariantGround(raster, footprints, 'standard')
    for (let index = 0; index < cols * rows; index += 1) {
      expect(baked.building[index]).toBe(standard.building[index])
    }
  }

  const cellsize = dx // ESRI ASCII stores one square cell size; dy is recorded and differs by <0.1 %.
  const nodata = -9999
  const ascPath = `${OUT_DIR}/burned.asc`
  writeAsc(ascPath, cols, rows, minX, minY, cellsize, nodata, baked.ground)

  const metadata = {
    site: SITE,
    variant: VARIANT,
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
    buildingRaiseM: VARIANT === 'bare' ? 0 : 10,
    perBuildingOffsetM: VARIANT === 'offset' ? 0.001 : 0,
    footprintCount: footprints.length,
    buildingCells,
    recordedAt: new Date().toISOString(),
    /** sha256 of the `.asc` text file actually fed to WhiteboxTools. */
    burnedAscSha256: sha256OfFile(ascPath),
    terraformSummaryAllDrained,
  }
  writeJson(`${OUT_DIR}/export-metadata.json`, metadata)

  expect(metadata.footprintCount).toBe(520)
  expect(metadata.burnedAscSha256).toMatch(/^[0-9a-f]{64}$/)
})
