import { describe, expect, it } from 'vitest'
import { dissolveAmount, dissolveRange, MAX_FADE_WIDTH_M, MIN_FADE_WIDTH_M, SITE_MARGIN_M, type DissolveParams } from './dissolve'

const COMPACT = {
  studyArea: [[-95, -120], [95, -120], [95, 120], [-95, 120], [-95, -120]] as const,
  terrain: { minX: -311.86, maxX: 311.86, minY: -367.12, maxY: 367.12 },
}
const SLOPED = {
  studyArea: [[-115, -155], [115, -155], [115, 155], [-115, 155], [-115, -155]] as const,
  terrain: { minX: -325.94, maxX: 325.94, minY: -394.97, maxY: 394.97 },
}

function boundaryPoints(terrain: DissolveParams, step = 10): Array<[number, number]> {
  const points: Array<[number, number]> = []
  for (let x = terrain.minX; x <= terrain.maxX + 1e-6; x += step) {
    points.push([x, terrain.minY], [x, terrain.maxY])
  }
  for (let y = terrain.minY; y <= terrain.maxY + 1e-6; y += step) {
    points.push([terrain.minX, y], [terrain.maxX, y])
  }
  return points
}

function gridInside(bounds: { minX: number; maxX: number; minY: number; maxY: number }, step = 20): Array<[number, number]> {
  const points: Array<[number, number]> = []
  for (let x = bounds.minX; x <= bounds.maxX + 1e-6; x += step) {
    for (let y = bounds.minY; y <= bounds.maxY + 1e-6; y += step) points.push([x, y])
  }
  return points
}

describe('dissolveRange (TF-VIS-02A Run 8, edge-distance)', () => {
  it('computes a band no wider than the cap, for both curated sites', () => {
    for (const site of [COMPACT, SLOPED]) {
      const range = dissolveRange(site.studyArea, 100, site.terrain)
      expect(range.fadeWidth).toBeLessThanOrEqual(MAX_FADE_WIDTH_M)
      expect(range.fadeWidth).toBeGreaterThanOrEqual(MIN_FADE_WIDTH_M)
      expect(range).toEqual({ ...site.terrain, fadeWidth: range.fadeWidth })
    }
  })

  it('dissolves every tile-boundary point (all four edges)', () => {
    for (const site of [COMPACT, SLOPED]) {
      const range = dissolveRange(site.studyArea, 100, site.terrain)
      for (const [east, north] of boundaryPoints(range)) {
        expect(dissolveAmount(east, north, range)).toBeCloseTo(1, 5)
      }
    }
  })

  it('is fully crisp inside the study area + margin and the analysis circle + margin', () => {
    for (const site of [COMPACT, SLOPED]) {
      const range = dissolveRange(site.studyArea, 100, site.terrain)
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const [east, north] of site.studyArea) {
        minX = Math.min(minX, east); maxX = Math.max(maxX, east)
        minY = Math.min(minY, north); maxY = Math.max(maxY, north)
      }
      const crisp = { minX: minX - SITE_MARGIN_M, maxX: maxX + SITE_MARGIN_M, minY: minY - SITE_MARGIN_M, maxY: maxY + SITE_MARGIN_M }
      for (const [east, north] of gridInside(crisp)) {
        expect(dissolveAmount(east, north, range)).toBe(0)
      }
      // The analysis circle + margin (a circle of radius 140).
      for (let r = 0; r <= 140; r += 20) {
        for (let angle = 0; angle < 360; angle += 45) {
          const east = r * Math.cos((angle * Math.PI) / 180)
          const north = r * Math.sin((angle * Math.PI) / 180)
          expect(dissolveAmount(east, north, range)).toBe(0)
        }
      }
    }
  })

  it('is monotonic from the centre toward the edge', () => {
    for (const site of [COMPACT, SLOPED]) {
      const range = dissolveRange(site.studyArea, 100, site.terrain)
      const centreX = (range.minX + range.maxX) / 2
      const centreY = (range.minY + range.maxY) / 2
      let previous = -1
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const east = centreX + (range.maxX - centreX) * t
        const amount = dissolveAmount(east, centreY, range)
        expect(amount).toBeGreaterThanOrEqual(previous)
        previous = amount
      }
      expect(dissolveAmount(centreX, centreY, range)).toBe(0)
    }
  })

  it('returns 1 outside the tile and 0 at the centre', () => {
    const range = dissolveRange(COMPACT.studyArea, 100, COMPACT.terrain)
    expect(dissolveAmount(1000, 1000, range)).toBe(1)
    expect(dissolveAmount(0, 0, range)).toBe(0)
  })
})
