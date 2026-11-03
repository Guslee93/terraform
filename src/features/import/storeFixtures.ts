import manifest from '../../../public/sites/compact-infill/manifest.json'
import terrain from '../../../public/sites/compact-infill/terrain.json'
import buildings from '../../../public/sites/compact-infill/buildings.json'
import studyArea from '../../../public/sites/compact-infill/study-area.json'
import roads from '../../../public/sites/compact-infill/roads.json'
import trees from '../../../public/sites/compact-infill/trees.json'
import landcover from '../../../public/sites/compact-infill/landcover.json'
import { parseSitePackage } from '../sites/package'
import type { ImportedSite } from './session'

export const curatedPackage = () => parseSitePackage({ manifest, terrain, buildings, studyArea, roads: roads.roads, trees: trees.trees, landcover: landcover.areas })
export function importedFixture(id = 'import-test'): ImportedSite {
  return {
    summary: { id, title: 'Oslo test', subtitle: 'Open map data', description: 'Test import', thumbnail: '', dataStatus: 'user-import', morphology: 'Imported area' },
    sitePackage: parseSitePackage({ ...curatedPackage(), manifest: { ...manifest, id, dataStatus: 'user-import' }, terrain: { ...terrain, siteId: id }, buildings: { ...buildings, siteId: id }, studyArea: { ...studyArea, siteId: id } }),
    warnings: [], importedAt: '2026-11-03T12:00:00.000Z',
  }
}
