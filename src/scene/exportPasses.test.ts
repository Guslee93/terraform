import { describe, expect, it } from 'vitest'
import { exportPixelRatio, passFileName, pickVideoType } from './exportPasses'

describe('exportPixelRatio', () => {
  it('makes the canvas 3840 px wide', () => {
    expect(exportPixelRatio(1060, 700, 16384) * 1060).toBeCloseTo(3840)
  })
  it('caps both sides at the GPU texture limit', () => {
    expect(exportPixelRatio(1000, 1000, 2048)).toBeCloseTo(2.048)
    expect(exportPixelRatio(500, 2000, 4096)).toBeCloseTo(2.048)
  })
  it('falls back to 1 for an empty canvas', () => {
    expect(exportPixelRatio(0, 500, 4096)).toBe(1)
  })
})

describe('passFileName', () => {
  it('names files by site and pass', () => {
    expect(passFileName('compact-infill', 'depth')).toBe('terraform-compact-infill-depth.png')
    expect(passFileName('Import/MW8 jw', 'clip', 'webm')).toBe('terraform-import-mw8-jw-clip.webm')
  })
})

describe('pickVideoType', () => {
  it('prefers VP9 WebM, then WebM, then MP4', () => {
    expect(pickVideoType(() => true)?.mime).toBe('video/webm;codecs=vp9')
    expect(pickVideoType((t) => t === 'video/webm')?.extension).toBe('webm')
    expect(pickVideoType((t) => t === 'video/mp4')?.extension).toBe('mp4')
    expect(pickVideoType(() => false)).toBeNull()
  })
})
