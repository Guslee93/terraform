import {
  SitePackageError,
  parseSiteManifest,
  type SiteManifest,
  type Vec2Tuple,
} from './manifest'
import { isSimpleRing } from '../../lib/polygon'

export type TerrainData = {
  schemaVersion: 1
  siteId: string
  cols: number
  rows: number
  minX: number
  maxX: number
  minY: number
  maxY: number
  originElevation: number
  heights: number[][]
  source: string
}

export type BuildingKind =
  | 'apartments'
  | 'house'
  | 'commercial'
  | 'church'
  | 'industrial'
  | 'civic'
  | 'garage'
  | 'other'

export type ContextBuilding = {
  id: string
  kind: BuildingKind
  height: number
  baseElevation: number
  area: number
  withinStudyArea: boolean
  footprint: Vec2Tuple[]
}

export type BuildingsData = {
  schemaVersion: 1
  siteId: string
  buildings: ContextBuilding[]
}

export type StudyAreaData = {
  schemaVersion: 1
  siteId: string
  label: string
  polygon: Vec2Tuple[]
}

export type SitePackage = {
  manifest: SiteManifest
  terrain: TerrainData
  buildings: BuildingsData
  studyArea: StudyAreaData
}

const BUILDING_KINDS: readonly BuildingKind[] = [
  'apartments',
  'house',
  'commercial',
  'church',
  'industrial',
  'civic',
  'garage',
  'other',
]

function fail(path: string, message: string): never {
  throw new SitePackageError(message, path)
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, 'expected an object')
  }
  return value as Record<string, unknown>
}

function asString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail(path, 'expected a string')
  return value
}

function asNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(path, 'expected a finite number')
  }
  return value
}

function asInteger(value: unknown, path: string): number {
  const number = asNumber(value, path)
  if (!Number.isInteger(number)) fail(path, 'expected an integer')
  return number
}

function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, 'expected an array')
  return value
}

function asVec2(value: unknown, path: string): Vec2Tuple {
  const array = asArray(value, path)
  if (array.length !== 2) fail(path, 'expected [east, north]')
  return [asNumber(array[0], `${path}[0]`), asNumber(array[1], `${path}[1]`)]
}

function asClosedRing(value: unknown, path: string): Vec2Tuple[] {
  const polygon = asArray(value, path).map((point, index) => asVec2(point, `${path}[${index}]`))
  if (polygon.length < 4) fail(path, 'expected at least four points')
  const first = polygon[0]
  const last = polygon[polygon.length - 1]
  if (
    !first ||
    !last ||
    Math.abs(first[0] - last[0]) > 0.001 ||
    Math.abs(first[1] - last[1]) > 0.001
  ) {
    fail(path, 'polygon must be closed')
  }
  return polygon
}

function polygonArea(points: readonly Vec2Tuple[]): number {
  const count = points.length
  if (count < 3) return 0
  const first = points[0]
  const last = points[count - 1]
  const closed = first && last && first[0] === last[0] && first[1] === last[1]
  const ringLength = closed ? count - 1 : count
  let area = 0
  for (let index = 0; index < ringLength; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % ringLength]
    if (!current || !next) continue
    area += current[0] * next[1] - next[0] * current[1]
  }
  return Math.abs(area) / 2
}

export function parseTerrain(value: unknown): TerrainData {
  const root = asRecord(value, 'terrain')
  if (root.schemaVersion !== 1) fail('terrain.schemaVersion', 'unsupported schema version')
  const cols = asInteger(root.cols, 'terrain.cols')
  const rows = asInteger(root.rows, 'terrain.rows')
  if (cols < 2 || cols > 129 || rows < 2 || rows > 129) {
    fail('terrain.cols', 'grid must be between 2 and 129 in each direction')
  }
  const minX = asNumber(root.minX, 'terrain.minX')
  const maxX = asNumber(root.maxX, 'terrain.maxX')
  const minY = asNumber(root.minY, 'terrain.minY')
  const maxY = asNumber(root.maxY, 'terrain.maxY')
  if (maxX <= minX || maxY <= minY) fail('terrain.bounds', 'max must exceed min')
  const heightRows = asArray(root.heights, 'terrain.heights')
  if (heightRows.length !== rows) fail('terrain.heights', 'row count does not match rows')
  const heights = heightRows.map((row, rowIndex) => {
    const values = asArray(row, `terrain.heights[${rowIndex}]`)
    if (values.length !== cols) {
      fail(`terrain.heights[${rowIndex}]`, 'column count does not match cols')
    }
    return values.map((height, colIndex) =>
      asNumber(height, `terrain.heights[${rowIndex}][${colIndex}]`),
    )
  })

  return {
    schemaVersion: 1,
    siteId: asString(root.siteId, 'terrain.siteId'),
    cols,
    rows,
    minX,
    maxX,
    minY,
    maxY,
    originElevation: asNumber(root.originElevation, 'terrain.originElevation'),
    heights,
    source: asString(root.source, 'terrain.source'),
  }
}

