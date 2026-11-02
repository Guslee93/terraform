import { describe, expect, it } from 'vitest'
import { createRectangleFootprint, createTier, createVolume } from '../../features/massing/factories'
import { massSummary } from './massSummary'

const site = { studyArea: [[-50, -50], [50, -50], [50, 50], [-50, 50]] as [number, number][], heightAt: () => -1, constraints: null }

describe('massSummary', () => {
  it('measures the top tier above the reference and counts floor levels, not tier storeys', () => {
    // Two 3-storey tiers side by side at the same base: 3 floor levels, not 6.
    const volume = createVolume({ tiers: [
      createTier({ footprint: createRectangleFootprint(10, 10, [0, 0]), storeys: 3, storeyHeight: 3 }),
      createTier({ footprint: createRectangleFootprint(10, 10, [12, 0]), storeys: 3, storeyHeight: 3 }),
    ] })
    expect(massSummary(volume, site, 'grade')).toEqual({ heightM: 10, floors: 3 })
    expect(massSummary(volume, site, 'datum')).toEqual({ heightM: 9, floors: 3 })
  })

  it('includes upper tiers', () => {
    const volume = createVolume({ tiers: [
      createTier({ footprint: createRectangleFootprint(20, 10), storeys: 3, storeyHeight: 3.2 }),
      createTier({ footprint: createRectangleFootprint(10, 8), storeys: 2, storeyHeight: 3.2, baseElevation: 9.6 }),
    ] })
    expect(massSummary(volume, site, 'datum')).toEqual({ heightM: 16, floors: 5 })
  })
})
