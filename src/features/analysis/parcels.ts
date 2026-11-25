import type { Vec2 } from '../../lib/coordinates'
import { pointInPolygon, polygonArea } from '../../lib/polygon'

/**
 * Property parcels from Kartverket's eiendomskart (matrikkel teig), as published (ADR-0035).
 * An outline is a map of the register, not a surveyed boundary. The area is a deterministic
 * calculation from the polygon (feasibility 08 §1). Renderer-free.
 */

export type Parcel = {
  /** Kartverket's teig id. */
  readonly id: string
  /** "0301-228/255": municipality number, gårdsnummer/bruksnummer. Null where the register has none (often street ground). */
  readonly matrikkel: string | null
  /** The date the register entry was last updated, YYYY-MM-DD. */
  readonly updated: string | null
  /** The outline and its holes, local ENU metres. */
  readonly rings: readonly (readonly Vec2[])[]
}

export const PARCEL_NOTE = 'Eiendomskart — not a surveyed boundary'
/** Oslo's planning viewer: a link out, no data reuse (the plans themselves are not open; feasibility 07). */
export const PLANINNSYN_URL = 'https://od2.pbe.oslo.kommune.no/kart/'
export const PARCEL_AREA_NOTE = 'Area calculated from the mapped outline.'

/** Area in m² from the polygon: the outline minus its holes (shoelace, local ENU). */
export function parcelArea(parcel: Parcel): number {
  const [outline, ...holes] = parcel.rings
  if (!outline) return 0
  return Math.max(0, polygonArea(outline) - holes.reduce((sum, hole) => sum + polygonArea(hole), 0))
}

const contains = (parcel: Parcel, x: number, y: number): boolean => {
  let inside = false
  for (const ring of parcel.rings) if (pointInPolygon([x, y], ring)) inside = !inside
  return inside
}

/** The parcel at a point: the smallest one that holds it, or null on ground no parcel covers. */
export function parcelAt(parcels: readonly Parcel[], x: number, y: number): Parcel | null {
  let best: Parcel | null = null
  let bestArea = Infinity
  for (const parcel of parcels) {
    if (!contains(parcel, x, y)) continue
    const area = parcelArea(parcel)
    if (area < bestArea) { best = parcel; bestArea = area }
  }
  return best
}

export function parseParcels(value: unknown): { siteId: string; parcels: Parcel[] } {
  const fail = (path: string, message: string): never => { throw new Error(`${path}: ${message}`) }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('parcels', 'expected an object')
  const root = value as Record<string, unknown>
  if (root.schemaVersion !== 1) fail('parcels.schemaVersion', 'unsupported schema version')
  if (typeof root.siteId !== 'string' || root.siteId === '') fail('parcels.siteId', 'expected a string')
  if (!Array.isArray(root.parcels) || root.parcels.length > 20_000) fail('parcels.parcels', 'expected at most 20000 parcels')
  const text = (entry: unknown, path: string): string | null => {
    if (entry === null || entry === undefined) return null
    if (typeof entry !== 'string' || entry === '') return fail(path, 'expected a string or null')
    return entry
  }
  const parcels = (root.parcels as unknown[]).map((entry, index): Parcel => {
    const path = `parcels.parcels[${index}]`
    if (typeof entry !== 'object' || entry === null) fail(path, 'expected an object')
    const item = entry as Record<string, unknown>
    if (typeof item.id !== 'string' || item.id === '') fail(`${path}.id`, 'expected a string')
    if (!Array.isArray(item.rings) || item.rings.length === 0) fail(`${path}.rings`, 'expected at least one ring')
    const rings = (item.rings as unknown[]).map((ring, ringIndex) => {
      if (!Array.isArray(ring) || ring.length < 3) fail(`${path}.rings[${ringIndex}]`, 'expected at least three points')
      return (ring as unknown[]).map((point, pointIndex): Vec2 => {
        const [east, north] = Array.isArray(point) && point.length === 2 ? (point as unknown[]) : []
        if (typeof east !== 'number' || typeof north !== 'number' || !Number.isFinite(east) || !Number.isFinite(north)) return fail(`${path}.rings[${ringIndex}][${pointIndex}]`, 'expected [east, north]')
        return [east, north]
      })
    })
    return { id: item.id as string, matrikkel: text(item.matrikkel, `${path}.matrikkel`), updated: text(item.updated, `${path}.updated`), rings }
  })
  return { siteId: root.siteId as string, parcels }
}
