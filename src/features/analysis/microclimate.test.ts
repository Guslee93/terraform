import { describe, expect, it } from 'vitest'
import compactBuildings from '../../../public/sites/compact-infill/buildings.json'
import compactRoads from '../../../public/sites/compact-infill/roads.json'
import compactStudyArea from '../../../public/sites/compact-infill/study-area.json'
import type { Vec2 } from '../../lib/coordinates'
import { normalizeRing } from '../../lib/polygon'
import { parseBuildings, parseRoads, parseStudyArea } from '../sites/package'
import { sampleGrid } from './grid'
import { computeNoise, noiseAt, noiseBand, SCREEN_LOSS_DB } from './noise'

const road = (highway: string, centreline: Vec2[]) => ({ highway, centreline })
// Primary road along the x-axis: 70 dB at 10 m by table.
const primary = road('primary', [
  [-1000, 0],
  [1000, 0],
])
const block = (x0: number, x1: number, y0: number, y1: number, height: number) => ({
  height,
  footprint: [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ] as Vec2[],
})

describe('sampleGrid', () => {
  it('returns cell centres inside the polygon', () => {
    const cells = sampleGrid(
      [
        [0, 0],
        [20, 0],
        [20, 20],
        [0, 20],
      ],
      10,
    )
    expect(cells).toEqual([
      { x: 5, y: 5 },
      { x: 15, y: 5 },
      { x: 5, y: 15 },
      { x: 15, y: 15 },
    ])
  })
})

describe('noise (hand-computed)', () => {
  it('equals the table level at the 10 m reference distance', () => {
    expect(noiseAt(0, 10, [primary], [])).toBeCloseTo(70, 6)
  })
  it('drops 10·log10(2) ≈ 3.01 dB per doubling of distance', () => {
    expect(noiseAt(0, 20, [primary], [])).toBeCloseTo(70 - 3.0103, 3)
  })
  it('adds 3.01 dB for two identical sources at the same distance', () => {
    const mirror = road('primary', [
      [-1000, 20],
      [1000, 20],
    ])
    expect(noiseAt(0, 10, [primary, mirror], [])).toBeCloseTo(70 + 3.0103, 3)
  })
  it('counts a street split into several ways once, as if it were one way', () => {
    const tertiary = (points: Vec2[]) => road('tertiary', points)
    const whole = noiseAt(0, 10, [tertiary([[-200, 0], [200, 0]])], [])
    const halves = noiseAt(0, 10, [tertiary([[-200, 0], [0, 0]]), tertiary([[0, 0], [200, 0]])], [])
    const quarters = noiseAt(0, 10, [tertiary([[-200, 0], [-100, 0]]), tertiary([[100, 0], [0, 0]]), tertiary([[-100, 0], [0, 0]]), tertiary([[100, 0], [200, 0]])], [])
    expect(whole).toBeCloseTo(62, 6)
    expect(halves).toBeCloseTo(62, 6)
    expect(quarters).toBeCloseTo(62, 6)
  })
  it('keeps a side street meeting at a junction as its own source', () => {
    const main = [road('tertiary', [[-200, 0], [0, 0]]), road('tertiary', [[0, 0], [200, 0]])]
    const side = road('tertiary', [[0, 0], [0, 200]])
    expect(noiseAt(10, 10, [...main, side], [])).toBeCloseTo(62 + 3.0103, 3)
  })
  it('subtracts the screening loss when a building is on the line to the road', () => {
    const wall = block(-5, 5, 4, 6, 12)
    expect(noiseAt(0, 10, [primary], [wall])).toBeCloseTo(70 - SCREEN_LOSS_DB, 6)
  })
  it('ignores low sheds and silent road classes', () => {
    expect(noiseAt(0, 10, [primary], [block(-5, 5, 4, 6, 2)])).toBeCloseTo(70, 6)
    expect(noiseAt(0, 10, [road('footway', [[-9, 0], [9, 0]])], [])).toBeNull()
  })
  it('gives no value inside buildings and bands the rest', () => {
    const area: Vec2[] = [[0, 0], [20, 0], [20, 20], [0, 20]]
    const cells = computeNoise(area, [primary], [block(0, 10, 0, 10, 10)])
    expect(cells.find((c) => c.x === 5 && c.y === 5)?.db).toBeNull()
    expect(cells.find((c) => c.x === 15 && c.y === 15)?.band).toBe('very-loud')
    expect(noiseBand(44.9)).toBe('quiet')
    expect(noiseBand(75)).toBe('extreme')
  })
})

// ADR-0023: the context block carries 520 buildings and 627 road pieces. Screening every cell
// against every building cost seconds per edit; the building index keeps the studio responsive.
describe('noise on the shipped site', () => {
  it('screens the study area within a usable budget', () => {
    const buildings = parseBuildings(compactBuildings).buildings.map((building) => ({
      height: building.height,
      footprint: building.footprint,
    }))
    const roads = parseRoads(compactRoads).roads
    const area = normalizeRing(parseStudyArea(compactStudyArea).polygon)
    const start = performance.now()
    const cells = computeNoise(area, roads, buildings, 10)
    const elapsed = performance.now() - start
    console.info(
      `[noise] ${elapsed.toFixed(1)} ms · ${cells.length} cells · ${buildings.length} buildings · ${roads.length} road pieces`,
    )
    expect(cells.length).toBeGreaterThan(0)
    expect(cells.some((cell) => cell.db !== null)).toBe(true)
    // The studio recomputes this on the main thread whenever a mass changes. Measured: 145 ms on an
    // idle machine, 258 ms under a full parallel test run; the pre-index screening took 1021 ms for
    // the same pass, so the budget catches a return to the linear scan.
    expect(elapsed).toBeLessThan(600)
  })
})
