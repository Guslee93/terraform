import { describe, expect, it } from 'vitest'
import { SITES, getSite } from './siteCatalog'

describe('site catalogue', () => {
  it('ships exactly two curated demonstration sites', () => {
    expect(SITES).toHaveLength(2)
    expect(new Set(SITES.map((site) => site.id)).size).toBe(SITES.length)
  })

  it('marks both packages as curated demonstrations', () => {
    expect(SITES.every((site) => site.dataStatus === 'curated-demo')).toBe(true)
  })

  it('resolves a known site and rejects an unknown one', () => {
    expect(getSite('compact-infill')?.title).toBe('Compact Infill')
    expect(getSite('not-a-site')).toBeUndefined()
    expect(getSite(undefined)).toBeUndefined()
  })

  it('points every card at a hosted thumbnail', () => {
    for (const site of SITES) {
      expect(site.thumbnail).toMatch(/^\/sites\/[a-z-]+\.svg$/)
    }
  })
})
