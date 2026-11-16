import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { project } from '../import/projection'
import { parseSiteManifest } from '../sites/manifest'
import { siteLayers } from '../sites/provenance'
import { decodeTerrainRaster, elevationAt, hornSlopeDeg, parseTerrainRasterHeader, profileRange, SLOPE_BANDS, slopeBandIndex, slopeShares, terrainProfile, TERRAIN_NO_DATA, type TerrainRaster } from './terrainTools'

/** A raster of 1 m cells whose cell-centre heights follow `z(east, north)`. */
function surface(z: (x: number, y: number) => number, size = 200): TerrainRaster {
  const heights = new Float32Array(size * size)
  for (let row = 0; row < size; row += 1) for (let col = 0; col < size; col += 1) heights[row * size + col] = z(col + 0.5, size - (row + 0.5))
  return { cols: size, rows: size, minX: 0, minY: 0, maxX: size, maxY: size, originElevation: 0, heights }
}
/** Float32 storage limits a height to about 1e-6 m, so analytic surfaces are checked in Float64 terms. */
const inner = (raster: TerrainRaster, values: Float32Array, margin: number) => {
  const out: number[] = []
  for (let row = margin; row < raster.rows - margin; row += 1) for (let col = margin; col < raster.cols - margin; col += 1) out.push(values[row * raster.cols + col]!)
  return out
}

describe('Horn slope (feasibility 04 §1)', () => {
  it('is exact on a plane', () => {
    // Heights that Float32 holds exactly, so the only error left is the method's.
    const plane = surface((x, y) => 0.125 * x + 0.0625 * y)
    const exact = (Math.atan(Math.hypot(0.125, 0.0625)) * 180) / Math.PI
    const worst = Math.max(...inner(plane, hornSlopeDeg(plane), 1).map((value) => Math.abs(value - exact)))
    // The slope array is Float32: 1e-5° is its resolution at 8°. The Float64 computation is exact.
    expect(worst).toBeLessThan(1e-5)
  })
  it('is exact on a quadratic bowl', () => {
    const k = 1 / 512
    const bowl = surface((x, y) => k * ((x - 100) ** 2 + (y - 100) ** 2))
    const slope = hornSlopeDeg(bowl)
    let worst = 0
    for (let row = 2; row < 198; row += 1) for (let col = 2; col < 198; col += 1) {
      const r = Math.hypot(col + 0.5 - 100, 200 - (row + 0.5) - 100)
      worst = Math.max(worst, Math.abs(slope[row * 200 + col]! - (Math.atan(2 * k * r) * 180) / Math.PI))
    }
    expect(worst).toBeLessThan(1e-4)
  })
  it('uses the cell size in each direction', () => {
    const stretched = { ...surface((x) => 0.125 * x, 50), maxX: 100 } // 2 m cells east–west
    expect(hornSlopeDeg(stretched)[25 * 50 + 25]).toBeCloseTo((Math.atan(0.0625) * 180) / Math.PI, 5)
  })
  it('bands slopes at 5°, 15° and 30° and reports their shares', () => {
    expect([0, 4.99, 5, 14.9, 15, 29.9, 30, 80].map(slopeBandIndex)).toEqual([0, 0, 1, 1, 2, 2, 3, 3])
    expect(slopeShares(new Float32Array([1, 2, 6, 20, 45, Number.NaN]))).toEqual([0.4, 0.2, 0.2, 0.2])
    expect(SLOPE_BANDS.map((band) => band.label)).toEqual(['Under 5°', '5–15°', '15–30°', 'Over 30°'])
  })
})

describe('elevation and profile', () => {
  const plane = surface((x, y) => 0.125 * x + 0.0625 * y)
  it('bilinear elevation is exact on a plane, between cell centres too', () => {
    let worst = 0
    for (let t = 0; t < 300; t += 1) {
      const x = 20 + t * 0.37, y = 79.7
      worst = Math.max(worst, Math.abs(elevationAt(plane, x, y)! - (0.125 * x + 0.0625 * y)))
    }
    expect(worst).toBeLessThan(1e-9)
  })
  it('a profile walks the line at the step, includes the end point, and is exact on a plane', () => {
    const line: Vec2[] = [[10, 50], [110, 50], [110, 80]]
    const profile = terrainProfile(plane, line, 1)
    expect(profile).toHaveLength(100 + 30 + 1)
    expect(profile[0]).toMatchObject({ distance: 0, x: 10, y: 50 })
    expect(profile.at(-1)).toMatchObject({ distance: 130, x: 110, y: 80 })
    expect(Math.max(...profile.map((point) => Math.abs(point.elevation! - (0.125 * point.x + 0.0625 * point.y))))).toBeLessThan(1e-9)
    expect(profileRange(profile)).toEqual({ min: 0.125 * 10 + 0.0625 * 50, max: 0.125 * 110 + 0.0625 * 80 })
  })
  it('is null off the raster and beside a cell without data', () => {
    expect(elevationAt(plane, -5, 50)).toBeNull()
    expect(elevationAt(plane, 50, 500)).toBeNull()
    const holed = { ...plane, heights: plane.heights.slice() }
    holed.heights[100 * 200 + 100] = Number.NaN
    expect(elevationAt(holed, 100.6, 99.4)).toBeNull()
    expect(profileRange(terrainProfile(plane, [[-50, -50], [-40, -50]]))).toBeNull()
  })
})

