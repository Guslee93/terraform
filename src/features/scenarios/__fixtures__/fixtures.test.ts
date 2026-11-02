/**
 * M4 persisted-document fixtures (D35 by DeepSeek; integrated onto the v2 code by Claude).
 *
 * The v0/v1/corrupt/newer files are real pre-M4 serialiser output, so these tests prove the
 * production migration and loading paths against them, not just that the files are well formed.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { migrateScenario, parseStoredScenario, ScenarioLoadError } from '../migrate'
import { decodeProject } from '../project'
import { createScenarioRepository, type LoadResult } from '../repository'
import { createMemoryStore } from '../store'

const NOW = '2026-11-02T00:00:00.000Z'
const text = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8')
const json = (name: string): Record<string, unknown> => JSON.parse(text(name))

function loadError(run: () => unknown): ScenarioLoadError {
  try {
    run()
  } catch (error) {
    if (error instanceof ScenarioLoadError) return error
    throw error
  }
  throw new Error('expected a ScenarioLoadError')
}

function ready(result: LoadResult) {
  if (result.status !== 'ready') throw new Error(`expected ready, got ${result.status}`)
  return result
}

const options = { now: () => NOW, appVersion: '0.1.0' }

describe('migration fixtures', () => {
  it('v1 migrates to exactly the expected v2 document', () => {
    expect(parseStoredScenario(text('stepped-v1.json'), NOW)).toEqual(json('stepped-v2.expected.json'))
  })

  it('v0 (no schemaVersion) is v1 minus the version and migrates to the same v2 document', () => {
    expect({ ...json('stepped-v0.json'), schemaVersion: 1 }).toEqual(json('stepped-v1.json'))
    expect(parseStoredScenario(text('stepped-v0.json'), NOW)).toEqual(json('stepped-v2.expected.json'))
  })

  it('keeps the stepped geometry through migration (20×10 m × 3, 10×8 m × 2 at 9.6 m)', () => {
    const [volume] = parseStoredScenario(text('stepped-v1.json'), NOW).volumes
    expect(volume?.tiers.map((tier) => [tier.storeys, tier.storeyHeight, tier.baseElevation])).toEqual([[3, 3.2, 0], [2, 3.2, 9.6]])
  })

  it('reports each broken file with its kind and path', () => {
    expect(loadError(() => parseStoredScenario(text('corrupt-truncated.json'), NOW))).toMatchObject({ kind: 'corrupt', path: '$' })
    expect(loadError(() => parseStoredScenario(text('corrupt-shape.json'), NOW))).toMatchObject({ kind: 'corrupt' })
    expect(loadError(() => parseStoredScenario(text('corrupt-shape.json'), NOW)).path).toMatch(/footprint/)
    expect(loadError(() => parseStoredScenario(text('invalid-geometry.json'), NOW))).toMatchObject({ kind: 'corrupt' })
    expect(loadError(() => parseStoredScenario(text('invalid-geometry.json'), NOW)).path).toMatch(/footprint/)
    expect(loadError(() => migrateScenario(json('newer-version.json'), NOW))).toMatchObject({ kind: 'newer-version', version: 99, path: 'schemaVersion' })
  })
})

describe('project fixtures through the repository', () => {
  it('a project index naming a missing scenario file loads what exists and reports the rest', async () => {
    const store = createMemoryStore()
    const index = decodeProject(json('project-index.json'))
    const present = { ...json('stepped-v2.expected.json'), id: 'scenario-concept-a', siteId: 'compact-infill', name: 'Concept A' }
    await store.putProject({ siteId: index.siteId, json: text('project-index.json') })
    await store.putScenario({ id: 'scenario-concept-a', siteId: index.siteId, json: JSON.stringify(present) })
    const result = ready(await createScenarioRepository(store, options).load(index.siteId))
    expect(result.scenarios.map((scenario) => scenario.id)).toEqual(['scenario-concept-a'])
    expect(result.skipped.map((record) => [record.id, record.reason])).toEqual([['scenario-missing-file', 'missing']])
    expect(result.repaired).toBe(true)
    expect(result.project.scenarioIds).toEqual(['scenario-concept-a'])
  })

  it('every broken scenario file is skipped on load, never a crash, and kept verbatim', async () => {
    const store = createMemoryStore()
    const files = ['corrupt-truncated.json', 'corrupt-shape.json', 'invalid-geometry.json', 'newer-version.json']
    for (const [index, file] of files.entries()) await store.putScenario({ id: `bad-${index}`, siteId: 'sloped-edge', json: text(file) })
    const result = ready(await createScenarioRepository(store, options).load('sloped-edge'))
    expect(result.skipped.map((record) => record.reason)).toEqual(['corrupt', 'corrupt', 'corrupt', 'newer-version'])
    expect(result.skipped.map((record) => record.json)).toEqual(files.map(text))
  })
})

describe('export bundle fixtures', () => {
  it('imports a format-2 bundle and exports it again unchanged (FR-048 round trip)', async () => {
    const repository = createScenarioRepository(createMemoryStore(), options)
    const imported = ready(await repository.importProject(text('export-bundle.json'), 'compact-infill'))
    const bundle = json('export-bundle.json') as { scenarios: unknown[]; project: unknown }
    expect(imported.scenarios).toEqual(bundle.scenarios)
    expect(imported.project).toEqual(bundle.project)
    const exported = JSON.parse(await repository.exportProject('compact-infill')) as { scenarios: unknown[]; project: unknown; provenance: unknown }
    expect(exported.scenarios).toEqual(bundle.scenarios)
    expect(exported.project).toEqual(bundle.project)
    expect(exported.provenance).toEqual({ siteId: 'compact-infill', appVersion: '0.1.0', exportedAt: NOW })
  })

  it('a bundle written with format-1 scenarios still imports, upgraded to format 2', async () => {
    const repository = createScenarioRepository(createMemoryStore(), options)
    const imported = ready(await repository.importProject(text('export-bundle-legacy.json'), 'compact-infill'))
    expect(imported.scenarios.every((scenario) => scenario.schemaVersion === 2 && scenario.notes === '')).toBe(true)
    expect(imported.scenarios.map((scenario) => scenario.volumes.length)).toEqual([1, 0])
  })

  it('refuses the bundle for a different site and writes nothing', async () => {
    const repository = createScenarioRepository(createMemoryStore(), options)
    await expect(repository.importProject(text('export-bundle.json'), 'sloped-edge')).rejects.toMatchObject({ kind: 'corrupt', path: 'project.siteId' })
    expect(await repository.load('compact-infill')).toEqual({ status: 'empty' })
  })
})
