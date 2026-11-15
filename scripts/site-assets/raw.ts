import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { unproject } from '../../src/features/import/projection'

/**
 * Shared by the site-asset build steps: the raw cache in `data/raw/` with its `SHA256SUMS`, the
 * package files, and the conversion between a package's local ENU metres and WGS84.
 */

export const SITES = ['compact-infill', 'sloped-edge'] as const
export const RAW = 'data/raw'
const SUMS = `${RAW}/SHA256SUMS`
export const TODAY = new Date().toISOString().slice(0, 10)

export const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T
export const writeJson = (path: string, value: unknown, indent: number | undefined = 2) => writeFileSync(path, `${JSON.stringify(value, null, indent)}\n`)
export const sitePath = (site: string, file: string) => `public/sites/${site}/${file}`

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

/**
 * A raw response from the cache, fetched once and recorded with its checksum and retrieval date.
 * A cached file is verified against `SHA256SUMS`; the build never silently uses a changed file.
 * `REFRESH=1` fetches again and replaces the cache entry.
 */
export async function cached(name: string, url: string, init?: RequestInit): Promise<{ bytes: Uint8Array; retrieved: string }> {
  const path = `${RAW}/${name}`
  const datePath = `${path}.retrieved`
  const sums = readFileSync(SUMS, 'utf8').split('\n').filter(Boolean)
  const known = sums.find((line) => line.endsWith(`  ${name}`))
  if (existsSync(path) && known && !process.env.REFRESH) {
    const bytes = new Uint8Array(readFileSync(path))
    if (known.split('  ')[0] !== sha256(bytes)) throw new Error(`${name}: checksum does not match ${SUMS}`)
    return { bytes, retrieved: readFileSync(datePath, 'utf8').split('\n')[0]!.trim() }
  }
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status} from ${url}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  writeFileSync(path, bytes)
  // The request and its date travel with the cached response (provenance, ADR-0032).
  writeFileSync(datePath, `${TODAY}\n${url}\n`)
  const lines = [...sums.filter((line) => !line.endsWith(`  ${name}`) && !line.endsWith(`  ${name}.retrieved`)),
    `${sha256(bytes)}  ${name}`, `${sha256(new Uint8Array(readFileSync(datePath)))}  ${name}.retrieved`]
  writeFileSync(SUMS, `${lines.join('\n')}\n`)
  return { bytes, retrieved: TODAY }
}

export type Manifest = {
  id: string
  crs: { originLatitude: number; originLongitude: number; originElevation: number }
  assetPaths: Record<string, string>
  layers?: { id: string }[]
  simplified: string[]
}

/** [west, south, east, north] in WGS84 degrees for a local ENU box, by the app's own projection. */
export function lonLatBounds(manifest: Manifest, box: { minX: number; minY: number; maxX: number; maxY: number }): [number, number, number, number] {
  const { originLatitude: lat, originLongitude: lon } = manifest.crs
  const [south, west] = unproject(box.minX, box.minY, lat, lon)
  const [north, east] = unproject(box.maxX, box.maxY, lat, lon)
  return [west, south, east, north]
}

/** Registers an asset and its provenance in the package manifest, replacing an earlier entry. */
export function registerAsset(site: string, key: string, file: string, layer: { id: string } & Record<string, unknown>, note: string): void {
  const path = sitePath(site, 'manifest.json')
  const manifest = readJson<Manifest & Record<string, unknown>>(path)
  manifest.assetPaths = { ...manifest.assetPaths, [key]: file }
  manifest.layers = [...(manifest.layers ?? []).filter((entry) => entry.id !== layer.id), layer]
  const tag = `[${key}] `
  manifest.simplified = [...manifest.simplified.filter((line) => !line.startsWith(tag)), `${tag}${note}`]
  writeJson(path, manifest)
}

/** Adds or replaces one `## heading` section of the package's attribution file. */
export function attributionSection(site: string, heading: string, body: string): void {
  const path = sitePath(site, 'attribution.md')
  const sections = readFileSync(path, 'utf8').trimEnd().split(/\n(?=## )/).filter((section) => !section.startsWith(`## ${heading}\n`))
  writeFileSync(path, `${[...sections, `## ${heading}\n\n${body.trim()}`].join('\n\n').replace(/\n{3,}/g, '\n\n')}\n`)
}
