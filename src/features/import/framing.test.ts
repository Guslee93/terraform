import { describe, expect, it } from 'vitest'
import { frameAt, framePixels, frameReadout, frameSizeFromStudyArea } from './framing'

describe('framing', () => {
  it('sizes the frame from metres per pixel at latitude and zoom', () => {
    // Equator, z0: 40 075 016.686 m over 512 px.
    expect(framePixels(40075016.686, 0, 0)).toBeCloseTo(512, 6)
    // Each zoom level doubles the pixels; latitude 60° halves the metres per pixel.
    expect(framePixels(400, 60, 16)).toBeCloseTo(2 * framePixels(400, 60, 15), 6)
    expect(framePixels(400, 60, 15)).toBeCloseTo(2 * framePixels(400, 0, 15), 6)
  })

  it('formats area readouts', () => {
    expect(frameReadout(400)).toBe('400 × 400 m · 16 ha')
    expect(frameReadout(200)).toBe('200 × 200 m · 4 ha')
    expect(frameReadout(250)).toBe('250 × 250 m · 6.3 ha')
  })

  it('builds a validated frame, defaulting the title', () => {
    const result = frameAt(59.9239, 10.7579, 400, '  ', 36 ** 3)
    expect(result).toEqual({ frame: { latitude: 59.9239, longitude: 10.7579, sizeMetres: 400, id: 'import-1000', title: 'Custom area' } })
  })

  it('recovers the frame size from a study area, which is the frame inset 15 % on every side', () => {
    const studyArea: readonly (readonly [number, number])[] = [[-140, -140], [140, -140], [140, 140], [-140, 140], [-140, -140]]
    expect(frameSizeFromStudyArea(studyArea)).toBe(400)
    expect(frameSizeFromStudyArea([[-70, -70], [70, -70], [70, 70], [-70, 70]] as readonly (readonly [number, number])[])).toBe(200)
    // Not a frame size: no frame.
    expect(frameSizeFromStudyArea([[-123, -45], [10, -45], [10, 90]] as readonly (readonly [number, number])[])).toBeNull()
  })

  it('rejects centres outside import coverage', () => {
    expect(frameAt(48.85, 2.35, 400, 'Paris')).toHaveProperty('error')
  })
})
