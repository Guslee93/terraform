import { describe, expect, it } from 'vitest'
import { createRectangleFootprint, createScenario, createTier, createVolume } from '../massing/factories'
import { serializeScenario } from '../massing/serialize'
import { migrateScenario, parseStoredScenario, ScenarioLoadError } from './migrate'

const NOW = '2026-11-02T00:00:00.000Z'
const current = createScenario({
  id: 'scenario-a',
  siteId: 'compact-infill',
  now: '2026-10-30T12:00:00.000Z',
  volumes: [createVolume({ id: 'v1', name: 'Block A', tiers: [
    createTier({ id: 't1', footprint: createRectangleFootprint(20, 10), storeys: 3 }),
    createTier({ id: 't2', footprint: createRectangleFootprint(10, 8), baseElevation: 9.6, storeys: 2 }),
  ] })],
})
/** What M2/M3's serialiser wrote: v2 minus the M4 fields, at version 1. */
function asV1(): Record<string, unknown> {
  const raw = JSON.parse(serializeScenario(current)) as Record<string, unknown>
  delete raw.notes
  delete raw.createdAt
  delete raw.updatedAt
  return { ...raw, schemaVersion: 1 }
}
function loadError(run: () => unknown): ScenarioLoadError {
  try {
    run()
  } catch (error) {
    if (error instanceof ScenarioLoadError) return error
    throw error
  }
  throw new Error('expected a ScenarioLoadError')
}

describe('migrateScenario', () => {
  it('upgrades v1 to v2 with empty notes and the migration instant, keeping geometry', () => {
    const migrated = migrateScenario(asV1(), NOW)
    expect(migrated).toEqual({ ...current, notes: '', createdAt: NOW, updatedAt: NOW })
  })

  it('treats a record without schemaVersion as v0 and upgrades it the same way', () => {
    const v0 = asV1()
    delete v0.schemaVersion
    expect(migrateScenario(v0, NOW)).toEqual(migrateScenario(asV1(), NOW))
  })

  it('loads the current version unchanged', () => {
    expect(migrateScenario(JSON.parse(serializeScenario(current)), NOW)).toEqual(current)
  })

  it('rejects a newer version without guessing', () => {
    const error = loadError(() => migrateScenario({ ...asV1(), schemaVersion: 99 }, NOW))
    expect(error).toMatchObject({ kind: 'newer-version', version: 99, path: 'schemaVersion' })
  })

  it('reports corrupt records with the first offending path', () => {
    expect(loadError(() => parseStoredScenario('{"id":', NOW))).toMatchObject({ kind: 'corrupt', path: '$' })
    expect(loadError(() => migrateScenario([], NOW))).toMatchObject({ kind: 'corrupt', path: '$' })
    expect(loadError(() => migrateScenario({ ...asV1(), schemaVersion: '1' }, NOW))).toMatchObject({ kind: 'corrupt', path: 'schemaVersion' })
    const broken = asV1()
    const volumes = broken.volumes as { tiers: Record<string, unknown>[] }[]
    delete volumes[0]?.tiers[0]?.footprint
    expect(loadError(() => migrateScenario(broken, NOW))).toMatchObject({ kind: 'corrupt', path: 'volumes[0].tiers[0].footprint' })
  })
})
