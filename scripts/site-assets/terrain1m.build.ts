/**
 * The 1 m terrain tile for the curated sites (ADR-0037, build/foundation WP-7).
 *
 *   npx vitest run --config scripts/site-assets/vitest.config.ts terrain1m
 *
 * For each site: Kartverket DTM1 from the open NHM terrain WCS (not "DTM Sømløs", which is
 * restricted) over the terrain extent at about 1 m, cached raw in data/raw/ with checksum and
 * request; written as `terrain1m.bin` (Int16 little-endian centimetres above the package origin,
 * north row first) with its header `terrain1m.json`, and registered in the manifest.
 */
import { writeFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { TERRAIN_NO_DATA, TERRAIN_NOTE } from '../../src/features/analysis/terrainTools'
import { decodeFloatTiff } from '../../src/features/import/surface'
import { attributionSection, cached, lonLatBounds, readJson, registerAsset, sitePath, SITES, writeJson, type Manifest } from './raw'

const DTM_URL = 'https://wcs.geonorge.no/skwms1/wcs.hoyde-dtm-nhm-25833'

for (const site of SITES) {
  it(`${site}: terrain1m from Kartverket DTM1`, async () => {
    const manifest = readJson<Manifest>(sitePath(site, 'manifest.json'))
    const terrain = readJson<{ minX: number; minY: number; maxX: number; maxY: number }>(sitePath(site, 'terrain.json'))
    const cols = Math.round(terrain.maxX - terrain.minX)
    const rows = Math.round(terrain.maxY - terrain.minY)
    // The app's frame is linear in latitude and longitude, so this WGS84 raster is exact in ENU (ADR-0033 §3).
    const bbox = lonLatBounds(manifest, terrain).map((value) => value.toFixed(8)).join(',')
    const url = `${DTM_URL}?service=WCS&version=1.0.0&request=GetCoverage&coverage=nhm_dtm_topo_25833&crs=EPSG:4326&bbox=${bbox}&width=${cols}&height=${rows}&format=GeoTIFF`
    const { bytes, retrieved } = await cached(`${site}-dtm.tif`, url)
    const raster = decodeFloatTiff(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)
    expect([raster.width, raster.height]).toEqual([cols, rows])
    const origin = manifest.crs.originElevation
    const out = new Int16Array(cols * rows)
    let missing = 0
    raster.heights.forEach((height, index) => {
      if (Number.isNaN(height)) { out[index] = TERRAIN_NO_DATA; missing += 1; return }
      const centimetres = Math.round((height - origin) * 100)
      if (Math.abs(centimetres) > 32_000) throw new Error(`${site}: a height is outside the Int16 centimetre range`)
      out[index] = centimetres
    })
    // Int16Array is little-endian on every platform this build runs on; the reader says so explicitly.
    writeFileSync(sitePath(site, 'terrain1m.bin'), new Uint8Array(out.buffer))
    writeJson(sitePath(site, 'terrain1m.json'), { schemaVersion: 1, siteId: site, cols, rows, minX: terrain.minX, minY: terrain.minY, maxX: terrain.maxX, maxY: terrain.maxY, originElevation: origin, verticalDatum: 'NN2000' })
    const note = `1 m terrain is Kartverket DTM1 (bare earth, lidar), ${cols} × ${rows} cells over the terrain extent, stored in centimetres; ${missing} cells without data. Not a survey`
    registerAsset(site, 'terrain1m', 'terrain1m.json', {
      id: 'terrain1m',
      owner: 'Kartverket',
      dataset: 'Høyde DTM1 (terrain model, NHM)',
      url: DTM_URL,
      licence: 'CC BY 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: '© Kartverket',
      retrieved,
      useLimitation: TERRAIN_NOTE,
    }, note)
    attributionSection(site, '1 m terrain', `© Kartverket. Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).\nSource: Høyde DTM1 from the open NHM service ${DTM_URL}, retrieved ${retrieved}. Vertical datum NN2000.\n\n${note}. Used for the section and slope tools; the drawn ground is still the package's coarser grid.`)
  })
}
