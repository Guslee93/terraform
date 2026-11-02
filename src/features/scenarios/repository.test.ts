import { describe, expect, it } from 'vitest'
import { createRectangleFootprint, createScenario, createTier, createVolume } from '../massing/factories'
import { serializeScenario } from '../massing/serialize'
import type { ScenarioDocument } from '../massing/types'
import { createDefaultProject } from './project'
import { createScenarioRepository, type LoadResult } from './repository'
import { createMemoryStore, StoreError, type ScenarioStore } from './store'

const NOW = '2026-11-02T00:00:00.000Z'
const SITE = 'compact-infill'
const options = { now: () => NOW, appVersion: '0.1.0' }

function withMass(document: ScenarioDocument, storeys: number): ScenarioDocument {
  return { ...document, volumes: [createVolume({ id: `v-${document.id}`, name: 'Block', tiers: [createTier({ id: `t-${document.id}`, footprint: createRectangleFootprint(20, 10), storeys })] })] }
}

function ready(result: LoadResult) {
  if (result.status !== 'ready') throw new Error(`expected ready, got ${result.status}`)
  return result
}

async function seeded(store: ScenarioStore = createMemoryStore()) {
  const repository = createScenarioRepository(store, options)
  const { project, scenarios } = createDefaultProject(SITE, NOW)
  const [a, b] = scenarios
  if (!a || !b) throw new Error('defaults')
  const edited = [withMass(a, 3), withMass(b, 7)]
  await Promise.all([...edited.map((document) => repository.saveScenario(document)), repository.saveProject(project)])
  return { store, repository, project, a: edited[0]!, b: edited[1]! }
}

