/**
 * Measured heights for the curated sites (ADR-0033, build/foundation WP-3).
 *
 *   npx vitest run --config scripts/site-assets/vitest.config.ts heights
 *
 * For each curated site: one 1 m raster of Kartverket's surface model (DOM, open NHM WCS) over the
 * package's buildings, cached in data/raw/ with its checksum, then the app's own roof fit
 * (ADR-0022) per building. Writes `heights.json` beside the package's other assets and registers it
 * in the manifest. `buildings.json` is not touched: heights stay a separate CC BY 4.0 layer.
 * Run again after `build_site_packages.py` rebuilds a package (building ids may change).
 */
import { expect, it } from 'vitest'
import { decodeFloatTiff, KARTVERKET_DOM_URL } from '../../src/features/import/surface'
import { measureHeights } from '../../src/features/sites/heights'
import type { Vec2 } from '../../src/lib/coordinates'
import { attributionSection, cached, lonLatBounds, readJson, registerAsset, sitePath, SITES, writeJson, type Manifest } from './raw'

type Building = { id: string; footprint: Vec2[]; baseElevation: number; height: number }

for (const site of SITES) {
  it(`${site}: heights.json from the Kartverket surface model`, async () => {
    const manifest = readJson<Manifest>(sitePath(site, 'manifest.json'))
    const { buildings } = readJson<{ buildings: Building[] }>(sitePath(site, 'buildings.json'))
    const xs = buildings.flatMap((b) => b.footprint.map((p) => p[0]))
    const ys = buildings.flatMap((b) => b.footprint.map((p) => p[1]))
    // Whole metres, 5 m beyond the outermost footprint: one pixel per metre.
    const box = { minX: Math.floor(Math.min(...xs)) - 5, maxX: Math.ceil(Math.max(...xs)) + 5, minY: Math.floor(Math.min(...ys)) - 5, maxY: Math.ceil(Math.max(...ys)) + 5 }
    const width = box.maxX - box.minX
    const height = box.maxY - box.minY
    // The app's local frame is linear in latitude and longitude (projection.ts), so a raster the
    // WCS resamples to this WGS84 box is exact in ENU: column = east, row = north, no rotation.
    const bbox = lonLatBounds(manifest, box).map((value) => value.toFixed(8)).join(',')
    const url = `${KARTVERKET_DOM_URL}?service=WCS&version=1.0.0&request=GetCoverage&coverage=nhm_dom_topo_25833&crs=EPSG:4326&bbox=${bbox}&width=${width}&height=${height}&format=GeoTIFF`
    const { bytes, retrieved } = await cached(`${site}-dom.tif`, url)
    const raster = decodeFloatTiff(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)
    expect([raster.width, raster.height]).toEqual([width, height])
    const surfaceAt = (x: number, y: number): number | null => {
      const col = Math.floor(x - box.minX)
      const row = Math.floor(box.maxY - y)
      if (col < 0 || row < 0 || col >= width || row >= height) return null
      const value = raster.heights[row * width + col]
      return value === undefined || Number.isNaN(value) ? null : value
    }
    const measured = measureHeights(buildings, surfaceAt, manifest.crs.originElevation)
    const count = (kind: string) => measured.filter((entry) => entry.kind === kind).length
    const share = 1 - count('unmeasured') / measured.length
    console.info(`${site}: ${measured.length} buildings — ${count('gabled')} gabled, ${count('flat')} flat, ${count('complex')} complex, ${count('unmeasured')} unmeasured (${(share * 100).toFixed(1)} % measured)`)
    const deltas = measured.flatMap((entry, index) => (entry.kind === 'unmeasured' ? [] : [entry.height - buildings[index]!.height])).sort((a, b) => a - b)
    console.info(`  measured − estimated: p10 ${deltas[Math.floor(deltas.length * 0.1)]!.toFixed(1)} m, median ${deltas[Math.floor(deltas.length / 2)]!.toFixed(1)} m, p90 ${deltas[Math.floor(deltas.length * 0.9)]!.toFixed(1)} m`)

    writeJson(sitePath(site, 'heights.json'), {
      schemaVersion: 1,
      siteId: site,
      source: 'Kartverket surface model (DOM, NHM 1 m lidar), roof fit per ADR-0022; heights above each building\'s baseElevation',
      licence: 'CC BY 4.0 © Kartverket',
      retrieved,
      buildings: measured,
    }, undefined)
    const note = `Building heights and simple gables measured from Kartverket's surface model (${count('gabled')} gabled, ${count('flat')} flat, ${count('complex')} other shapes drawn flat at their measured height); ${count('unmeasured')} not seen in the surface model keep the storey estimate. Not survey data.`
    registerAsset(site, 'heights', 'heights.json', {
      id: 'heights',
      owner: 'Kartverket',
      dataset: 'Høyde DOM1 (surface model, NHM), roof fit',
      url: KARTVERKET_DOM_URL,
      licence: 'CC BY 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: '© Kartverket',
      retrieved,
      useLimitation: 'Heights are measured from a lidar surface model, not surveyed. Lidar and map epochs differ.',
    }, note)
    attributionSection(site, 'Building heights', `© Kartverket. Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
Source: Høyde DOM1, the national surface model (1 m lidar), from the open NHM service ${KARTVERKET_DOM_URL}, retrieved ${retrieved}.

\`heights.json\` is a separate layer keyed by OpenStreetMap building id; it is not merged into the ODbL footprint file. ${note}`)
  })
}
