/**
 * The official strategic road-noise map for the curated sites (ADR-0034, build/foundation WP-4).
 *
 *   npx vitest run --config scripts/site-assets/vitest.config.ts noise
 *
 * For each site: Statens vegvesen's Lden and Lnight polygons over the terrain extent (WFS GeoJSON
 * in WGS84), cached raw in data/raw/ with checksum and request, converted to local ENU polygons
 * with holes, written as `noise.json` and registered in the manifest with its provenance.
 */
import { expect, it } from 'vitest'
import { NOISE_METRICS, NOISE_OWNER, NOISE_USE_LIMITATION, type NoisePolygon } from '../../src/features/analysis/officialNoise'
import { NOISE_DATASET_UUID, NOISE_WFS_URL, noiseFromGeoJson, noiseRequestUrl } from '../../src/features/import/officialNoise'
import { nlodAttribution } from '../../src/features/sites/provenance'
import { attributionSection, cached, lonLatBounds, readJson, registerAsset, sitePath, SITES, writeJson, type Manifest } from './raw'

for (const site of SITES) {
  it(`${site}: noise.json from the strategic road-noise map`, async () => {
    const manifest = readJson<Manifest>(sitePath(site, 'manifest.json'))
    const terrain = readJson<{ minX: number; minY: number; maxX: number; maxY: number }>(sitePath(site, 'terrain.json'))
    const origin = { latitude: manifest.crs.originLatitude, longitude: manifest.crs.originLongitude }
    const polygons: NoisePolygon[] = []
    const years = new Set<number>()
    let retrieved = ''
    for (const metric of NOISE_METRICS) {
      const raw = await cached(`${site}-noise-${metric.toLowerCase()}.geojson`, noiseRequestUrl(metric, lonLatBounds(manifest, terrain)), { headers: { 'User-Agent': 'site-package-build/1.0' } })
      retrieved = raw.retrieved
      const converted = noiseFromGeoJson(JSON.parse(new TextDecoder().decode(raw.bytes)), metric, origin, [terrain.minX, terrain.minY, terrain.maxX, terrain.maxY])
      polygons.push(...converted.polygons)
      if (converted.dataYear !== null) years.add(converted.dataYear)
    }
    // One calculation year for the whole layer, read from the features.
    expect(years.size).toBeLessThanOrEqual(1)
    const dataYear = [...years][0]
    if (dataYear === undefined || polygons.length === 0) throw new Error(`${site}: no strategic noise map in the extent; nothing written`)
    writeJson(sitePath(site, 'noise.json'), { schemaVersion: 1, siteId: site, dataYear, polygons }, 0)
    const note = `Road-noise bands are Statens vegvesen's strategic noise map (Lden and Lnight, calculated for ${dataYear}, CNOSSOS-EU), clipped to the terrain extent and simplified at 0.4 m; shown as published, not calculated here`
    registerAsset(site, 'noise', 'noise.json', {
      id: 'noise',
      owner: NOISE_OWNER,
      dataset: 'Strategic road-noise map (Lden, Lnight), CNOSSOS-EU',
      datasetUuid: NOISE_DATASET_UUID,
      url: NOISE_WFS_URL,
      licence: 'NLOD 1.0',
      licenceUrl: 'https://data.norge.no/nlod/en/1.0',
      attribution: nlodAttribution(NOISE_OWNER),
      retrieved,
      dataYear,
      useLimitation: `${NOISE_USE_LIMITATION} (Not for assessing the need for measures on individual buildings; separate calculations are required.)`,
    }, note)
    attributionSection(site, 'Road noise', `${nlodAttribution(NOISE_OWNER)}.\nLicence: NLOD 1.0 (https://data.norge.no/nlod/en/1.0). Source: ${NOISE_WFS_URL} (layers Strategiskstoykart_lden and _lnight), retrieved ${retrieved}; calculation year ${dataYear}, read from the features.\n\nUse limitation (publisher, verbatim): «${NOISE_USE_LIMITATION}»\n\n${note}. The map is static: it does not respond to anything drawn in the studio.`)
  })
}
