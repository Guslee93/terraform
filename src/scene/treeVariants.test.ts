import { describe, expect, it } from 'vitest'
import { FOLIAGE_VARIANTS } from './foliage'
import { TREE_TINTS, treeVariant } from './treeVariants'

describe('treeVariant', () => {
  it('is deterministic for a position, so reloads and screenshots match', () => {
    expect(treeVariant(12.34, -56.78)).toEqual(treeVariant(12.34, -56.78))
  })

  it('stays inside the illustrative ranges', () => {
    for (let index = 0; index < 500; index += 1) {
      const variant = treeVariant(index * 3.7 - 400, index * -2.9 + 120)
      expect(variant.scale).toBeGreaterThanOrEqual(0.75)
      expect(variant.scale).toBeLessThan(1.35)
      expect(variant.tint).toBeGreaterThanOrEqual(0)
      expect(variant.tint).toBeLessThan(TREE_TINTS.length)
      expect(Number.isInteger(variant.variant)).toBe(true)
      expect(variant.variant).toBeGreaterThanOrEqual(0)
      expect(variant.variant).toBeLessThan(FOLIAGE_VARIANTS)
      expect(['round', 'tall']).toContain(variant.shape)
      expect(variant.rotation).toBeGreaterThanOrEqual(0)
      expect(variant.rotation).toBeLessThan(Math.PI * 2)
    }
  })

  it('actually varies across a row of street trees', () => {
    const row = Array.from({ length: 40 }, (_, index) => treeVariant(index * 8, 0))
    expect(new Set(row.map((variant) => variant.tint)).size).toBeGreaterThan(2)
    expect(new Set(row.map((variant) => variant.shape)).size).toBe(2)
    expect(new Set(row.map((variant) => variant.variant)).size).toBe(FOLIAGE_VARIANTS)
    expect(Math.max(...row.map((v) => v.scale)) - Math.min(...row.map((v) => v.scale))).toBeGreaterThan(0.3)
  })
})
