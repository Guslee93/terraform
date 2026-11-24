import { describe, expect, it } from 'vitest'
import { sentinelRequest, webMercator } from './sentinelGround'

describe('webMercator', () => {
  it('matches EPSG:3857 at known points', () => {
    const [x0, y0] = webMercator(0, 0)
    expect(x0).toBeCloseTo(0, 6)
    expect(y0).toBeCloseTo(0, 6)
    const [x, y] = webMercator(59.9235, 10.758)
    expect(x).toBeCloseTo(1197575.1, 0)
    expect(y).toBeCloseTo(8382725.7, 0)
  })
})

describe('sentinelRequest', () => {
  const origin = { latitude: 59.9235, longitude: 10.758 }
  const tile = { minX: -311.86, maxX: 311.86, minY: -367.12, maxY: 367.12 }

  it('asks for the north-up Web Mercator box of the ENU tile (compact-infill)', () => {
    const { url, width, height } = sentinelRequest(origin, tile)
    const params = new URL(url).searchParams
    expect(params.get('crs')).toBe('EPSG:3857')
    expect(params.get('layers')).toBe('sentinel2')
    const [minX, minY, maxX, maxY] = params.get('bbox')!.split(',').map(Number)
    // Independently computed for this tile (ellipsoidal ENU → WGS84 → 3857), within 2 m.
    expect(minX).toBeCloseTo(1196954.4, -1)
    expect(maxX).toBeCloseTo(1198195.8, -1)
    expect(minY).toBeCloseTo(8381993.8, -1)
    expect(maxY).toBeCloseTo(8383457.6, -1)
    // Centred on the origin.
    const [cx, cy] = webMercator(origin.latitude, origin.longitude)
    expect((minX! + maxX!) / 2).toBeCloseTo(cx, 0)
    expect((minY! + maxY!) / 2).toBeCloseTo(cy, -1)
    // 5 m per pixel by default.
    expect(width).toBe(125)
    expect(height).toBe(147)
    expect(params.get('width')).toBe('125')
  })

  it('keeps the tile aspect in the requested image', () => {
    const { url, width, height } = sentinelRequest(origin, tile, 10)
    const [minX, minY, maxX, maxY] = new URL(url).searchParams.get('bbox')!.split(',').map(Number)
    expect((maxX! - minX!) / (maxY! - minY!)).toBeCloseTo(width / height, 1)
  })
})
