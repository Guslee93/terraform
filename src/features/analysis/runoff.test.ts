import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { parseBuildings } from '../sites/package'
import { computeRunoff, DEPRESSION_MIN_M, RUNOFF_LEGEND, RUNOFF_LIMITS, RUNOFF_NOTE, runoffClass, runoffSummary } from './runoff'
import { decodeTerrainRaster, parseTerrainRasterHeader } from './terrainTools'

/** 1 m cells; `z(col, row)` with row 0 in the north. */
function grid(cols: number, rows: number, z: (col: number, row: number) => number) {
  const heights = new Float32Array(cols * rows)
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) heights[row * cols + col] = z(col, row)
  return { cols, rows, minX: 0, minY: 0, maxX: cols, maxY: rows, heights }
}
// The feasibility valley (terrain_bench.py): sides fall to an axis at col 75, the axis falls to the north.
const valley = grid(150, 150, (col, row) => Math.abs(col - 75) * 0.2 + row * 0.05 + 1)

describe('runoff on a synthetic valley (feasibility 04 §1)', () => {
  const runoff = computeRunoff(valley)
  it('conserves water: every cell drains off the tile and no pit is left', () => {
    expect(runoff.pits).toBe(0)
    expect(runoff.cells).toBe(150 * 150)
    expect(runoff.drained).toBe(150 * 150)
    expect(runoffSummary(runoff).conserved).toBe(true)
  })
  it('gathers the flow on the valley axis, growing downhill', () => {
    const axis = (row: number) => runoff.accumulation[row * 150 + 75]!
    expect(axis(100)).toBeGreaterThan(axis(140))
    expect(axis(20)).toBeGreaterThan(axis(100))
    // Away from the axis a cell carries only what the slope above it sheds.
    expect(runoff.accumulation[75 * 150 + 20]).toBeLessThan(axis(75) / 20)
    expect(runoffClass(runoff, 20 * 150 + 75)).toBe(3)
    expect(runoffClass(runoff, 75 * 150 + 10)).toBe(0)
  })
  it('has no depression: a valley that drains is not filled', () => {
    expect(Math.max(...runoff.hollow)).toBeLessThan(DEPRESSION_MIN_M)
    expect(runoffSummary(runoff).depressionShare).toBe(0)
  })
})

describe('depressions', () => {
  // A flat plain tilted gently east, with a 1 m deep 10 × 10 pit in the middle.
  const pit = grid(60, 60, (col, row) => (col >= 25 && col < 35 && row >= 25 && row < 35 ? 4 : 5) + (60 - col) * 0.001)
  const runoff = computeRunoff(pit)
  it('fills a pit to its spill level and still drains everything', () => {
    expect(runoff.pits).toBe(0)
    expect(runoff.drained).toBe(3600)
    const inside = runoff.hollow[30 * 60 + 30]!
    expect(inside).toBeGreaterThan(0.95)
    expect(inside).toBeLessThan(1.05)
    expect(runoff.hollow[10 * 60 + 10]).toBeLessThan(DEPRESSION_MIN_M)
    expect(runoffClass(runoff, 30 * 60 + 30)).toBeGreaterThanOrEqual(1)
    // 100 of 3 600 cells.
    expect(runoffSummary(runoff).depressionShare).toBeCloseTo(100 / 3600, 3)
  })
})

describe('buildings as blocks', () => {
  // A block across the valley axis: the flow must go around it.
  const block: Vec2[] = [[65, 60], [85, 60], [85, 80], [65, 80]]
  const runoff = computeRunoff(valley, [block])
  it('raises the building, sends the flow around it and never draws on it', () => {
    // North is row 0: y 60–80 is rows 70–89, x 65–85 is cols 65–84.
    const inside = 80 * 150 + 75
    expect(runoff.building[inside]).toBe(1)
    expect(runoffClass(runoff, inside)).toBe(0)
    expect(runoff.pits).toBe(0)
    expect(runoff.drained).toBe(150 * 150)
    // The water still arrives on the axis below the block (the north side), having gone around.
    expect(runoff.accumulation[40 * 150 + 75]).toBeGreaterThan(1000)
    // Beside the block the diverted flow is far larger than without it.
    const beside = Math.max(runoff.accumulation[80 * 150 + 64]!, runoff.accumulation[80 * 150 + 85]!)
    expect(beside).toBeGreaterThan(computeRunoff(valley).accumulation[80 * 150 + 64]! * 3)
  })
  it('water held behind the block shows as a depression, not as a loss', () => {
    // Upstream (south) of the block the valley is dammed until it spills around.
    expect(runoff.hollow[92 * 150 + 75]).toBeGreaterThan(DEPRESSION_MIN_M)
  })
})

describe('cells without data', () => {
  it('are outlets: water reaching them counts as drained and they carry none', () => {
    const holed = grid(40, 40, (col, row) => Math.hypot(col - 20, row - 20) * 0.1)
    holed.heights[20 * 40 + 20] = Number.NaN
    const runoff = computeRunoff(holed)
    expect(runoff.cells).toBe(1599)
    expect(runoff.drained).toBe(1599)
    expect(runoff.accumulation[20 * 40 + 20]).toBe(0)
    expect(runoff.pits).toBe(0)
  })
})

describe('what the studio says', () => {
  it('names it a screening, with no rainfall, drainage or depths', () => {
    expect(RUNOFF_NOTE).toBe('Screening: flow paths and depressions on bare-earth terrain with buildings as blocks. No rainfall, drainage or depths.')
    expect(RUNOFF_LIMITS).toContain('water arriving from outside it is not included')
    // IT-7 (TF-VIS-007, adopted 2026-11-18): the reference comparison shows missed paths on flats, so the card says so.
    expect(RUNOFF_LIMITS).toContain('some flow paths may not appear')
    for (const text of [RUNOFF_NOTE, RUNOFF_LIMITS, ...RUNOFF_LEGEND.map((entry) => entry.label)]) expect(text).not.toMatch(/flood depth|return period|\bsafe\b|year flood|mm\b/i)
  })
})

describe('shipped terrain (ADR-0038)', () => {
  it('Compact Infill: the whole tile drains with the buildings burned in, as in feasibility', () => {
    const header = parseTerrainRasterHeader(JSON.parse(readFileSync('public/sites/compact-infill/terrain1m.json', 'utf8')))
    const bytes = readFileSync('public/sites/compact-infill/terrain1m.bin')
    const raster = decodeTerrainRaster(header, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)
    const buildings = parseBuildings(JSON.parse(readFileSync('public/sites/compact-infill/buildings.json', 'utf8'))).buildings
    const started = performance.now()
    const runoff = computeRunoff(raster, buildings.map((building) => building.footprint))
    const elapsed = performance.now() - started
    expect(runoff.pits).toBe(0)
    expect(runoff.drained).toBe(runoff.cells)
    expect(runoff.cells).toBe(header.cols * header.rows)
    const summary = runoffSummary(runoff)
    expect(summary.conserved).toBe(true)
    expect(summary.mainFlowPathCells).toBeGreaterThan(200)
    expect(summary.depressionShare).toBeGreaterThan(0)
    expect(summary.depressionShare).toBeLessThan(0.5)
    // It runs in a worker; this bound only catches a return to something quadratic.
    expect(elapsed).toBeLessThan(8000)
  })
})
