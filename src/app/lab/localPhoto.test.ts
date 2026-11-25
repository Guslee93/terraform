import { describe, expect, it } from 'vitest'
import { DEFAULT_ALIGNMENT, findLocalPhoto, greyPixels, loadAlignment, photoRect, photoTextureTransform, saveAlignment } from './localPhoto'

const terrain = { minX: -320, maxX: 320, minY: -376, maxY: 376 }

describe('photoTextureTransform', () => {
  it('maps a photo that covers exactly the terrain to the identity transform', () => {
    const t = photoTextureTransform(terrain, terrain)
    expect(t.repeat[0]).toBeCloseTo(1)
    expect(t.repeat[1]).toBeCloseTo(1)
    expect(t.offset[0]).toBeCloseTo(0)
    expect(t.offset[1]).toBeCloseTo(0)
  })

  it('puts a given ground point on the matching photo pixel', () => {
    const rect = { minX: -400, maxX: 500, minY: -300, maxY: 450 }
    const { repeat, offset } = photoTextureTransform(terrain, rect)
    for (const [x, y] of [[0, 0], [100, -200], [-319, 375]] as const) {
      const u = (x - terrain.minX) / (terrain.maxX - terrain.minX)
      const v = (y - terrain.minY) / (terrain.maxY - terrain.minY)
      // three applies uv · repeat + offset.
      expect(u * repeat[0] + offset[0]).toBeCloseTo((x - rect.minX) / (rect.maxX - rect.minX))
      expect(v * repeat[1] + offset[1]).toBeCloseTo((y - rect.minY) / (rect.maxY - rect.minY))
    }
  })
})

describe('photoRect', () => {
  it('centres the photo on the offset and keeps the image aspect', () => {
    const rect = photoRect({ ...DEFAULT_ALIGNMENT(640), offsetE: 10, offsetN: -20, widthM: 800 }, 2)
    expect(rect).toEqual({ minX: -390, maxX: 410, minY: -220, maxY: 180 })
  })
})

describe('greyPixels', () => {
  it('keeps the chosen share of colour around the luminance and scales brightness', () => {
    const data = new Uint8ClampedArray([200, 100, 50, 255])
    greyPixels(data, 0.2, 1)
    const y = 0.2126 * 200 + 0.7152 * 100 + 0.0722 * 50
    expect(data[0]).toBe(Math.round(y + 0.2 * (200 - y)))
    expect(data[3]).toBe(255) // alpha untouched
    const grey = new Uint8ClampedArray([200, 100, 50, 255])
    greyPixels(grey, 0, 1)
    expect(grey[0]).toBe(grey[1])
    expect(grey[1]).toBe(grey[2])
  })
})

describe('findLocalPhoto', () => {
  const respond = (type: string, ok = true) => Promise.resolve(new Response(null, { status: ok ? 200 : 404, headers: { 'content-type': type } }))

  it('ignores the dev server’s HTML fallback and finds the first image', async () => {
    const calls: string[] = []
    const fake = ((url: string) => { calls.push(url); return url.endsWith('.jpg') ? respond('image/jpeg') : respond('text/html') }) as unknown as typeof fetch
    expect(await findLocalPhoto('compact-infill', fake)).toBe('/local-ortho/compact-infill.jpg')
    expect(calls[0]).toBe('/local-ortho/compact-infill.png')
  })

  it('returns null when no image exists', async () => {
    const fake = (() => respond('text/html')) as unknown as typeof fetch
    expect(await findLocalPhoto('sloped-edge', fake)).toBeNull()
  })
})

describe('alignment storage', () => {
  it('round-trips and rejects malformed data', () => {
    const value = { ...DEFAULT_ALIGNMENT(640), offsetE: 12.5 }
    saveAlignment('compact-infill', value)
    expect(loadAlignment('compact-infill')).toEqual(value)
    window.localStorage.setItem('terraform.lab.localPhoto.compact-infill', '{"offsetE":"x"}')
    expect(loadAlignment('compact-infill')).toBeNull()
  })
})
