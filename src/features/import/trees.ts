import { pointInPolygon } from '../../lib/polygon'
import type { BuildingDraft } from './buildings'
import { frameBounds, type ImportFrame } from './frame'
import { clipRing, outerRings, toLocal, type Point2, type Ring } from './geometry'
import { requestBytes, checkAbort } from './request'
import type { TileFeature } from './tiles'

export type TreeSource = {
  name: string; attribution: string; url?: string; license?: string
  /** Mapped trees as [lon, lat] lines: one point per tree, several for a tree row. Throws when unavailable. */
  fetchTrees(bounds: readonly [number, number, number, number], signal?: AbortSignal): Promise<[number, number][][]>
}

const ROW_SPACING = 8
/** Grid spacing (m) of illustrative trees per mapped area; anything else gets none. */
const ILLUSTRATIVE_SPACING: Record<string, number> = { wood: 9, garden: 14, park: 16, cemetery: 18 }
const MAX_TREES = 3000

/**
 * Planet Overpass endpoints, tried in order. The public instances are donation-funded and
 * rate limited, so a failure moves on to the next one instead of failing the import.
 */
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.rwth-aachen.de/api/interpreter',
] as const
/** Wall-clock budget for the whole tree step, across every endpoint and attempt. */
const OVERPASS_BUDGET_MS = 15_000
/** Delay before the next endpoint, so a throttled instance is not hammered. */
const OVERPASS_BACKOFF_MS = 500

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Import cancelled', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** OSM natural=tree nodes plus natural=tree_row ways, resampled every 8 m along the row. */
export function overpassTrees(endpoint: string = OVERPASS_ENDPOINTS[0], timeoutMs = 5000): TreeSource {
  const endpoints = [endpoint, ...OVERPASS_ENDPOINTS.filter((url) => url !== endpoint)]
  return {
    name: 'Overpass API', attribution: '© OpenStreetMap contributors · ODbL 1.0', url: endpoint, license: 'ODbL 1.0',
    async fetchTrees([west, south, east, north], signal) {
      const box = `${south},${west},${north},${east}`
      const query = `[out:json][timeout:25];(node["natural"="tree"](${box});way["natural"="tree_row"](${box}););out geom;`
      // POST rather than a query string: the body stays a simple request, so no preflight is
      // needed and the query cannot outgrow a URL limit.
      const body = new URLSearchParams({ data: query })
      const deadline = Date.now() + OVERPASS_BUDGET_MS
      const failures: string[] = []
      // A throttled instance is better answered by the next mirror than by an immediate retry,
      // so every endpoint is tried once before any endpoint is tried again.
      for (let pass = 0; pass < 2; pass++) {
        for (const [index, url] of endpoints.entries()) {
          if (index > 0 && deadline - Date.now() > OVERPASS_BACKOFF_MS) await sleep(OVERPASS_BACKOFF_MS, signal)
          const remaining = deadline - Date.now()
          if (remaining <= 0) break
          try {
            const buffer = await requestBytes(url, 'Overpass API', signal, Math.min(timeoutMs, remaining), {
              method: 'POST',
              body,
            })
            return parseOverpassTrees(JSON.parse(new TextDecoder().decode(buffer)))
          } catch (error) {
            checkAbort(signal)
            failures.push(`${url}: ${error instanceof Error ? error.message : String(error)}`)
          }
        }
      }
      throw new Error(`Overpass API: ${failures.join('; ')}`)
    },
  }
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export function parseOverpassTrees(raw: unknown): [number, number][][] {
  if (typeof raw !== 'object' || raw === null || !('elements' in raw) || !Array.isArray(raw.elements)) throw new Error('Overpass API: missing elements')
  // Overpass answers a timed-out query with HTTP 200, no elements and a remark: not "no trees".
  if (!raw.elements.length && 'remark' in raw && typeof raw.remark === 'string') throw new Error(`Overpass API: ${raw.remark}`)
  const lines: [number, number][][] = []
  for (const element of raw.elements as unknown[]) {
    if (typeof element !== 'object' || element === null) continue
    const item = element as { type?: unknown; lat?: unknown; lon?: unknown; geometry?: unknown }
    if (item.type === 'node' && finite(item.lon) && finite(item.lat)) lines.push([[item.lon, item.lat]])
    if (item.type === 'way' && Array.isArray(item.geometry)) {
      const line = (item.geometry as { lat?: unknown; lon?: unknown }[]).flatMap((p) => finite(p.lon) && finite(p.lat) ? [[p.lon, p.lat] as [number, number]] : [])
      if (line.length) lines.push(line)
    }
  }
  return lines
}

/** Mapped tree lines to local ENU points; rows are resampled every 8 m. */
export function mappedTrees(lines: readonly [number, number][][], frame: ImportFrame): Point2[] {
  return lines.flatMap((line) => {
    const local = toLocal(line, frame)
    return local.length > 1 ? resampleRow(local) : local
  })
}

/** Resample a tree row in local metres so the gaps match ROW_SPACING, not the mapper's vertices. */
export function resampleRow(row: Ring): Ring {
  const out: Ring = []
  for (let i = 1; i < row.length; i++) {
    const [ax, ay] = row[i - 1]!, [bx, by] = row[i]!
    const steps = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / ROW_SPACING))
    for (let s = i === 1 ? 0 : 1; s <= steps; s++) out.push([ax + ((bx - ax) * s) / steps, ay + ((by - ay) * s) / steps])
  }
  return out
}

