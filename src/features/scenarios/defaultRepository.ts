import { createScenarioRepository, type ScenarioRepository } from './repository'
import { createDexieStore } from './store'

let shared: ScenarioRepository | null = null

/** The app's one repository, over IndexedDB (ADR-0011 §5). Created on first use. */
export function getScenarioRepository(): ScenarioRepository {
  shared ??= createScenarioRepository(createDexieStore(), {
    now: () => new Date().toISOString(),
    appVersion: __APP_VERSION__,
  })
  return shared
}
