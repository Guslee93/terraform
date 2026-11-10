import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { decodeFloatTiff, sampleSurface } from './surface'

const fixture = () => {
  const bytes = readFileSync(resolve(__dirname, '__fixtures__/kartverket-dom-48.tif'))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

/** A big-endian, single-strip float TIFF, to cover the layout the fixture does not. */
function stripTiff(width: number, height: number, values: readonly number[]): ArrayBuffer {
  const entries: [tag: number, type: number, value: number][] = [
    [256, 3, width], [257, 3, height], [258, 3, 32], [259, 3, 1], [273, 4, 8 + 2 + 8 * 12 + 4], [277, 3, 1], [278, 3, height], [339, 3, 3],
  ]
  const buffer = new ArrayBuffer(8 + 2 + entries.length * 12 + 4 + values.length * 4)
  const view = new DataView(buffer)
  view.setUint16(0, 0x4d4d)
  view.setUint16(2, 42)
  view.setUint32(4, 8)
  view.setUint16(8, entries.length)
  entries.forEach(([tag, type, value], index) => {
    const at = 10 + index * 12
    view.setUint16(at, tag)
    view.setUint16(at + 2, type)
    view.setUint32(at + 4, 1)
    if (type === 3) view.setUint16(at + 8, value)
    else view.setUint32(at + 8, value)
  })
  values.forEach((value, index) => view.setFloat32(8 + 2 + entries.length * 12 + 4 + index * 4, value))
  return buffer
}

describe('surface raster', () => {
  it('reads the recorded Kartverket DOM tile: 48 × 48 heights over a Grünerløkka block', () => {
    const raster = decodeFloatTiff(fixture())
    expect(raster.width).toBe(48)
    expect(raster.height).toBe(48)
    const values = Array.from(raster.heights)
    expect(values.every(Number.isFinite)).toBe(true)
    // Street level here is about 17–20 m (NN2000); the block's roofs reach the low 30s.
    expect(Math.min(...values)).toBeGreaterThan(10)
    expect(Math.max(...values)).toBeGreaterThan(28)
    expect(Math.max(...values)).toBeLessThan(60)
  })

  it('reads strips in either byte order and blanks no-data sentinels', () => {
    const raster = decodeFloatTiff(stripTiff(2, 2, [1, 2, -3.4e38, 4]))
    expect(Array.from(raster.heights)).toEqual([1, 2, Number.NaN, 4])
  })

  it('refuses what it cannot read instead of guessing', () => {
    expect(() => decodeFloatTiff(new ArrayBuffer(4))).toThrow(/too short/)
    expect(() => decodeFloatTiff(new TextEncoder().encode('<ServiceException/>  ').buffer as ArrayBuffer)).toThrow(/not a TIFF/)
    const compressed = stripTiff(1, 1, [5])
    new DataView(compressed).setUint16(10 + 3 * 12 + 8, 5)
    expect(() => decodeFloatTiff(compressed)).toThrow(/compressed/)
  })

  it('samples by local ENU position: north-west is the first pixel, outside is null', () => {
    const raster = decodeFloatTiff(stripTiff(2, 2, [1, 2, -3.4e38, 4]))
    expect(sampleSurface(raster, 100, -25, 25)).toBe(1)
    expect(sampleSurface(raster, 100, 25, 25)).toBe(2)
    expect(sampleSurface(raster, 100, 25, -25)).toBe(4)
    expect(sampleSurface(raster, 100, -25, -25)).toBeNull()
    expect(sampleSurface(raster, 100, 60, 0)).toBeNull()
  })
})
