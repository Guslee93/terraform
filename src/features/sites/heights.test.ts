import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { measureHeights, measuredCount, mergeHeights, parseHeights } from './heights'
import { parseSiteManifest } from './manifest'
import { parseBuildings, type ContextBuilding } from './package'
import { hasMeasuredHeights, siteLayers } from './provenance'

const square: Vec2[] = [[0, 0], [20, 0], [20, 12], [0, 12]]
const building = (id: string, height = 9): ContextBuilding => ({ id, kind: 'other', height, baseElevation: 1, area: 240, withinStudyArea: true, footprint: square })
const gable = { shape: 'gabled', ridge: [[0, 6], [20, 6]], ridgeHeight: 12, pitchDeg: 30 }
const file = (buildings: unknown[]) => ({ schemaVersion: 1, siteId: 'demo', buildings })

describe('parseHeights', () => {
  it('reads flat, gabled, complex and unmeasured entries', () => {
    const parsed = parseHeights(file([{ id: 'a', kind: 'flat', height: 10 }, { id: 'b', kind: 'gabled', height: 10.3, roof: gable }, { id: 'c', kind: 'complex', height: 14 }, { id: 'd', kind: 'unmeasured' }]))
    expect(parsed.buildings.map((entry) => entry.kind)).toEqual(['flat', 'gabled', 'complex', 'unmeasured'])
    expect(parsed.buildings[3]).toEqual({ id: 'd', kind: 'unmeasured' })
  })
  it('rejects an unknown kind, a height outside 0–200 m, a gable without its roof and a duplicate id', () => {
    expect(() => parseHeights(file([{ id: 'a', kind: 'hipped', height: 10 }]))).toThrow(/kind/)
    expect(() => parseHeights(file([{ id: 'a', kind: 'flat', height: 0 }]))).toThrow(/height/)
    expect(() => parseHeights(file([{ id: 'a', kind: 'flat', height: 250 }]))).toThrow(/height/)
    expect(() => parseHeights(file([{ id: 'a', kind: 'gabled', height: 10 }]))).toThrow(/roof/)
    expect(() => parseHeights(file([{ id: 'a', kind: 'flat', height: 10 }, { id: 'a', kind: 'flat', height: 11 }]))).toThrow(/twice/)
    expect(() => parseHeights({ schemaVersion: 2, siteId: 'demo', buildings: [] })).toThrow(/schema/)
  })
})

describe('mergeHeights', () => {
  const heights = parseHeights(file([{ id: 'a', kind: 'flat', height: 12.5 }, { id: 'b', kind: 'gabled', height: 10.3, roof: gable }, { id: 'c', kind: 'unmeasured' }]))
  const merged = mergeHeights([building('a'), building('b'), building('c'), building('new')], heights)
  it('replaces the estimate with the measured height and roof, and says which is which', () => {
    expect(merged.map((b) => [b.id, b.height, b.heightSource])).toEqual([['a', 12.5, 'measured'], ['b', 10.3, 'measured'], ['c', 9, 'estimated'], ['new', 9, 'estimated']])
    expect(merged[1]!.roof).toMatchObject({ shape: 'gabled', ridgeHeight: 12, pitchDeg: 30 })
    expect(merged[0]!.roof).toBeUndefined()
    expect(measuredCount(merged)).toBe(2)
  })
  it('leaves the footprint record as it was', () => {
    expect(merged[0]).toMatchObject({ id: 'a', footprint: square, baseElevation: 1, area: 240 })
  })
  it('rejects a roof that does not fit its footprint', () => {
    const bad = parseHeights(file([{ id: 'a', kind: 'gabled', height: 10, roof: { ...gable, ridgeHeight: 3 } }]))
    expect(() => mergeHeights([building('a')], bad)).toThrow(/eave below 2 m/)
  })
})

describe('measureHeights', () => {
  it('measures a flat roof above the building base, and leaves a building the surface does not show', () => {
    // Origin at 100 m, base 1 m above it: a surface at 111 m is a 10 m flat roof.
    const [flat, missing] = measureHeights(
      [{ id: 'flat', footprint: square, baseElevation: 1 }, { id: 'missing', footprint: square.map(([x, y]) => [x + 100, y] as Vec2), baseElevation: 1 }],
      (x) => (x < 50 ? 111 : 101.2),
      100,
    )
    expect(flat).toEqual({ id: 'flat', kind: 'flat', height: 10 })
    expect(missing).toEqual({ id: 'missing', kind: 'unmeasured' })
  })
})

describe('shipped heights (ADR-0033)', () => {
  const read = (site: string, name: string): unknown => JSON.parse(readFileSync(`public/sites/${site}/${name}`, 'utf8'))
  // Compact Infill: every building is seen. Sloped Edge: ten small buildings (12–104 m²) are not in
  // the surface model; the plan's 99 % was measured on Compact Infill only (ADR-0033).
  it.each([['compact-infill', 0.99], ['sloped-edge', 0.95]] as const)('%s: at least %f of the buildings are measured', (site, share) => {
    const manifest = parseSiteManifest(read(site, 'manifest.json'))
    expect(manifest.assetPaths.heights).toBe('heights.json')
    const buildings = parseBuildings(read(site, 'buildings.json')).buildings
    const heights = parseHeights(read(site, 'heights.json'))
    expect(heights.siteId).toBe(site)
    // Every entry belongs to a building of the package: the asset is keyed by OSM id.
    const ids = new Set(buildings.map((b) => b.id))
    expect(heights.buildings.every((entry) => ids.has(entry.id))).toBe(true)
    const merged = mergeHeights(buildings, heights)
    expect(measuredCount(merged) / merged.length).toBeGreaterThanOrEqual(share)
    // The footprint file still holds the storey estimates: heights are a separate CC BY 4.0 layer.
    expect(buildings.every((b) => b.roof === undefined)).toBe(true)
    expect(hasMeasuredHeights(manifest)).toBe(true)
    expect(siteLayers(manifest).layers.find((layer) => layer.id === 'heights')).toMatchObject({ owner: 'Kartverket', licence: 'CC BY 4.0', attribution: '© Kartverket' })
  })
})
