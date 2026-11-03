import type { SiteSummary } from '../sites/siteCatalog'
import type { SitePackage } from '../sites/package'
import type { ImportWarning } from './assemble'
import { createDexieImportedSiteStore, type ImportedSiteStore } from './store'
import { getScenarioRepository } from '../scenarios/defaultRepository'
import type { ScenarioRepository } from '../scenarios/repository'

export type ImportedSite = { summary: SiteSummary; sitePackage: SitePackage; warnings: ImportWarning[]; importedAt: string }
let repository: ImportedSiteStore | undefined
const temporary = new Map<string, ImportedSite>()
export function getImportedSiteStore(): ImportedSiteStore {
  return repository ??= createDexieImportedSiteStore()
}
export async function saveImported(site: ImportedSite): Promise<void> {
  await getImportedSiteStore().put(site)
  temporary.delete(site.summary.id)
}
export async function getImported(id: string | undefined) {
  if (id === undefined) return undefined
  return temporary.get(id) ?? await getImportedSiteStore().get(id)
}
/** Explicit fallback only: retained for this page session, never silently substituted for saving. */
export function openImportedWithoutSaving(site: ImportedSite): void { temporary.set(site.summary.id, site) }
export async function deleteImported(id: string, store = getImportedSiteStore(), scenarios: ScenarioRepository = getScenarioRepository()): Promise<void> {
  await store.delete(id)
  await scenarios.resetSite(id)
  temporary.delete(id)
}