/** Deterministic 0–1 jitter so the same import always places the same trees. */
function jitter(x: number, y: number, salt: number): number {
  let v = Math.imul(Math.round(x * 10) ^ 0x9e3779b9, 0x85ebca6b)
  v = Math.imul(v ^ Math.round(y * 10) ^ salt, 0xc2b2ae35)
  v ^= v >>> 16
  return (v >>> 0) / 0x100000000
}

/**
 * Illustrative trees on a jittered grid inside mapped woods, gardens, parks and cemeteries.
 * Not tree positions: used only when no mapped trees are available.
 */
export function illustrativeTrees(features: readonly TileFeature[], frame: ImportFrame): Point2[] {
  const extent = frameBounds(frame).enu
  const points: Point2[] = []
  for (const f of features) {
    const key = f.layer === 'landcover' && f.properties.class === 'wood' ? 'wood'
      : f.layer === 'landcover' && f.properties.subclass === 'garden' ? 'garden'
      : f.layer === 'landcover' && (f.properties.subclass === 'park' || f.properties.subclass === 'village_green' || f.properties.subclass === 'recreation_ground') ? 'park'
        : f.layer === 'landuse' && f.properties.class === 'cemetery' ? 'cemetery' : null
    if (!key) continue
    const spacing = ILLUSTRATIVE_SPACING[key]!
    for (const outer of outerRings(f.geometry)) {
      const ring = clipRing(toLocal(outer, frame), extent)
      if (ring.length < 3) continue
      const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1])
      // Grid anchored to whole multiples so overlapping areas share points instead of doubling them.
      for (let x = Math.ceil(Math.min(...xs) / spacing) * spacing; x <= Math.max(...xs); x += spacing) {
        for (let y = Math.ceil(Math.min(...ys) / spacing) * spacing; y <= Math.max(...ys); y += spacing) {
          const point: Point2 = [x + (jitter(x, y, 1) - 0.5) * spacing * 0.7, y + (jitter(x, y, 2) - 0.5) * spacing * 0.7]
          if (pointInPolygon(point, ring)) points.push(point)
        }
      }
    }
  }
  return points
}

/** Local ENU tree points inside the frame, off building footprints, deduplicated at 1 m, capped. */
export function placeTrees(points: readonly Point2[], buildings: readonly BuildingDraft[], frame: ImportFrame): [number, number][] {
  const [minX, minY, maxX, maxY] = frameBounds(frame).enu
  const boxes = buildings.map(({ footprint }) => {
    const xs = footprint.map((p) => p[0]), ys = footprint.map((p) => p[1])
    return { ring: footprint, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as const }
  })
  const seen = new Set<string>()
  const out: [number, number][] = []
  for (const [x, y] of points) {
    if (x < minX || x > maxX || y < minY || y > maxY) continue
    const key = `${Math.round(x)},${Math.round(y)}`
    if (seen.has(key)) continue
    if (boxes.some(({ box, ring }) => x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3] && pointInPolygon([x, y], ring))) continue
    seen.add(key)
    out.push([Number(x.toFixed(2)), Number(y.toFixed(2))])
  }
  // Over the cap, thin evenly: stopping at the first MAX_TREES would leave part of the frame bare.
  if (out.length <= MAX_TREES) return out
  const step = out.length / MAX_TREES
  return Array.from({ length: MAX_TREES }, (_, index) => out[Math.floor(index * step)]!)
}
