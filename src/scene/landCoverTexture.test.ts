import { describe, expect, it } from 'vitest'
import type { TerrainData } from '../features/sites/package'
import { planToPixel } from './landCoverTexture'

const TERRAIN: TerrainData = {
  schemaVersion: 1,
  siteId: 'fixture',
  cols: 2,
  rows: 2,
  minX: -100,
  maxX: 100,
  minY: -50,
  maxY: 50,
  originElevation: 0,
  heights: [
    [0, 0],
    [0, 0],
  ],
  source: 'fixture',
}

describe('planToPixel', () => {
  it('puts north-west at the top-left and south-east at the bottom-right of the canvas', () => {
    expect(planToPixel(TERRAIN, 1024, -100, 50)).toEqual([0, 0])
    expect(planToPixel(TERRAIN, 1024, 100, -50)).toEqual([1024, 1024])
  })

  it('maps the terrain centre to the canvas centre', () => {
    expect(planToPixel(TERRAIN, 512, 0, 0)).toEqual([256, 256])
  })
})
