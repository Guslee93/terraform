import { requestBytes, checkAbort } from './request'

/**
 * OpenStreetMap's own geometry for a frame (ADR-0027).
 *
 * The vector tiles carry water as a *generalised* outline: at the z14 the OpenMapTiles planet
 * tiles stop at, the Nidelva at Trondheim arrives with stair-stepped edges along the tile grid
 * and with the river's centre line drawn again as a ribbon on top of it. A tint of that outline
 * cannot be flat, and the outline itself is wrong.
 *
 * OpenStreetMap has the same water in its own coordinates. The API answers a bounding box in one
 * request and returns the real geometry — the closed ways that map the river's surface, the
 * relations that map a wider water body, the centre lines of the watercourses that have no area
 * at all — and the mapped trees of the same frame. This module reads that response; `water.ts`
 * and `trees.ts` turn it into the studio's own features.
 *
 * The response for a 400 m frame is a few hundred kilobytes of XML, which the browser parses in
 * a few tens of milliseconds.
 */

export type OsmNode = { id: string; lon: number; lat: number; tags: Record<string, string> }
export type OsmWay = { id: string; refs: string[]; tags: Record<string, string> }
export type OsmRelation = { id: string; members: { type: string; ref: string; role: string }[]; tags: Record<string, string> }
export type OsmData = { nodes: OsmNode[]; ways: OsmWay[]; relations: OsmRelation[] }

export type OsmAreaSource = {
  name: string
  attribution: string
  url?: string
  license?: string
  /** Every node, way and relation of a frame, as [lon, lat] geometry. Throws when unavailable. */
  fetchArea(bounds: readonly [number, number, number, number], signal?: AbortSignal): Promise<OsmData>
}

function attributesOf(tag: string): Record<string, string> {
  const found: Record<string, string> = {}
  const pattern = /([A-Za-z_:][-\w:.]*)\s*=\s*"([^"]*)"/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(tag))) found[match[1]!] = match[2]!
  return found
}

function tagsOf(inner: string): Record<string, string> {
  const tags: Record<string, string> = {}
  const pattern = /<tag\b([^>]*)\/?>/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(inner))) {
    const attributes = attributesOf(match[1]!)
    if (typeof attributes.k === 'string') tags[attributes.k] = attributes.v ?? ''
  }
  return tags
}

/** The OpenStreetMap XML the API returns: a flat list of nodes, ways and relations. */
export function parseOsmXml(xml: string): OsmData {
  const nodes: OsmNode[] = []
  const ways: OsmWay[] = []
  const relations: OsmRelation[] = []
  const pattern = /<(node|way|relation)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(xml))) {
    const kind = match[1]
    const attributes = attributesOf(match[2] ?? '')
    const inner = match[3] ?? ''
    if (kind === 'node') {
      const lat = Number(attributes.lat)
      const lon = Number(attributes.lon)
      if (!attributes.id || !Number.isFinite(lat) || !Number.isFinite(lon)) continue
      nodes.push({ id: attributes.id, lon, lat, tags: tagsOf(inner) })
      continue
    }
    if (kind === 'way') {
      if (!attributes.id) continue
      const refs: string[] = []
      const nd = /<nd\b([^>]*)\/?>/g
      let entry: RegExpExecArray | null
      while ((entry = nd.exec(inner))) {
        const reference = attributesOf(entry[1]!).ref
        if (typeof reference === 'string') refs.push(reference)
      }
      ways.push({ id: attributes.id, refs, tags: tagsOf(inner) })
      continue
    }
    if (!attributes.id) continue
    const members: { type: string; ref: string; role: string }[] = []
    const member = /<member\b([^>]*)\/?>/g
    let entry: RegExpExecArray | null
    while ((entry = member.exec(inner))) {
      const attributesOfMember = attributesOf(entry[1]!)
      if (typeof attributesOfMember.ref !== 'string') continue
      members.push({
        type: attributesOfMember.type ?? '',
        ref: attributesOfMember.ref,
        role: attributesOfMember.role ?? '',
      })
    }
    relations.push({ id: attributes.id, members, tags: tagsOf(inner) })
  }
  return { nodes, ways, relations }
}

/** The node coordinates of a way, in the order the way lists them. Missing nodes are dropped. */
export function wayPoints(data: OsmData, way: OsmWay): [number, number][] {
  const byId = new Map(data.nodes.map((node) => [node.id, [node.lon, node.lat] as [number, number]]))
  return way.refs.map((ref) => byId.get(ref)).filter((point): point is [number, number] => point !== undefined)
}

export const OSM_API = 'https://api.openstreetmap.org/api/0.6'

/** Wait, without blocking the import's cancel, between two attempts. */
function pause(ms: number, signal?: AbortSignal): Promise<void> {
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

/**
 * The OpenStreetMap API as a source for a frame.
 *
 * One request per frame: the API returns every node, way and relation in the bounding box, so
 * the water outlines and the mapped trees of a frame come from the same answer. The API asks for
 * a rate of at most one request a second per client, which one request per import respects.
 *
 * The API answers a burst with HTTP 429. That is transient, so one request is repeated after a
 * pause; a second failure is reported and the import falls back to the map tiles.
 */
export function osmApiArea(): OsmAreaSource {
  return {
    name: 'OpenStreetMap API',
    attribution: '© OpenStreetMap contributors · ODbL 1.0',
    url: OSM_API,
    license: 'ODbL 1.0',
    async fetchArea([west, south, east, north], signal) {
      checkAbort(signal)
      const url = `${OSM_API}/map?bbox=${west},${south},${east},${north}`
      const answer = async () => parseOsmXml(new TextDecoder().decode(await requestBytes(url, 'OpenStreetMap API', signal, 30000)))
      try {
        return await answer()
      } catch (error) {
        checkAbort(signal)
        if (!(error instanceof Error) || !/HTTP 429/.test(error.message)) throw error
        await pause(2000, signal)
        return answer()
      }
    },
  }
}
