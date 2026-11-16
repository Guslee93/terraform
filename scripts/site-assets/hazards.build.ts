/**
 * Mapped hazard facts for the curated sites (ADR-0036, build/foundation WP-6).
 *
 *   npx vitest run --config scripts/site-assets/vitest.config.ts hazards
 *
 * For each site: NVE flood zones, NVE flood susceptibility, NVE quick-clay susceptibility and
 * Kartverket storm surge over the terrain extent (WFS, WGS84), cached raw in data/raw/ with
 * checksum and request, converted to local ENU polygons, written as `hazards.json` and registered
 * in the manifest with one provenance entry per map.
 */
import { it } from 'vitest'
import { HAZARD_KINDS, HAZARDS, type HazardLayer } from '../../src/features/analysis/hazards'
import { hazardLayerFromGml, hazardRequestUrl } from '../../src/features/import/hazards'
import { nlodAttribution } from '../../src/features/sites/provenance'
import { attributionSection, cached, lonLatBounds, readJson, registerAsset, sitePath, SITES, writeJson, type Manifest } from './raw'

for (const site of SITES) {
  it(`${site}: hazards.json from NVE and Kartverket`, async () => {
    const manifest = readJson<Manifest>(sitePath(site, 'manifest.json'))
    const terrain = readJson<{ minX: number; minY: number; maxX: number; maxY: number }>(sitePath(site, 'terrain.json'))
    const origin = { latitude: manifest.crs.originLatitude, longitude: manifest.crs.originLongitude }
    const layers: HazardLayer[] = []
    let retrieved = ''
    for (const kind of HAZARD_KINDS) {
      const raw = await cached(`${site}-hazard-${kind}.gml`, hazardRequestUrl(kind, lonLatBounds(manifest, terrain)), { headers: { 'User-Agent': 'site-package-build/1.0' } })
      retrieved = raw.retrieved
      layers.push(hazardLayerFromGml(new TextDecoder().decode(raw.bytes), kind, origin, [terrain.minX, terrain.minY, terrain.maxX, terrain.maxY]))
    }
    writeJson(sitePath(site, 'hazards.json'), { schemaVersion: 1, siteId: site, retrieved, layers }, 0)
    const summary = layers.map((layer) => `${HAZARDS[layer.kind].label}: ${layer.polygons.length === 0 ? `not mapped by ${HAZARDS[layer.kind].owner}` : `${layer.polygons.length} mapped area(s) in the extent`}`).join('; ')
    for (const layer of layers) {
      const { owner, dataset, service, note } = HAZARDS[layer.kind]
      registerAsset(site, 'hazards', 'hazards.json', {
        id: layer.kind,
        owner,
        dataset,
        url: service,
        licence: 'NLOD 1.0',
        licenceUrl: 'https://data.norge.no/nlod/en/1.0',
        attribution: owner === 'NVE' ? 'Kilde: NVE' : nlodAttribution(owner),
        retrieved,
        ...(layer.updated ? { dataYear: Number(layer.updated.slice(0, 4)) } : {}),
        useLimitation: note,
      }, `Mapped hazards are presence facts from NVE and Kartverket, clipped to the terrain extent (${summary}); an absence is "not mapped", never "safe"`)
    }
    attributionSection(site, 'Mapped hazards', `Kilde: NVE (Flomsoner; Flom aktsomhetsområder; Aktsomhetskart for kvikkleireskred) and ${nlodAttribution('Kartverket')} (Stormflo og havnivå).\nLicence: NLOD 1.0 (https://data.norge.no/nlod/en/1.0). Source: Geonorge WFS services, retrieved ${retrieved}.\n\n${summary}. "Not mapped" means the authority has no mapped area in the extent; it is not a statement that the site is safe. No depths, probabilities or safety classes are derived.`)
  })
}