describe('raster file', () => {
  const header = { schemaVersion: 1, siteId: 'demo', cols: 2, rows: 2, minX: 0, minY: 0, maxX: 2, maxY: 2, originElevation: 20.28, verticalDatum: 'NN2000' }
  it('decodes little-endian centimetres and marks cells without data', () => {
    const buffer = new ArrayBuffer(8)
    const view = new DataView(buffer)
    ;[123, -45, TERRAIN_NO_DATA, 0].forEach((value, index) => view.setInt16(index * 2, value, true))
    const raster = decodeTerrainRaster(parseTerrainRasterHeader(header), buffer)
    expect(Array.from(raster.heights.slice(0, 2)).map((v) => Number(v.toFixed(2)))).toEqual([1.23, -0.45])
    expect(raster.heights[2]).toBeNaN()
    expect(raster.originElevation).toBe(20.28)
  })
  it('rejects a header without a grid, and a file of the wrong size', () => {
    expect(() => parseTerrainRasterHeader({ ...header, cols: 1 })).toThrow(/grid/)
    expect(() => parseTerrainRasterHeader({ ...header, maxX: 0 })).toThrow(/max must exceed min/)
    expect(() => decodeTerrainRaster(parseTerrainRasterHeader(header), new ArrayBuffer(6))).toThrow(/file size/)
  })
})

describe('shipped 1 m terrain (ADR-0037)', () => {
  const load = (site: string) => {
    const header = parseTerrainRasterHeader(JSON.parse(readFileSync(`public/sites/${site}/terrain1m.json`, 'utf8')))
    const bytes = readFileSync(`public/sites/${site}/terrain1m.bin`)
    return decodeTerrainRaster(header, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)
  }
  // The feasibility W–E section (terrain_bench.py): EPSG:25833 (262663, 6650490) → (263242, 6650490),
  // 579 m at 1 m steps, 8.98–21.44 m NN2000. Its end points in WGS84 (Krüger series, checked against
  // the site origin to 1e-7°), then through the app's projection.
  it('Compact Infill: the reference W–E section reads 8.98–21.44 m within 0.05 m', () => {
    const raster = load('compact-infill')
    const origin = { latitude: 59.9235, longitude: 10.758 }
    const west = project(59.92332933425683, 10.752829030683776, origin.latitude, origin.longitude)
    const east = project(59.923662125599456, 10.763157240628889, origin.latitude, origin.longitude)
    const profile = terrainProfile(raster, [west, east], 1)
    expect(profile.at(-1)!.distance).toBeCloseTo(579, 0)
    expect(profile.every((point) => point.elevation !== null)).toBe(true)
    const range = profileRange(profile)!
    expect(Math.abs(range.min + raster.originElevation - 8.98)).toBeLessThanOrEqual(0.05)
    expect(Math.abs(range.max + raster.originElevation - 21.44)).toBeLessThanOrEqual(0.05)
  })
  it('Compact Infill: the site slope matches the feasibility percentiles', () => {
    const slope = Array.from(hornSlopeDeg(load('compact-infill'))).sort((a, b) => a - b)
    // Feasibility (a slightly different 600 m tile): p50 2.53°, p90 9.71°.
    expect(slope[Math.floor(slope.length * 0.5)]).toBeGreaterThan(1.5)
    expect(slope[Math.floor(slope.length * 0.5)]).toBeLessThan(3.5)
    expect(slope[Math.floor(slope.length * 0.9)]).toBeGreaterThan(7)
    expect(slope[Math.floor(slope.length * 0.9)]).toBeLessThan(13)
  })
  it.each(['compact-infill', 'sloped-edge'])('%s: the tile covers the terrain extent and is registered with Kartverket, CC BY 4.0', (site) => {
    const raster = load(site)
    const terrain = JSON.parse(readFileSync(`public/sites/${site}/terrain.json`, 'utf8')) as { minX: number; maxX: number; minY: number; maxY: number; originElevation: number }
    expect([raster.minX, raster.maxX, raster.minY, raster.maxY]).toEqual([terrain.minX, terrain.maxX, terrain.minY, terrain.maxY])
    expect(raster.originElevation).toBe(terrain.originElevation)
    // The 1 m tile and the package's coarse grid are the same ground: within 0.5 m at the origin.
    expect(Math.abs(elevationAt(raster, 0, 0)!)).toBeLessThan(0.5)
    const manifest = parseSiteManifest(JSON.parse(readFileSync(`public/sites/${site}/manifest.json`, 'utf8')))
    expect(siteLayers(manifest).layers.find((layer) => layer.id === 'terrain1m')).toMatchObject({ owner: 'Kartverket', licence: 'CC BY 4.0' })
  })
})
