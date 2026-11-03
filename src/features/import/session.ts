import type { SiteSummary } from '../sites/siteCatalog'
import type { SitePackage } from '../sites/package'
import type { ImportWarning } from './assemble'

export type ImportedSite = { summary: SiteSummary; sitePackage: SitePackage; warnings: ImportWarning[]; importedAt: string }

// ponytail: in-memory only, lost on reload; P4 replaces this with the Dexie store.
const imported = new Map<string, ImportedSite>()

export function saveImported(site: ImportedSite): void {
  imported.set(site.summary.id, site)
}

export function getImported(id: string | undefined): ImportedSite | undefined {
  return id === undefined ? undefined : imported.get(id)
}
