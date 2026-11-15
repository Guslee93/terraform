import type { Vec2 } from '../../lib/coordinates'
import { fitRoof, roofSamplePoints } from '../import/roofFit'
import { SitePackageError } from './manifest'
import type { ContextBuilding } from './package'
import { parseRoof, type Roof } from './roof'

/**
 * Measured heights for a package's context buildings (ADR-0033): the roof fit of ADR-0022 run over
 * Kartverket's surface model, kept as a separate CC BY 4.0 asset keyed by OpenStreetMap building id
 * so it is never merged into the ODbL footprint file. Renderer-free.
 */

export type HeightKind = 'flat' | 'gabled' | 'complex' | 'unmeasured'
export type MeasuredHeight =
  | { readonly id: string; readonly kind: 'flat' | 'complex'; readonly height: number }
  | { readonly id: string; readonly kind: 'gabled'; readonly height: number; readonly roof: Roof }
  /** The surface model does not show this building (lidar and map epochs differ): the estimate stays. */
  | { readonly id: string; readonly kind: 'unmeasured' }

export type HeightsData = {
  schemaVersion: 1
  siteId: string
  /** `roof` is validated against its footprint when the heights are merged. */
  buildings: { id: string; kind: HeightKind; height?: number; roof?: unknown }[]
}

const KINDS: readonly HeightKind[] = ['flat', 'gabled', 'complex', 'unmeasured']
/** The same clamp the import path applies to a fitted height. */
const clampHeight = (height: number) => Math.min(200, Math.max(2.5, height))

function fail(path: string, message: string): never {
  throw new SitePackageError(message, path)
}

export function parseHeights(value: unknown): HeightsData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('heights', 'expected an object')
  const root = value as Record<string, unknown>
  if (root.schemaVersion !== 1) fail('heights.schemaVersion', 'unsupported schema version')
  if (typeof root.siteId !== 'string' || root.siteId === '') fail('heights.siteId', 'expected a string')
  if (!Array.isArray(root.buildings) || root.buildings.length > 5000) fail('heights.buildings', 'expected at most 5000 entries')
  const seen = new Set<string>()
  const buildings = root.buildings.map((entry: unknown, index) => {
    const path = `heights.buildings[${index}]`
    if (typeof entry !== 'object' || entry === null) fail(path, 'expected an object')
    const item = entry as Record<string, unknown>
    if (typeof item.id !== 'string' || item.id === '') fail(`${path}.id`, 'expected a string')
    if (seen.has(item.id)) fail(`${path}.id`, 'listed twice')
    seen.add(item.id)
    if (!KINDS.includes(item.kind as HeightKind)) fail(`${path}.kind`, 'unknown kind')
    const kind = item.kind as HeightKind
    if (kind === 'unmeasured') return { id: item.id, kind }
    const height = item.height
    if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0 || height > 200) fail(`${path}.height`, 'outside 0–200 m')
    if (kind === 'gabled' && item.roof === undefined) fail(`${path}.roof`, 'a gabled entry needs its roof')
    return { id: item.id, kind, height, ...(kind === 'gabled' ? { roof: item.roof } : {}) }
  })
  return { schemaVersion: 1, siteId: root.siteId, buildings }
}

/**
 * The buildings with their measured height and roof in place of the estimate. A building the asset
 * does not list, or lists as unmeasured, keeps its estimate; each one says which it is.
 */
export function mergeHeights(buildings: readonly ContextBuilding[], heights: HeightsData): ContextBuilding[] {
  const byId = new Map(heights.buildings.map((entry) => [entry.id, entry]))
  return buildings.map((building) => {
    const entry = byId.get(building.id)
    if (!entry || entry.kind === 'unmeasured' || entry.height === undefined) return { ...building, heightSource: 'estimated' }
    const { roof: _estimatedRoof, ...rest } = building
    void _estimatedRoof
    let roof: Roof | undefined
    if (entry.kind === 'gabled') {
      try { roof = parseRoof(entry.roof, building.footprint, `heights.${building.id}.roof`) }
      catch (error) { fail(`heights.${building.id}.roof`, error instanceof Error ? error.message : 'invalid roof') }
    }
    return { ...rest, height: entry.height, heightSource: 'measured', ...(roof ? { roof } : {}) }
  })
}

/** How many of the buildings carry a measured height. */
export function measuredCount(buildings: readonly ContextBuilding[]): number {
  return buildings.filter((building) => building.heightSource === 'measured').length
}

/**
 * The roof fit over a set of buildings (build step). `surfaceAt` gives the absolute surface height
 * at a local ENU position, or null; `originElevation` and each building's `baseElevation` place the
 * building's base, exactly as the import path does (assemble.ts).
 */
export function measureHeights(
  buildings: readonly { readonly id: string; readonly footprint: readonly Vec2[]; readonly baseElevation: number }[],
  surfaceAt: (x: number, y: number) => number | null,
  originElevation: number,
): MeasuredHeight[] {
  return buildings.map(({ id, footprint, baseElevation }) => {
    const fit = fitRoof(footprint, roofSamplePoints(footprint).map(([x, y]) => {
      const z = surfaceAt(x, y)
      return { x, y, z: z === null ? null : z - originElevation - baseElevation }
    }))
    if (!fit) return { id, kind: 'unmeasured' }
    const height = Number(clampHeight(fit.height).toFixed(2))
    return fit.kind === 'gabled' ? { id, kind: 'gabled', height, roof: fit.roof } : { id, kind: fit.kind, height }
  })
}