function parseBuilding(value: unknown, path: string): ContextBuilding {
  const root = asRecord(value, path)
  const kind = asString(root.kind, `${path}.kind`)
  if (!BUILDING_KINDS.includes(kind as BuildingKind)) {
    fail(`${path}.kind`, 'unknown building kind')
  }
  const height = asNumber(root.height, `${path}.height`)
  if (height <= 0 || height > 200) fail(`${path}.height`, 'outside 0–200 m')
  const footprint = asArray(root.footprint, `${path}.footprint`).map((point, index) =>
    asVec2(point, `${path}.footprint[${index}]`),
  )
  if (footprint.length < 3 || footprint.length > 200) {
    fail(`${path}.footprint`, 'expected 3–200 vertices')
  }
  if (polygonArea(footprint) <= 0) fail(`${path}.footprint`, 'must have area')
  if (!isSimpleRing(footprint)) fail(`${path}.footprint`, 'must be a simple ring')
  return {
    id: asString(root.id, `${path}.id`),
    kind: kind as BuildingKind,
    height,
    baseElevation: asNumber(root.baseElevation, `${path}.baseElevation`),
    area: Math.max(0, asNumber(root.area, `${path}.area`)),
    withinStudyArea: root.withinStudyArea === true,
    footprint,
  }
}

export function parseBuildings(value: unknown): BuildingsData {
  const root = asRecord(value, 'buildings')
  if (root.schemaVersion !== 1) fail('buildings.schemaVersion', 'unsupported schema version')
  const buildings = asArray(root.buildings, 'buildings.buildings')
  if (buildings.length > 5000) fail('buildings.buildings', 'too many buildings')
  return {
    schemaVersion: 1,
    siteId: asString(root.siteId, 'buildings.siteId'),
    buildings: buildings.map((building, index) =>
      parseBuilding(building, `buildings.buildings[${index}]`),
    ),
  }
}

export function parseStudyArea(value: unknown): StudyAreaData {
  const root = asRecord(value, 'studyArea')
  if (root.schemaVersion !== 1) fail('studyArea.schemaVersion', 'unsupported schema version')
  const polygon = asClosedRing(root.polygon, 'studyArea.polygon')
  if (polygonArea(polygon) <= 0) fail('studyArea.polygon', 'polygon must have area')
  if (!isSimpleRing(polygon.slice(0, -1))) fail('studyArea.polygon', 'must be a simple ring')
  return {
    schemaVersion: 1,
    siteId: asString(root.siteId, 'studyArea.siteId'),
    label: asString(root.label, 'studyArea.label'),
    polygon,
  }
}



function assetUrl(siteId: string, relative: string): string {
  if (relative.startsWith('/') || relative.includes('..') || relative.includes('://')) {
    fail('assetPaths', `unsafe asset path: ${relative}`)
  }
  return `/sites/${encodeURIComponent(siteId)}/${relative}`
}

const REQUEST_TIMEOUT_MS = 15_000

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController()
  let timedOut = false

  const onCallerAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) {
      controller.abort()
    } else {
      signal.addEventListener('abort', onCallerAbort, { once: true })
    }
  }

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new SitePackageError(`request failed with HTTP ${response.status}`, url)
    }
    return response.json() as Promise<unknown>
  } catch (error) {
    if (timedOut) {
      throw new SitePackageError(
        `request to ${url} timed out after ${REQUEST_TIMEOUT_MS} ms`,
        url,
      )
    }
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onCallerAbort)
  }
}

export async function loadSitePackage(siteId: string, signal?: AbortSignal): Promise<SitePackage> {
  const manifest = parseSiteManifest(
    await fetchJson(`/sites/${encodeURIComponent(siteId)}/manifest.json`, signal),
  )
  if (manifest.id !== siteId) fail('manifest.id', 'does not match the requested site')

  const [terrainRaw, buildingsRaw, studyAreaRaw] = await Promise.all([
    fetchJson(assetUrl(siteId, manifest.assetPaths.terrain), signal),
    fetchJson(assetUrl(siteId, manifest.assetPaths.buildings), signal),
    fetchJson(assetUrl(siteId, manifest.assetPaths.studyArea), signal),
  ])

  const terrain = parseTerrain(terrainRaw)
  const buildings = parseBuildings(buildingsRaw)
  const studyArea = parseStudyArea(studyAreaRaw)

  for (const asset of [terrain, buildings, studyArea]) {
    if (asset.siteId !== siteId) fail(asset.siteId, 'site id does not match the package')
  }
  if (manifest.statistics.terrainSamples !== terrain.cols * terrain.rows) {
    fail('manifest.statistics.terrainSamples', 'does not match the terrain grid')
  }
  if (manifest.statistics.buildingCount !== buildings.buildings.length) {
    fail('manifest.statistics.buildingCount', 'does not match the building count')
  }
  if (Math.abs(manifest.statistics.studyAreaM2 - polygonArea(studyArea.polygon)) > 1) {
    fail('manifest.statistics.studyAreaM2', 'does not match the study boundary area')
  }

  return { manifest, terrain, buildings, studyArea }
}
