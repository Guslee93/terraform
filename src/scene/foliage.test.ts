import { describe, expect, it } from 'vitest'
import { createBranchGeometry, createCanopyGeometry, FOLIAGE_VARIANTS } from './foliage'
import type { TreeShape } from './treeVariants'

const shapes: TreeShape[] = ['round', 'tall']

describe.each(shapes)('%s foliage', (shape) => {
  it.each([createCanopyGeometry, createBranchGeometry])('is repeatable for a seed and varies between seeds (%#)', (create) => {
    const first = create(shape, 42)
    const repeat = create(shape, 42)
    const other = create(shape, 43)
    try {
      expect(first.getAttribute('position').array).toEqual(repeat.getAttribute('position').array)
      expect(first.getAttribute('position').array).not.toEqual(other.getAttribute('position').array)
      if (first.hasAttribute('color')) {
        expect(first.getAttribute('color').array).toEqual(repeat.getAttribute('color').array)
      }
    } finally {
      first.dispose()
      repeat.dispose()
      other.dispose()
    }
  })

  it.each(Array.from({ length: FOLIAGE_VARIANTS }, (_, seed) => seed))('keeps variant %i within the geometry and colour budgets', (seed) => {
    const canopy = createCanopyGeometry(shape, seed)
    const branches = createBranchGeometry(shape, seed)
    try {
      const positions = canopy.getAttribute('position')
      const colors = canopy.getAttribute('color')
      const normals = canopy.getAttribute('normal')
      const radii = shape === 'round' ? [1, 0.8, 1] : [0.65, 1.45, 0.65]
      const padding = 0.55 * 1.18
      expect(canopy.index).toBeNull()
      expect(positions.count / 60).toBeGreaterThanOrEqual(18)
      expect(positions.count / 60).toBeLessThanOrEqual(28)
      expect(positions.count).toBeLessThan(2500)
      expect(colors).toBeDefined()
      expect(colors.itemSize).toBe(3)
      expect(colors.count).toBe(positions.count)
      expect(normals.count).toBe(positions.count)
      const distinctColors = new Set<string>()
      for (let index = 0; index < positions.count; index += 1) {
        let ellipsoidDistance = 0
        for (let axis = 0; axis < 3; axis += 1) {
          const extent = (radii[axis] ?? 0) + padding
          const component = positions.getComponent(index, axis)
          expect(Math.abs(component)).toBeLessThanOrEqual(extent + 1e-6)
          ellipsoidDistance += (component / extent) ** 2
          expect(colors.getComponent(index, axis)).toBeGreaterThanOrEqual(0)
          expect(colors.getComponent(index, axis)).toBeLessThanOrEqual(1)
          // Every triangle has one flat normal and one colour.
          const faceStart = index - index % 3
          expect(normals.getComponent(index, axis)).toBe(normals.getComponent(faceStart, axis))
          expect(colors.getComponent(index, axis)).toBe(colors.getComponent(faceStart, axis))
        }
        expect(ellipsoidDistance).toBeLessThanOrEqual(1 + 1e-6)
        distinctColors.add(`${colors.getX(index)},${colors.getY(index)},${colors.getZ(index)}`)
      }
      expect(distinctColors.size).toBeGreaterThanOrEqual(3)
      branches.computeBoundingBox()
      expect(branches.boundingBox?.min.y).toBeGreaterThanOrEqual(0)
      expect(branches.boundingBox?.max.y).toBeGreaterThanOrEqual(1)
      expect(branches.boundingBox?.max.y).toBeLessThanOrEqual(1.6)
      expect(branches.hasAttribute('color')).toBe(false)
      // A closed 5-sided cylinder has 60 vertices: trunk + two or three forks.
      expect([180, 240]).toContain(branches.getAttribute('position').count)
    } finally {
      canopy.dispose()
      branches.dispose()
    }
  })
})
