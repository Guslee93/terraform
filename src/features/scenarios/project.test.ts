import { describe, expect, it } from 'vitest'
import { ScenarioLoadError } from './migrate'
import { createDefaultProject, decodeProject } from './project'

const NOW = '2026-11-02T00:00:00.000Z'

describe('createDefaultProject', () => {
  it('starts a site with empty Concept A and Concept B, A active (FR-040)', () => {
    const { project, scenarios } = createDefaultProject('compact-infill', NOW)
    expect(scenarios.map((scenario) => [scenario.name, scenario.volumes.length, scenario.siteId])).toEqual([
      ['Concept A', 0, 'compact-infill'],
      ['Concept B', 0, 'compact-infill'],
    ])
    expect(project).toEqual({
      schemaVersion: 2,
      siteId: 'compact-infill',
      activeScenarioId: scenarios[0]?.id,
      scenarioIds: scenarios.map((scenario) => scenario.id),
      updatedAt: NOW,
    })
    expect(decodeProject(JSON.parse(JSON.stringify(project)))).toEqual(project)
  })
})

describe('decodeProject', () => {
  const valid = { schemaVersion: 2, siteId: 's', activeScenarioId: 'a', scenarioIds: ['a', 'b'], updatedAt: NOW }
  const pathOf = (raw: unknown) => {
    try {
      decodeProject(raw)
    } catch (error) {
      if (error instanceof ScenarioLoadError) return [error.kind, error.path]
      throw error
    }
    return null
  }

  it('rejects broken records with a path', () => {
    expect(pathOf({ ...valid, scenarioIds: [] })).toEqual(['corrupt', 'scenarioIds'])
    expect(pathOf({ ...valid, scenarioIds: ['a', 'a'] })).toEqual(['corrupt', 'scenarioIds'])
    expect(pathOf({ ...valid, activeScenarioId: 'c' })).toEqual(['corrupt', 'activeScenarioId'])
    expect(pathOf({ ...valid, schemaVersion: 1 })).toEqual(['corrupt', 'schemaVersion'])
    expect(pathOf({ ...valid, schemaVersion: 7 })).toEqual(['newer-version', 'schemaVersion'])
    expect(pathOf('nope')).toEqual(['corrupt', '$'])
  })
})
