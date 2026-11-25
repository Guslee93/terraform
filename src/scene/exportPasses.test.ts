import { describe, expect, it } from 'vitest'
import { creditLayout, drawCredits, exportPixelRatio, passFileName, pickVideoType, type CreditContext } from './exportPasses'

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

describe('credits burned into exports (ADR-0032)', () => {
  const lines = ['© OpenStreetMap contributors · OpenStreetMap site extract · ODbL 1.0', '© Kartverket · Kartverket DTM1 elevation · CC BY 4.0']
  it('lays one row per line in a band along the bottom edge', () => {
    const layout = creditLayout(lines, 3840, 2160)!
    expect(layout.fontPx).toBe(24)
    expect(layout.rows.map((row) => row.text)).toEqual(lines)
    expect(layout.band.y + layout.band.height).toBe(2160)
    expect(layout.rows[0]!.y).toBeGreaterThan(layout.band.y)
    expect(layout.rows[1]!.y + layout.fontPx).toBeLessThan(2160)
  })
  it('wraps a line that is too long for a narrow image, losing no word', () => {
    const layout = creditLayout([lines[0]!], 400, 300)!
    expect(layout.rows.length).toBeGreaterThan(1)
    expect(layout.rows.map((row) => row.text).join(' ')).toBe(lines[0])
  })
  it('draws nothing without lines', () => {
    expect(creditLayout([], 3840, 2160)).toBeNull()
  })
  it('burns every line into the image over a backing band', () => {
    const calls: string[] = []
    const ctx: CreditContext = {
      fillStyle: '', font: '', textBaseline: 'alphabetic',
      fillRect: (x, y, w, h) => { calls.push(`rect ${x} ${y} ${w} ${h}`) },
      fillText: (text) => { calls.push(`text ${text}`) },
    }
    expect(drawCredits(ctx, lines, 3840, 2160)).toBe(true)
    const layout = creditLayout(lines, 3840, 2160)!
    expect(calls).toEqual([`rect 0 ${layout.band.y} 3840 ${layout.band.height}`, ...lines.map((line) => `text ${line}`)])
    expect(ctx.font).toContain('24px')
    expect(drawCredits(ctx, [], 3840, 2160)).toBe(false)
  })
})
