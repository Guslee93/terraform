import { describe, expect, it } from 'vitest'
import { createScenario } from '../massing/factories'
import { createDefaultProject } from './project'
import { addToProject, duplicateScenario, nextScenarioName, removeFromProject, resetScenario, setActive, uniqueName } from './projectOps'

const NOW = '2026-11-02T00:00:00.000Z'

describe('project operations', () => {
  it('names new scenarios Concept C, D… and keeps copies unique', () => {
    expect(nextScenarioName(['Concept A', 'Concept B'])).toBe('Concept C')
    expect(nextScenarioName(['Concept A', 'Concept C'])).toBe('Concept B')
    expect(uniqueName('Concept A copy', ['Concept A copy'])).toBe('Concept A copy 2')
  })

  it('duplicates with a new id and name but the same content', () => {
    const source = { ...createScenario({ id: 'a', siteId: 's', now: '2026-10-01T00:00:00.000Z' }), notes: 'n' }
    const copy = duplicateScenario(source, ['Concept A'], NOW)
    expect(copy.id).not.toBe('a')
    expect(copy).toEqual({ ...source, id: copy.id, name: 'Concept A copy', createdAt: NOW, updatedAt: NOW })
  })

  it('resets content but keeps identity', () => {
    const source = { ...createScenario({ id: 'a', siteId: 's', now: '2026-10-01T00:00:00.000Z' }), notes: 'n' }
    expect(resetScenario(source, NOW)).toEqual({ ...source, notes: '', updatedAt: NOW })
  })

  it('adds, activates and removes, never removing the last scenario', () => {
    const { project } = createDefaultProject('s', NOW)
    const [a, b] = project.scenarioIds
    const added = addToProject(project, 'c', NOW)
    expect(added.scenarioIds).toEqual([a, b, 'c'])
    expect(added.activeScenarioId).toBe('c')
    expect(removeFromProject(added, 'c', NOW)).toMatchObject({ scenarioIds: [a, b], activeScenarioId: b })
    expect(removeFromProject(setActive(added, a!, NOW), b!, NOW)).toMatchObject({ scenarioIds: [a, 'c'], activeScenarioId: a })
    const single = removeFromProject(removeFromProject(added, 'c', NOW), b!, NOW)
    expect(() => removeFromProject(single, a!, NOW)).toThrow('at least one')
  })
})
