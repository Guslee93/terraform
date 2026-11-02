import { createId } from '../massing/factories'
import type { ScenarioDocument } from '../massing/types'
import type { ProjectRecord } from './project'

/** Pure project-level edits behind the scenario menu (FR-040, FR-045, FR-047). */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** The next free "Concept X" name. */
export function nextScenarioName(names: readonly string[]): string {
  const taken = new Set(names)
  for (const letter of LETTERS) if (!taken.has(`Concept ${letter}`)) return `Concept ${letter}`
  return uniqueName('Concept', names)
}

/** `base`, or `base 2`, `base 3`… so names in one project never collide. */
export function uniqueName(base: string, names: readonly string[]): string {
  const taken = new Set(names)
  if (!taken.has(base)) return base
  for (let index = 2; ; index += 1) if (!taken.has(`${base} ${index}`)) return `${base} ${index}`
}

/** A copy with a new id and name; masses, assumptions and notes are copied (FR-045). */
export function duplicateScenario(source: ScenarioDocument, names: readonly string[], now: string): ScenarioDocument {
  return { ...source, id: createId('scenario'), name: uniqueName(`${source.name} copy`, names), createdAt: now, updatedAt: now }
}

/** The same scenario with no masses and empty notes; id and name stay (ADR-0011 §4). */
export function resetScenario(source: ScenarioDocument, now: string): ScenarioDocument {
  return { ...source, volumes: [], notes: '', updatedAt: now }
}

export function addToProject(project: ProjectRecord, id: string, now: string): ProjectRecord {
  return { ...project, scenarioIds: [...project.scenarioIds, id], activeScenarioId: id, updatedAt: now }
}

export function setActive(project: ProjectRecord, id: string, now: string): ProjectRecord {
  if (!project.scenarioIds.includes(id)) throw new Error(`Unknown scenario: ${id}`)
  return { ...project, activeScenarioId: id, updatedAt: now }
}

/** Remove a scenario; the last one can't be removed. A removed active scenario hands over to its neighbour. */
export function removeFromProject(project: ProjectRecord, id: string, now: string): ProjectRecord {
  if (project.scenarioIds.length <= 1) throw new Error('A project keeps at least one scenario')
  const index = project.scenarioIds.indexOf(id)
  if (index < 0) throw new Error(`Unknown scenario: ${id}`)
  const scenarioIds = project.scenarioIds.filter((candidate) => candidate !== id)
  const activeScenarioId = project.activeScenarioId === id
    ? scenarioIds[Math.min(index, scenarioIds.length - 1)] ?? scenarioIds[0] ?? ''
    : project.activeScenarioId
  return { ...project, scenarioIds, activeScenarioId, updatedAt: now }
}
