import { describe, expect, it } from 'vitest'
import { footprintTester } from '../features/analysis/grid'
import { heatmapGeometry } from './WindHeatmap'

const cell = (x: number, y: number, colour = '#FFFFFF') => ({ x, y, colour })
const square = [cell(0, 0), cell(4, 0, '#000000'), cell(0, 4), cell(4, 4, '#000000')]
const quads = (geometry: ReturnType<typeof heatmapGeometry>) => (geometry.index?.count ?? 0) / 6

describe('ground heatmap surface', () => {
  it('covers each sample\'s whole cell, draped, with corner colours averaged between cells', () => {
    const geometry = heatmapGeometry({ cellM: 4, cells: square }, (x, y) => x + y)
    const position = geometry.getAttribute('position')
    const colour = geometry.getAttribute('color')
    expect(quads(geometry)).toBe(4)
    expect(position.count).toBe(9) // a 3 × 3 corner lattice, shared between the four cells
    // First corner: south-west of the first cell, half a cell out, on the terrain plus the 0.5 m lift.
    expect([position.getX(0), position.getY(0), position.getZ(0)]).toEqual([-2, -3.5, 2])
    // The corner shared by all four cells is the mean of two white and two black cells.
    const centre = Array.from({ length: position.count }, (_, index) => index).find((index) => position.getX(index) === 2 && position.getZ(index) === -2)
    expect(colour.getX(centre ?? -1)).toBeCloseTo(0.5)
    geometry.dispose()
  })

  it('leaves a missing sample open unless filling is allowed there', () => {
    const three = square.filter((_, index) => index !== 1)
    expect(quads(heatmapGeometry({ cellM: 4, cells: three }, () => 0))).toBe(3)
    expect(quads(heatmapGeometry({ cellM: 4, cells: three }, () => 0, { rings: 1, allow: () => false }))).toBe(3)
    // Allowed only at the missing sample: the hole closes and nothing grows outward.
    const filled = heatmapGeometry({ cellM: 4, cells: three }, () => 0, { rings: 1, allow: (x, y) => x === 4 && y === 0 })
    expect(quads(filled)).toBe(4)
  })

  it('fills only as many rings as asked, from measured neighbours', () => {
    const row = [cell(0, 0, '#000000')]
    expect(quads(heatmapGeometry({ cellM: 4, cells: row }, () => 0, { rings: 1, allow: () => true }))).toBe(9)
    const two = heatmapGeometry({ cellM: 4, cells: row }, () => 0, { rings: 2, allow: () => true })
    expect(quads(two)).toBe(25)
    const colour = two.getAttribute('color')
    for (let index = 0; index < colour.count; index += 1) expect(colour.getX(index)).toBe(0)
  })

  it('reaches a building wall: cells inside the footprint next to measured ground are filled', () => {
    const building = { height: 10, footprint: [[6, -6], [18, -6], [18, 6], [6, 6]] as [number, number][] }
    const ground = [cell(0, -4), cell(0, 0), cell(0, 4), cell(4, -4), cell(4, 0), cell(4, 4)]
    const open = heatmapGeometry({ cellM: 4, cells: ground }, () => 0)
    const closed = heatmapGeometry({ cellM: 4, cells: ground }, () => 0, { rings: 1, allow: footprintTester([building]) })
    const maxEast = (geometry: typeof open) => Math.max(...Array.from({ length: geometry.getAttribute('position').count }, (_, index) => geometry.getAttribute('position').getX(index)))
    expect(maxEast(open)).toBe(6) // stops at the last open cell\'s edge
    expect(maxEast(closed)).toBe(10) // one ring under the footprint; the wall at x = 6 hides the rest
    expect(quads(closed)).toBe(quads(open) + 3) // only the three cells inside the footprint were added
  })

  it('returns an empty surface for no samples', () => {
    expect(heatmapGeometry({ cellM: 4, cells: [] }, () => 0).getAttribute('position').count).toBe(0)
  })
})
