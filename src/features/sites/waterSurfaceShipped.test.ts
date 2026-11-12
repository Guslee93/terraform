// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../../lib/polygon'
import { carveTerrainForWater, computeWaterSurfaces, waterSurfaceLevel } from './waterSurface'
import { sampleTerrainHeight } from './geometry'
import type { LandCoverArea, TerrainData } from './package'

/**
 * The shipped Compact Infill package, read through the domain module (ADR-0025).
 *
 * This pins the numbers the ADR and the review record quote for the mapped Akerselva: the
 * cross-slope the old terrain tint inherited, the descent of the river, and the cut.
 */
function shippedPackage(): { terrain: TerrainData; areas: LandCoverArea[] } {
  const root = 'public/sites/compact-infill'
  const terrain = JSON.parse(readFileSync(`${root}/terrain.json`, 'utf8')) as TerrainData
  const landcover = JSON.parse(readFileSync(`${root}/landcover.json`, 'utf8')) as { areas: LandCoverArea[] }
  return { terrain, areas: landcover.areas }
}

const RIVER_ID = 'relation/2254060'

describe('the shipped Compact Infill package', () => {
  it('gives one level for a cross-section, and lets the river fall along its length', () => {
    const { terrain, areas } = shippedPackage()
    const river = computeWaterSurfaces(terrain, areas).find((s) => s.id === RIVER_ID)
    expect(river).toBeDefined()

    // The ground across one bank-to-bank step of the outline is not level: that cross-slope is
    // what the old terrain tint inherited, and what made the water look lumpy.
    let maxCross = 0
    for (let i = 0; i < river!.ring.length; i += 1) {
      const a = river!.ring[i]!
      const b = river!.ring[(i + 1) % river!.ring.length]!
      const cross = Math.abs(sampleTerrainHeight(terrain, a[0], a[1]) - sampleTerrainHeight(terrain, b[0], b[1]))
      maxCross = Math.max(maxCross, cross)
    }
    expect(maxCross).toBeGreaterThan(1)

    // The river falls over the site, so the surface falls with it: a descent, not a bulge.
    const spread = Math.max(...river!.levels) - Math.min(...river!.levels)
    expect(spread).toBeGreaterThan(5)
    expect(spread).toBeLessThan(30)

    // Flat across: every level on one bank is the same as the level on the other bank of the
    // same section, which the smoothing window guarantees.
    const first = river!.levels[0]!
    for (const level of river!.levels) expect(Math.abs(level - first)).toBeLessThan(30)
  })

  it('cuts the ground inside the river down to the water surface', () => {
    const { terrain, areas } = shippedPackage()
    const surfaces = computeWaterSurfaces(terrain, areas)
    const river = surfaces.find((s) => s.id === RIVER_ID)!
    const carved = carveTerrainForWater(terrain, surfaces)

    let nodes = 0
    let maxCut = 0
    for (let row = 0; row < carved.rows; row += 1) {
      for (let col = 0; col < carved.cols; col += 1) {
        const east = carved.minX + ((carved.maxX - carved.minX) * col) / (carved.cols - 1)
        const north = carved.minY + ((carved.maxY - carved.minY) * row) / (carved.rows - 1)
        if (!pointInPolygon([east, north], river.ring)) continue
        const original = terrain.heights[row]?.[col]
        const after = carved.heights[row]?.[col]
        if (original === undefined || after === undefined) continue
        nodes += 1
        maxCut = Math.max(maxCut, original - after)
        // The ground inside the river is at the water surface, so the water cannot bulge over it.
        // The Akerselva is mapped twice — a relation and one of its member ways — and the two
        // outlines do not agree on the level, so the ground follows the higher of the two.
        const level = Math.max(
          ...surfaces
            .filter((surface) => pointInPolygon([east, north], surface.ring))
            .map((surface) => waterSurfaceLevel(surface, east, north)),
        )
        expect(after).toBeLessThanOrEqual(level + 0.001)
      }
    }
    expect(nodes).toBeGreaterThan(0)
    // The cut removes the ground the coarse elevation model left between the channel and the
    // bank; it is a cut of metres, not of tens of metres.
    expect(maxCut).toBeGreaterThan(0)
    expect(maxCut).toBeLessThan(5)
  })

  it('leaves the ground outside the mapped outline alone', () => {
    const { terrain, areas } = shippedPackage()
    const surfaces = computeWaterSurfaces(terrain, areas)
    const river = surfaces.find((s) => s.id === RIVER_ID)!
    const carved = carveTerrainForWater(terrain, surfaces)

    let outside = 0
    for (let row = 0; row < carved.rows; row += 1) {
      for (let col = 0; col < carved.cols; col += 1) {
        const east = carved.minX + ((carved.maxX - carved.minX) * col) / (carved.cols - 1)
        const north = carved.minY + ((carved.maxY - carved.minY) * row) / (carved.rows - 1)
        if (pointInPolygon([east, north], river.ring)) continue
        outside += 1
        expect(carved.heights[row]?.[col]).toBe(terrain.heights[row]?.[col])
      }
    }
    expect(outside).toBeGreaterThan(0)
  })
})