describe('scenario repository', () => {
  it('reports an empty site on the first visit', async () => {
    expect(await createScenarioRepository(createMemoryStore(), options).load(SITE)).toEqual({ status: 'empty' })
  })

  it('QA-09: two edited scenarios come back distinct, in order, after a reload', async () => {
    const { store, project, a, b } = await seeded()
    const reloaded = ready(await createScenarioRepository(store, options).load(SITE))
    expect(reloaded.scenarios).toEqual([a, b])
    expect(reloaded.project).toEqual(project)
    expect(reloaded.repaired).toBe(false)
    expect(reloaded.scenarios.map((document) => document.volumes[0]?.tiers[0]?.storeys)).toEqual([3, 7])
  })

  it('lands writes to one scenario in call order even when the first write is slower', async () => {
    const memory = createMemoryStore()
    let release: () => void = () => undefined
    let first = true
    const slow: ScenarioStore = {
      ...memory,
      async putScenario(row) {
        if (first) {
          first = false
          await new Promise<void>((resolve) => (release = resolve))
        }
        return memory.putScenario(row)
      },
    }
    const repository = createScenarioRepository(slow, options)
    const base = createScenario({ id: 's1', siteId: SITE, now: NOW })
    const older = repository.saveScenario(withMass(base, 2))
    const newer = repository.saveScenario(withMass(base, 9))
    await new Promise((resolve) => setTimeout(resolve, 0)) // let the slow first write start
    release()
    await Promise.all([older, newer])
    const [row] = await memory.listScenarios(SITE)
    expect(row && JSON.parse(row.json).volumes[0].tiers[0].storeys).toBe(9)
  })

  it('skips damaged, newer and missing records, keeps the rest and repairs the index', async () => {
    const { store, project, a } = await seeded()
    const [, bId] = project.scenarioIds
    await store.putScenario({ id: bId!, siteId: SITE, json: '{"broken":' })
    await store.putScenario({ id: 'future', siteId: SITE, json: JSON.stringify({ ...JSON.parse(serializeScenario(a)), id: 'future', schemaVersion: 99 }) })
    await store.putProject({ siteId: SITE, json: JSON.stringify({ ...project, scenarioIds: [...project.scenarioIds, 'gone'] }) })
    const result = ready(await createScenarioRepository(store, options).load(SITE))
    expect(result.scenarios).toEqual([a])
    expect(result.skipped.map((record) => [record.id, record.reason])).toEqual([[bId, 'corrupt'], ['future', 'newer-version'], ['gone', 'missing']])
    expect(result.repaired).toBe(true)
    expect(result.project.scenarioIds).toEqual([a.id])
  })

  it('upgrades a stored v1 scenario on load', async () => {
    const store = createMemoryStore()
    const v2 = withMass(createScenario({ id: 'old', siteId: SITE, now: '2026-10-01T00:00:00.000Z' }), 4)
    const v1 = JSON.parse(serializeScenario(v2)) as Record<string, unknown>
    delete v1.notes
    delete v1.createdAt
    delete v1.updatedAt
    await store.putScenario({ id: 'old', siteId: SITE, json: JSON.stringify({ ...v1, schemaVersion: 1 }) })
    const result = ready(await createScenarioRepository(store, options).load(SITE))
    expect(result.scenarios).toEqual([{ ...v2, createdAt: NOW, updatedAt: NOW }])
    expect(result.repaired).toBe(true) // no project row yet
  })

  it('starts fresh defaults when every stored scenario is unreadable, still reporting them', async () => {
    const store = createMemoryStore()
    await store.putScenario({ id: 'x', siteId: SITE, json: 'nope' })
    const result = ready(await createScenarioRepository(store, options).load(SITE))
    expect(result.scenarios.map((document) => document.name)).toEqual(['Concept A', 'Concept B'])
    expect(result.skipped).toHaveLength(1)
  })

  it('QA-14: a project from a newer version and unavailable storage are states, not crashes', async () => {
    const { store, project } = await seeded()
    await store.putProject({ siteId: SITE, json: JSON.stringify({ ...project, schemaVersion: 5 }) })
    expect(await createScenarioRepository(store, options).load(SITE)).toEqual({ status: 'newer-version', version: 5 })
    const broken: ScenarioStore = { ...createMemoryStore(), getProject: () => Promise.reject(new StoreError('unavailable', "This browser can't store data")) }
    expect(await createScenarioRepository(broken, options).load(SITE)).toEqual({ status: 'unavailable', reason: "This browser can't store data" })
  })

  it('QA-14: a full store rejects the save with a quota error and keeps earlier data', async () => {
    const { store, repository, a } = await seeded()
    ;(store as ReturnType<typeof createMemoryStore>).failNext = 'quota'
    await expect(repository.saveScenario(withMass(a, 12))).rejects.toMatchObject({ kind: 'quota' })
    expect(ready(await repository.load(SITE)).scenarios[0]).toEqual(a)
  })

  it('refuses to store an invalid document', async () => {
    const repository = createScenarioRepository(createMemoryStore(), options)
    expect(() => repository.saveScenario({ ...createScenario({ siteId: SITE, now: NOW }), name: '' })).toThrow()
  })

  it('round-trips export → reset → import exactly (FR-048)', async () => {
    const { repository, a, b, project } = await seeded()
    const exported = await repository.exportProject(SITE)
    await repository.resetSite(SITE)
    expect(await repository.load(SITE)).toEqual({ status: 'empty' })
    const imported = ready(await repository.importProject(exported))
    expect(imported.scenarios).toEqual([a, b])
    expect(imported.project).toEqual(project)
  })

  it('writes nothing when any part of an import is invalid', async () => {
    const { repository, a, b } = await seeded()
    const bundle = JSON.parse(await repository.exportProject(SITE))
    bundle.scenarios[1].volumes = 'none'
    await expect(repository.importProject(JSON.stringify(bundle))).rejects.toMatchObject({ kind: 'corrupt', path: 'scenarios[1].volumes' })
    expect(ready(await repository.load(SITE)).scenarios).toEqual([a, b])
  })

  it('exports unreadable records verbatim so nothing is lost', async () => {
    const { store, repository, project } = await seeded()
    await store.putScenario({ id: project.scenarioIds[1]!, siteId: SITE, json: '{"broken":' })
    const bundle = JSON.parse(await repository.exportProject(SITE))
    expect(bundle.unreadable).toEqual([{ id: project.scenarioIds[1], json: '{"broken":' }])
    expect(bundle.provenance).toEqual({ siteId: SITE, appVersion: '0.1.0', exportedAt: NOW })
  })
})
