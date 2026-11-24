import { describe, expect, it } from 'vitest'
import { groundResolution, mapTilerTileUrl, tilePlan, tileXY } from './tileGround'

describe('tileXY', () => {
  it('matches the slippy-map formula at known points', () => {
    expect(tileXY(0, 0, 1)).toEqual([1, 1])
    // Oslo city hall (59.9119 N, 10.7336 E): z14 tile 8680 / 4765 (asinh form: x 8680.50, y 4765.92).
    const [x, y] = tileXY(59.9119, 10.7336, 14)
    expect(x).toBeCloseTo(8680.498, 3)
    expect(y).toBeCloseTo(4765.916, 3)
  })
})

describe('tilePlan (compact-infill, 623.7 × 734.2 m)', () => {
  const origin = { latitude: 59.9235, longitude: 10.758 }
  const tile = { minX: -311.86, maxX: 311.86, minY: -367.12, maxY: 367.12 }

  it('picks the coarsest zoom at or under 0.3 m/px for 512 px tiles (z17 at 60° N)', () => {
    const plan = tilePlan(origin, tile)
    expect(plan.zoom).toBe(17)
    expect(groundResolution(origin.latitude, plan.zoom, 512)).toBeLessThanOrEqual(0.3)
    expect(groundResolution(origin.latitude, plan.zoom - 1, 512)).toBeGreaterThan(0.3)
  })

  it('covers the tile with a crop whose size matches the tile in metres', () => {
    const plan = tilePlan(origin, tile)
    const metresPerTile = groundResolution(origin.latitude, plan.zoom, 512) * 512
    expect(plan.crop.width * metresPerTile).toBeCloseTo(623.72, -1)
    expect(plan.crop.height * metresPerTile).toBeCloseTo(734.24, -1)
    // The crop starts inside the first tile and ends inside the last.
    const columns = new Set(plan.tiles.map((t) => t.x)).size
    const rows = new Set(plan.tiles.map((t) => t.y)).size
    expect(plan.crop.left).toBeGreaterThanOrEqual(0)
    expect(plan.crop.left).toBeLessThan(1)
    expect(plan.crop.left + plan.crop.width).toBeLessThanOrEqual(columns)
    expect(plan.crop.top + plan.crop.height).toBeLessThanOrEqual(rows)
    expect(plan.tiles.length).toBe(columns * rows)
    expect(plan.tiles.length).toBeLessThanOrEqual(42) // a handful of requests per site load
  })

  it('respects the zoom cap', () => {
    expect(tilePlan(origin, tile, { targetMetresPerPixel: 0.01, maxZoom: 18 }).zoom).toBe(18)
  })
})

describe('mapTilerTileUrl', () => {
  it('builds the documented satellite tile URL with an encoded key', () => {
    expect(mapTilerTileUrl(17, 69792, 38114, 'a b')).toBe('https://api.maptiler.com/tiles/satellite-v2/17/69792/38114.jpg?key=a%20b')
  })
})
