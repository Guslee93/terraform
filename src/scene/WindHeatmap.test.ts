import { expect, it } from 'vitest'
import { heatmapGeometry } from './WindHeatmap'

it('triangulates neighbours, drapes ENU centres, and leaves missing samples open', () => {
  const cells = [{ x: 0, y: 0, colour: '#FFFFFF' }, { x: 4, y: 0, colour: '#000000' }, { x: 0, y: 4, colour: '#FFFFFF' }, { x: 4, y: 4, colour: '#000000' }]
  const geometry = heatmapGeometry({ cellM: 4, cells }, (x, y) => x + y)
  expect(geometry.index?.count).toBe(6)
  expect(geometry.getAttribute('position').getY(3)).toBe(8.5)
  expect(geometry.getAttribute('position').getZ(3)).toBe(-4)
  expect(geometry.getAttribute('color').getX(0)).toBe(1)
  expect(heatmapGeometry({ cellM: 4, cells: cells.filter((_, i) => i !== 1) }, () => 0).index?.count).toBe(0)
  geometry.dispose()
})
