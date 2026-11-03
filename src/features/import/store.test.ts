import { describe, expect, it } from 'vitest'
import { createMemoryImportedSiteStore, migrate } from './store'
import { importedFixture, curatedPackage } from './storeFixtures'
import { parseSitePackage } from '../sites/package'
import { createMemoryStore } from '../scenarios/store'
import { createScenarioRepository } from '../scenarios/repository'
import { createDefaultProject } from '../scenarios/project'
import { deleteImported } from './session'

describe('imported site storage', () => {
  it('round-trips validated packages, lists newest first and deletes', async () => {
    let now = '2026-11-03T12:00:00Z'
    const store = createMemoryImportedSiteStore([], () => now)
    const site = importedFixture()
    await store.put(site)
    now = '2026-11-04T12:00:00Z'
    await store.put(importedFixture('import-newer'))
    expect(await store.get(site.summary.id)).toEqual(site)
    expect(await store.list()).toMatchObject([{ id: 'import-newer', savedAt: now, buildingCount: site.sitePackage.buildings.buildings.length }, { id: site.summary.id }])
    await store.delete(site.summary.id)
    expect(await store.get(site.summary.id)).toBeUndefined()
  })
  it.each([
    '{',
    JSON.stringify({ ...importedFixture(), schemaVersion: 99 }),
    JSON.stringify({ ...importedFixture(), schemaVersion: 1, summary: { title: 'Bad' } }),
    JSON.stringify({ ...importedFixture(), schemaVersion: 1, sitePackage: {} }),
    JSON.stringify({ ...importedFixture(), schemaVersion: 1, warnings: [{}] }),
  ])('reports unreadable rows without throwing (%#)', async (json) => {
    const store = createMemoryImportedSiteStore([{ id: 'import-test', savedAt: '2026-11-03T12:00:00Z', json }])
    expect(await store.get('import-test')).toEqual({ id: 'import-test', status: 'unreadable' })
    expect(await store.list()).toEqual([{ id: 'import-test', status: 'unreadable' }])
  })
  it('rejects unknown versions clearly', () => {
    expect(() => migrate({ schemaVersion: 2 })).toThrow('Unsupported imported site schema version: 2')
  })
  it('leaves no imported site, project or scenarios after deletion', async () => {
    const imports = createMemoryImportedSiteStore()
    const rows = createMemoryStore()
    const scenarios = createScenarioRepository(rows, { now: () => '2026-11-03T12:00:00Z', appVersion: 'test' })
    const site = importedFixture()
    await imports.put(site)
    const defaults = createDefaultProject(site.summary.id, site.importedAt)
    await scenarios.saveProject(defaults.project)
    for (const scenario of defaults.scenarios) await scenarios.saveScenario(scenario)
    await deleteImported(site.summary.id, imports, scenarios)
    expect(await imports.list()).toEqual([])
    expect(await rows.getProject(site.summary.id)).toBeUndefined()
    expect(await rows.listScenarios(site.summary.id)).toEqual([])
  })
})

describe('parseSitePackage', () => {
  it('round-trips the curated fixture', () => {
    const pkg = curatedPackage()
    expect(parseSitePackage(JSON.parse(JSON.stringify(pkg)))).toEqual(pkg)
  })
  it.each(['terrain', 'buildings', 'studyArea', 'roads', 'trees', 'landcover', 'manifest'])('rejects broken %s', (key) => {
    expect(() => parseSitePackage({ ...curatedPackage(), [key]: {} })).toThrow()
  })
  it('rejects mismatched identities and statistics', () => {
    const pkg = curatedPackage()
    expect(() => parseSitePackage({ ...pkg, terrain: { ...pkg.terrain, siteId: 'wrong' } })).toThrow()
    expect(() => parseSitePackage({ ...pkg, buildings: { ...pkg.buildings, buildings: [] } })).toThrow()
  })
})
