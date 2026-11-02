import { describe, expect, it } from 'vitest'
import { constraintsFromManifest } from '../analysis/constraints'
import { createRectangleFootprint, createScenario, createTier, createVolume } from '../massing/factories'
import type { Vec2 } from '../../lib/coordinates'
import { compareScenarios } from './compare'

const NOW = '2026-11-02T00:00:00.000Z'
// 40 × 50 m flat study area = 2 000 m²; limits 18 m height, 4 m setback, measured from grade (0 m).
const studyArea: Vec2[] = [[-20, -25], [20, -25], [20, 25], [-20, 25]]
const site = { studyArea, heightAt: () => 0, constraints: constraintsFromManifest({ maxHeightMeters: 18, setbackMeters: 4 }, 'grade') }

const block = (id: string, width: number, depth: number, storeys: number, visible = true) =>
  createVolume({ id, name: id, visible, tiers: [createTier({ id: `${id}-t`, footprint: createRectangleFootprint(width, depth), storeys, storeyHeight: 3 })] })

describe('compareScenarios', () => {
  it('QA-12: rows and B − A deltas match the hand calculation', () => {
    // A: 20 × 10 × 3 storeys of 3 m → footprint 200, GFA 600, volume 1 800, 9 m, coverage 10 %.
    const a = createScenario({ id: 'a', siteId: 's', now: NOW, notes: 'Low', volumes: [block('A1', 20, 10, 3)] })
    // B: 20 × 10 × 7 storeys → GFA 1 400, volume 4 200, 21 m (over the 18 m limit). The hidden
    // second block is ignored, like every other studio figure.
    const b = createScenario({ id: 'b', siteId: 's', name: 'Concept B', now: NOW, notes: 'Tall', volumes: [block('B1', 20, 10, 7), block('B2', 10, 10, 2, false)] })
    const comparison = compareScenarios(a, b, site)
    expect(comparison.rows.map((row) => [row.key, row.a, row.b, row.delta])).toEqual([
      ['gfa', 600, 1400, 800],
      ['footprint', 200, 200, 0],
      ['coverage', 10, 10, 0],
      ['tallest', 9, 21, 12],
      ['volume', 1800, 4200, 2400],
      ['buildings', 1, 1, 0],
    ])
    expect(comparison.rows.find((row) => row.key === 'tallest')?.label).toBe('Tallest above grade')
    expect(comparison.envelope).toEqual({ a: 'within', b: 'exceeds' })
    expect(comparison.notes).toEqual({ a: 'Low', b: 'Tall' })
  })

  it('compares two empty scenarios as zeros', () => {
    const empty = createScenario({ id: 'e', siteId: 's', now: NOW })
    expect(compareScenarios(empty, empty, site).rows.every((row) => row.a === 0 && row.b === 0 && row.delta === 0)).toBe(true)
  })
})
