/**
 * Property parcels for the curated sites (ADR-0035, build/foundation WP-5).
 *
 *   npx vitest run --config scripts/site-assets/vitest.config.ts parcels
 *
 * For each site: Kartverket's eiendomskart (matrikkel teig) over the terrain extent, from the WFS
 * dataset in WGS84, cached raw in data/raw/ with checksum and request, converted to local ENU
 * parcels, written as `parcels.json` and registered in the manifest with its provenance.
 */
import { it } from 'vitest'
import { PARCEL_NOTE } from '../../src/features/analysis/parcels'
import { PARCEL_WFS_URL, parcelRequestUrl, parcelsFromGml } from '../../src/features/import/parcels'
import { attributionSection, cached, lonLatBounds, readJson, registerAsset, sitePath, SITES, writeJson, type Manifest } from './raw'

for (const site of SITES) {
  it(`${site}: parcels.json from the eiendomskart`, async () => {
    const manifest = readJson<Manifest>(sitePath(site, 'manifest.json'))
    const terrain = readJson<{ minX: number; minY: number; maxX: number; maxY: number }>(sitePath(site, 'terrain.json'))
    const origin = { latitude: manifest.crs.originLatitude, longitude: manifest.crs.originLongitude }
    const raw = await cached(`${site}-parcels.gml`, parcelRequestUrl(lonLatBounds(manifest, terrain)), { headers: { 'User-Agent': 'site-package-build/1.0' } })
    const parcels = parcelsFromGml(new TextDecoder().decode(raw.bytes), origin, [terrain.minX, terrain.minY, terrain.maxX, terrain.maxY])
    if (parcels.length === 0) throw new Error(`${site}: no parcel in the extent; nothing written`)
    writeJson(sitePath(site, 'parcels.json'), { schemaVersion: 1, siteId: site, parcels }, 0)
    const note = `Parcel outlines are Kartverket's eiendomskart (matrikkel teig), ${parcels.length} parcels touching the terrain extent, kept whole; a map of the property register, not surveyed boundaries`
    registerAsset(site, 'parcels', 'parcels.json', {
      id: 'parcels',
      owner: 'Kartverket',
      dataset: 'Matrikkelen – Eiendomskart Teig',
      url: PARCEL_WFS_URL,
      licence: 'CC BY 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: '© Kartverket',
      retrieved: raw.retrieved,
      useLimitation: `${PARCEL_NOTE}. Boundary accuracy varies by parcel.`,
    }, note)
    attributionSection(site, 'Parcels', `© Kartverket. Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).\nSource: Matrikkelen – Eiendomskart Teig, WFS ${PARCEL_WFS_URL}, retrieved ${raw.retrieved}. Taken from the WFS dataset, not from map tiles.\n\n${note}. Areas shown in the studio are calculated from these outlines.`)
  })
}
