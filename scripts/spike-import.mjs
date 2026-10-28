#!/usr/bin/env node
// C3 only: live, keyless data → existing SitePackage schema. No app integration.
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'
import { VectorTile } from '@mapbox/vector-tile'
import { PbfReader } from 'pbf'
import { featureCollection, polygon, simplify, union } from '@turf/turf'
import { createServer } from 'vite'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const USER_AGENT = 'TerraformPortfolio/0.1 (C3 keyless site import spike; architectural study)'
const TILEJSON = 'https://tiles.openfreemap.org/planet'
const ELEVATION = 'https://ws.geonorge.no/hoydedata/v1/punkt'
const ZOOM = 14
const GRID = 13
const ROAD_WIDTHS = {
  motorway: 14, trunk: 12, primary: 12, secondary: 10, tertiary: 8,
  residential: 6, unclassified: 6, living_street: 5, service: 4,
  pedestrian: 5, footway: 2.5, path: 2, cycleway: 2.5, steps: 2, track: 3,
}
const ROAD_CLASSES = { minor: 'residential', path: 'footway' }
const round = (value, places = 2) => Number(value.toFixed(places))
const same = (a, b) => a[0] === b[0] && a[1] === b[1]
const closed = (ring) => [...ring, ring[0]]

// Exact formula and argument order from build_site_packages.py.
export function metresPerDegree(latitude) {
  const phi = latitude * Math.PI / 180
  return [
    111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi),
    111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi) + 0.118 * Math.cos(5 * phi),
  ]
}
export function project(lat, lon, originLat, originLon) {
  const [latM, lonM] = metresPerDegree(originLat)
  return [(lon - originLon) * lonM, (lat - originLat) * latM]
}
function unproject(x, y, lat, lon) {
  const [latM, lonM] = metresPerDegree(lat)
  return [lat + y / latM, lon + x / lonM]
}
function area(ring) {
  return Math.abs(ring.reduce((sum, a, i) => {
    const b = ring[(i + 1) % ring.length]
    return sum + a[0] * b[1] - b[0] * a[1]
  }, 0)) / 2
}
// Sutherland–Hodgman, ported from clip_ring. Open output rings.
export function clipRing(points, extent) {
  let ring = [...points]
  if (ring.length && same(ring[0], ring.at(-1))) ring.pop()
  for (const [axis, boundary, direction] of [
    [0, extent[0], 1], [0, extent[2], -1], [1, extent[1], 1], [1, extent[3], -1],
  ]) {
    if (!ring.length) break
    const clipped = []
    let previous = ring.at(-1)
    let previousInside = direction * (previous[axis] - boundary) >= 0
    for (const current of ring) {
      const currentInside = direction * (current[axis] - boundary) >= 0
      if (currentInside !== previousInside) {
        const fraction = (boundary - previous[axis]) / (current[axis] - previous[axis])
        const other = 1 - axis
        const point = [0, 0]
        point[axis] = boundary
        point[other] = previous[other] + fraction * (current[other] - previous[other])
        clipped.push(point)
      }
      if (currentInside) clipped.push(current)
      previous = current
      previousInside = currentInside
    }
    ring = clipped.filter((point, i) => i === 0 || !same(point, clipped[i - 1]))
    if (ring.length > 1 && same(ring[0], ring.at(-1))) ring.pop()
  }
  return ring.length >= 3 ? ring : []
}
function clipSegment(a, b, extent) {
  const [minX, minY, maxX, maxY] = extent
  const dx = b[0] - a[0], dy = b[1] - a[1]
  let t0 = 0, t1 = 1
  for (const [p, q] of [[-dx, a[0] - minX], [dx, maxX - a[0]], [-dy, a[1] - minY], [dy, maxY - a[1]]]) {
    if (p === 0) {
      if (q < 0) return null
      continue
    }
    const t = q / p
    if (p < 0) t0 = Math.max(t0, t)
    else t1 = Math.min(t1, t)
    if (t0 > t1) return null
  }
  return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]]
}
export function clipPolyline(points, extent) {
  const runs = []
  let current = []
  for (let i = 1; i < points.length; i++) {
    const b = points[i]
    const clipped = clipSegment(points[i - 1], b, extent)
    if (!clipped) {
      if (current.length >= 2) runs.push(current)
      current = []
      continue
    }
    const [start, end] = clipped
    if (current.length && Math.hypot(current.at(-1)[0] - start[0], current.at(-1)[1] - start[1]) < 1e-6) {
      current.push(end)
    } else {
      if (current.length >= 2) runs.push(current)
      current = [start, end]
    }
    if (!same(end, b)) {
      runs.push(current)
      current = []
    }
  }
  if (current.length >= 2) runs.push(current)
  return runs
}
function outerRings(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates[0]]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.map((part) => part[0])
  return []
}
export function mergeRings(rings) {
  if (rings.length === 1) return rings
  const result = union(featureCollection(rings.map((ring) => polygon([closed(ring)]))))
  if (!result) throw new Error('OpenFreeMap building union returned empty geometry')
  return outerRings(result.geometry).map((ring) => ring.slice(0, -1))
}
function tileXY(lat, lon) {
  const phi = lat * Math.PI / 180
  return [Math.floor((lon + 180) / 360 * 2 ** ZOOM),
    Math.floor((1 - Math.asinh(Math.tan(phi)) / Math.PI) / 2 * 2 ** ZOOM)]
}
function tileCover(lat, lon, size) {
  const [south, west] = unproject(-size / 2, -size / 2, lat, lon)
  const [north, east] = unproject(size / 2, size / 2, lat, lon)
  if (west <= -180 || east >= 180 || south <= -85 || north >= 85) {
    throw new Error('Frame crosses the supported Web Mercator bounds; antimeridian frames are unsupported')
  }
  const [minX, maxY] = tileXY(south, west), [maxX, minY] = tileXY(north, east)
  const tiles = []
  for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) tiles.push({ x, y, z: ZOOM })
  if (tiles.length > 9) throw new Error(`Frame requires ${tiles.length} tiles; spike budget is 9`)
  return tiles
}

export function applyTerrainPolicy(samples, cols = GRID, allowFlat = false) {
  const flags = samples.map((point) => {
    if (point.z !== null && !Number.isFinite(point.z)) throw new Error('Kartverket: invalid elevation value')
    if (point.terreng === 'Havflate' || point.datakilde === 'dybdekurver') return 'water-surface'
    return point.z === null ? 'estimated' : 'measured'
  })
  const counts = Object.fromEntries(['measured', 'water-surface', 'estimated'].map((flag) => [flag, flags.filter((value) => value === flag).length]))
  const absolute = samples.map((point, index) => flags[index] === 'water-surface' ? 0 : point.z)
  // Only the work order's Stockholm fixture may replace an entirely uncovered grid.
  const flat = allowFlat && counts.estimated === samples.length
  if (flat) absolute.fill(0)
  else {
    if (counts.estimated * 100 > samples.length * 5) {
      throw new Error(`Kartverket: ${counts.estimated}/${samples.length} elevation samples missing; estimated terrain exceeds the 5% limit`)
    }
    // Freeze donors before filling: estimates must never propagate into other gaps.
    // Row-major iteration and strict < resolve ties by lowest row, then column.
    const valid = absolute.map((height, index) => ({ height, index })).filter(({ height }) => height !== null)
    for (let index = 0; index < absolute.length; index++) {
      if (flags[index] !== 'estimated') continue
      let nearestDistance = Infinity
      for (const donor of valid) {
        const distance = (Math.floor(index / cols) - Math.floor(donor.index / cols)) ** 2 + (index % cols - donor.index % cols) ** 2
        if (distance < nearestDistance) {
          nearestDistance = distance
          absolute[index] = donor.height
        }
      }
    }
  }
  return { absolute, flags, counts, flat }
}

async function main() {
  const { values } = parseArgs({ options: {
    lat: { type: 'string' }, lon: { type: 'string' }, size: { type: 'string' },
    id: { type: 'string' }, title: { type: 'string' },
  } })
  const lat = Number(values.lat), lon = Number(values.lon), size = Number(values.size), id = values.id
  if (![lat, lon, size].every(Number.isFinite) || Math.abs(lat) >= 85 || Math.abs(lon) > 180 || size < 1 || size > 800 || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(id ?? '')) {
    throw new Error('Usage: node scripts/spike-import.mjs --lat <−85…85> --lon <−180…180> --size <1…800 metres> --id <lowercase-slug> [--title <name>]')
  }
  const title = values.title ?? id
  const output = resolve(ROOT, 'tmp/spike', id)
  const extent = [-size / 2, -size / 2, size / 2, size / 2]
  const studyHalf = size * 0.35
  const wrapper = (body) => ({ schemaVersion: 1, siteId: id, ...body })
  const warnings = [], requests = [], timings = {}, checksum = createHash('sha256')
  let partialSummary = {}
  const started = performance.now()
  const timed = async (name, action) => {
    const start = performance.now()
    try {
      return await action()
    } finally {
      timings[name] = round((performance.now() - start) / 1000, 3)
      console.log(`${name}: ${timings[name]} s`)
    }
  }
  async function request(url, source, decode) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const start = performance.now()
      try {
        const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const bytes = new Uint8Array(await response.arrayBuffer())
        const result = decode(bytes)
        requests.push({ source, url, attempt: attempt + 1, bytes: bytes.length, seconds: round((performance.now() - start) / 1000, 3) })
        return { result, bytes }
      } catch (error) {
        const message = `${source}: ${error.message}${error.cause?.code ? ` (${error.cause.code})` : ''}`
        requests.push({ source, url, attempt: attempt + 1, error: message, seconds: round((performance.now() - start) / 1000, 3) })
        if (attempt === 1) throw new Error(`${message}; failed after one retry`, { cause: error })
        console.warn(`${message}; retrying in 750 ms`)
        await delay(750)
      }
    }
  }
  try {
    const json = (bytes) => JSON.parse(new TextDecoder().decode(bytes))
    const { tileTemplate, tiles } = await timed('tiles', async () => {
      const { result: meta, bytes } = await request(TILEJSON, 'OpenFreeMap TileJSON', json)
      checksum.update(bytes)
      const template = meta.tiles?.[0]
      if (typeof template !== 'string' || !['{x}', '{y}', '{z}'].every((token) => template.includes(token))) throw new Error('OpenFreeMap TileJSON: missing XYZ tile template')
      const tiles = []
      // Sequential requests keep pressure on public services low and timings reproducible.
      for (const tile of tileCover(lat, lon, size)) {
        const url = template.replace('{x}', tile.x).replace('{y}', tile.y).replace('{z}', tile.z)
        const { bytes } = await request(url, `OpenFreeMap tile ${tile.z}/${tile.x}/${tile.y}`, (value) => value)
        checksum.update(bytes)
        tiles.push({ ...tile, bytes })
      }
      return { tileTemplate: template, tiles }
    })
    const groups = new Map(), roads = [], landcover = []
    const diagnostics = { hiddenBuildings: 0, missingBuildingIds: 0, smallBuildingsDropped: 0, mergedGroups: 0, mergedFragments: 0, crossTileGroups: 0, fragmentsBeforeMerge: 0, partsAfterMerge: 0, missingHeights: 0, skippedRoadClasses: {} }
    const toLocal = (ring) => ring.map(([x, y]) => project(y, x, lat, lon).map((v) => round(v, 7)))
    await timed('decode', () => {
      for (const { bytes, x, y, z } of tiles) {
        const tile = new VectorTile(new PbfReader(bytes))
        for (const name of ['building', 'transportation', 'park', 'landcover', 'water']) {
          const layer = tile.layers[name]
          if (!layer) continue
          for (let i = 0; i < layer.length; i++) {
            const feature = layer.feature(i), props = feature.properties
            if (name === 'building' && [true, 1, 'true', '1'].includes(props.hide_3d)) { diagnostics.hiddenBuildings++; continue }
            if (name === 'transportation' && props.brunnel === 'tunnel') continue
            const geometry = feature.toGeoJSON(x, y, z).geometry
            const sourceId = feature.id === undefined ? `${x}-${y}-${i}` : String(feature.id)
            if (name === 'transportation') {
              const highway = ROAD_CLASSES[props.class] ?? props.class
              const width = ROAD_WIDTHS[highway]
              if (!width) { diagnostics.skippedRoadClasses[props.class] = (diagnostics.skippedRoadClasses[props.class] ?? 0) + 1; continue }
              const lines = geometry.type === 'LineString' ? [geometry.coordinates] : geometry.type === 'MultiLineString' ? geometry.coordinates : []
              for (const line of lines) for (const run of clipPolyline(toLocal(line), extent)) {
                roads.push({ id: `${sourceId}-${x}-${y}-${roads.length}`, highway, width, centreline: run })
              }
              continue
            }
            const rings = outerRings(geometry).map((ring) => clipRing(toLocal(ring), extent)).filter((ring) => ring.length && area(ring) > 1e-8)
            if (!rings.length) continue
            if (name === 'building') {
              if (feature.id === undefined) diagnostics.missingBuildingIds++
              const renderHeight = props.render_height, minHeight = props.render_min_height ?? 0
              if (!Number.isFinite(renderHeight) || !Number.isFinite(minHeight)) {
                diagnostics.missingHeights++
                throw new Error(`OpenFreeMap building ${sourceId}: missing/non-numeric render_height or render_min_height`)
              }
              const group = groups.get(sourceId) ?? { rings: [], tiles: new Set(), renderHeight, minHeight }
              if (group.renderHeight !== renderHeight || group.minHeight !== minHeight) throw new Error(`OpenFreeMap building ${sourceId}: conflicting heights across fragments`)
              group.rings.push(...rings)
              group.tiles.add(`${x}/${y}`)
              groups.set(sourceId, group)
            } else {
              const kind = name === 'park' ? 'park' : name === 'water' ? 'water' : ['grass', 'wood'].includes(props.class) ? props.class : null
              if (kind) for (const ring of rings) landcover.push({ id: `${name}-${sourceId}-${x}-${y}-${landcover.length}`, kind, ring })
            }
          }
        }
      }
    })
    const buildingParts = await timed('merge', () => {
      const result = []
      for (const [sourceId, group] of groups) {
        diagnostics.fragmentsBeforeMerge += group.rings.length
        if (group.tiles.size > 1) diagnostics.crossTileGroups++
        if (group.rings.length > 1) diagnostics.mergedGroups++
        const rings = mergeRings(group.rings)
        diagnostics.mergedFragments += group.rings.length - rings.length
        diagnostics.partsAfterMerge += rings.length
        for (const [part, ring] of rings.entries()) {
          // Turf simplify uses coordinate units, here local metres (not geodesic area).
          const footprint = simplify(polygon([closed(ring)]), { tolerance: 0.3, highQuality: true }).geometry.coordinates[0].slice(0, -1)
          if (area(footprint) < 12) { diagnostics.smallBuildingsDropped++; continue }
          result.push({ id: `${sourceId}-${part}`, sourceId, renderHeight: group.renderHeight, height: Math.max(2.5, group.renderHeight - group.minHeight), footprint })
        }
      }
      return result
    })
    const histogram = new Map()
    for (const building of buildingParts) histogram.set(building.renderHeight, (histogram.get(building.renderHeight) ?? 0) + 1)
    const commonHeights = [...histogram].sort((a, b) => b[1] - a[1]).map(([renderHeight, count]) => ({ renderHeight, count, share: buildingParts.length ? round(count / buildingParts.length, 4) : 0 }))
    const terrainSources = {}, terrainFlags = [], terrainFlagCounts = {}
    partialSummary = { tileCount: tiles.length, buildingsBeforeTerrain: buildingParts.length, roads: roads.length,
      landcover: Object.fromEntries(['park', 'grass', 'wood', 'water'].map((kind) => [kind, landcover.filter((a) => a.kind === kind).length])),
      diagnostics, commonRenderHeights: commonHeights.slice(0, 10), terrainSources, terrainFlags, terrainFlagCounts }

    const terrain = await timed('terrain', async () => {
      const points = []
      for (let row = 0; row < GRID; row++) for (let col = 0; col < GRID; col++) {
        const [latitude, longitude] = unproject(-size / 2 + size * col / (GRID - 1), -size / 2 + size * row / (GRID - 1), lat, lon)
        points.push([round(longitude, 8), round(latitude, 8)])
      }
      const samples = []
      for (let start = 0; start < points.length; start += 49) {
        const batch = points.slice(start, start + 49)
        const url = `${ELEVATION}?koordsys=4326&punkter=${encodeURIComponent(JSON.stringify(batch))}`
        const { result: data, bytes } = await request(url, `Kartverket elevation batch ${start / 49 + 1}`, json)
        checksum.update(bytes)
        if (!Array.isArray(data.punkter) || data.punkter.length !== batch.length) throw new Error('Kartverket: elevation response count mismatch')
        for (const point of data.punkter) {
          if (point.z !== null && !Number.isFinite(point.z)) throw new Error('Kartverket: invalid elevation value')
          terrainSources[point.datakilde ?? 'no-data'] = (terrainSources[point.datakilde ?? 'no-data'] ?? 0) + 1
          samples.push(point)
        }
      }
      const { absolute, flags, counts, flat } = applyTerrainPolicy(samples, GRID, lat === 59.316 && lon === 18.071)
      Object.assign(terrainFlagCounts, counts)
      terrainFlags.push(...Array.from({ length: GRID }, (_, row) => flags.slice(row * GRID, (row + 1) * GRID)))
      if (flat) {
        warnings.push('Kartverket returned no elevation coverage for all 169 samples; flat zero grid substituted, not measured terrain (Kartverket covers Norway).')
      }
      const originElevation = absolute[Math.floor(GRID / 2) * GRID + Math.floor(GRID / 2)]
      return wrapper({ cols: GRID, rows: GRID, minX: -size / 2, maxX: size / 2, minY: -size / 2, maxY: size / 2,
        originElevation: round(originElevation), heights: Array.from({ length: GRID }, (_, row) => absolute.slice(row * GRID, (row + 1) * GRID).map((h) => round(h - originElevation))),
        source: flat ? 'Flat zero grid — no Kartverket coverage; not measured terrain' : `Kartverket høydedata (${Object.keys(terrainSources).join(', ')}); sea cells set to water surface; missing nodes estimated within 5% cap`,
      })
    })
    const sampleHeight = (x, y) => {
      const tx = Math.max(0, Math.min(1, (x + size / 2) / size)) * (GRID - 1)
      const ty = Math.max(0, Math.min(1, (y + size / 2) / size)) * (GRID - 1)
      const x0 = Math.floor(tx), y0 = Math.floor(ty), x1 = Math.min(x0 + 1, GRID - 1), y1 = Math.min(y0 + 1, GRID - 1)
      const fx = tx - x0, fy = ty - y0, h = terrain.heights
      return h[y0][x0] * (1 - fx) * (1 - fy) + h[y0][x1] * fx * (1 - fy) + h[y1][x0] * (1 - fx) * fy + h[y1][x1] * fx * fy
    }
    const buildings = buildingParts.map(({ id, height, footprint }) => {
      const centroid = [0, 1].map((axis) => footprint.reduce((sum, p) => sum + p[axis], 0) / footprint.length)
      return { id, kind: 'other', height, baseElevation: round(Math.min(...[...footprint, centroid].map(([x, y]) => sampleHeight(x, y))) - 0.3),
        area: round(area(footprint), 1), withinStudyArea: centroid.every((v) => Math.abs(v) <= studyHalf), footprint }
    })
    const studyArea = wrapper({ label: 'Study area — not a cadastral parcel', polygon: closed([[-studyHalf, -studyHalf], [studyHalf, -studyHalf], [studyHalf, studyHalf], [-studyHalf, studyHalf]]) })
    const diagonal = Math.hypot(studyHalf * 2, studyHalf * 2), distance = diagonal * 1.7, direction = Math.sqrt(1 + 1.15 ** 2 + 1)
    const preset = (position, target = [0, 0, 8], fov = 32) => ({ position, target, projection: 'perspective', fov })
    const acquiredAt = new Date().toISOString()
    const flat = terrain.source.startsWith('Flat')
    const sources = [
      { title: 'OpenFreeMap / OpenMapTiles / OpenStreetMap context', url: TILEJSON, license: 'ODbL 1.0', attribution: '© OpenMapTiles © OpenStreetMap contributors · tiles by OpenFreeMap', acquiredAt },
      { title: flat ? 'Kartverket elevation coverage check — no terrain supplied' : 'Kartverket høydedata terrain / modelled water surface', url: ELEVATION, license: 'CC BY 4.0', attribution: '© Kartverket', acquiredAt },
    ]
    const manifest = {
      schemaVersion: 1, id, title, subtitle: 'OpenStreetMap context · heights partly estimated · not survey data',
      description: 'Live import spike, clipped to an authored square frame; no cadastral or planning data.', morphology: 'Imported urban context',
      location: { latitude: lat, longitude: lon, timeZone: Math.abs(lat - 59.316) < 0.1 && Math.abs(lon - 18.071) < 0.2 ? 'Europe/Stockholm' : Math.abs(lat - 59.92) < 0.1 && Math.abs(lon - 10.75) < 0.2 ? 'Europe/Oslo' : 'UTC' },
      crs: { sourceEPSG: 'EPSG:4326', horizontalDatum: 'WGS84', verticalDatum: flat ? 'Unreferenced flat zero plane' : 'NN2000', originLatitude: lat, originLongitude: lon, originElevation: terrain.originElevation, projection: 'local-tangent-plane-wgs84' },
      unit: 'm', dataStatus: 'curated-demo',
      assetPaths: { terrain: 'terrain.json', buildings: 'buildings.json', studyArea: 'study-area.json', thumbnail: 'thumbnail.svg', attribution: 'attribution.md', roads: 'roads.json', trees: 'trees.json', landcover: 'landcover.json' },
      constraints: { maxHeightMeters: 18, setbackMeters: 4, label: 'Illustrative — not planning advice' },
      cameraPresets: {
        isometric: preset([round(distance / direction), round(-distance * 1.15 / direction), round(distance / direction)]),
        top: preset([0, -0.01, round(diagonal * 2.25)], [0, 0, 0]),
        north: preset([0, round(-diagonal * 1.35), round(diagonal * 0.62)]),
        south: preset([0, round(diagonal * 1.35), round(diagonal * 0.62)]),
        eyeLevel: preset([round(diagonal * 0.8), round(-diagonal * 0.9), 16], [0, 0, 8], 34),
      }, sources,
      simplified: [
        'OpenMapTiles render_height (partly estimated) minus render_min_height; minimum extrusion 2.5 m; all kinds other.',
        'Outer rings only; holes omitted. Same-ID building fragments unioned in local ENU, simplified at 0.3 m, parts below 12 m² omitted.',
        'Buildings seated at minimum bilinear terrain height over footprint vertices and vertex-average centroid, minus 0.3 m; raised building parts are grounded.',
        flat ? terrain.source : `Kartverket terrain sampled on a 13 × 13 grid (${round(size / 12)} m spacing), recentered to origin elevation.`,
        flat ? '169 of 169 terrain samples replaced by an unmeasured flat zero grid (Stockholm fixture exception); no valid neighbours available.' : `${terrainFlagCounts.estimated} of 169 terrain samples estimated from nearest valid neighbours in grid distance (ties: lowest row, then column; maximum 5%); ${terrainFlagCounts['water-surface']} sea samples set to mean sea level.`,
        'Sea cells (Havflate or dybdekurver) use a modelled water surface at 0 m NN2000 mean sea level before recentring; sea-floor depth is not modelled.',
        'Study area is the frame inset 15% on every side, not a cadastral parcel. Constraints 18 m / 4 m are illustrative defaults, not regulations.',
        'Roads clipped with illustrative class widths; tunnels omitted. Road and land-cover fragments are not deduplicated across tile buffers.',
        'No tree points in tiles: trees list intentionally empty. Land cover uses park, grass, wood and water outer rings.',
        'curated-demo is a temporary parser compatibility value, not a claim of curation; P2 needs user-import.',
        'Time zone is assigned for the Oslo/Stockholm fixture neighbourhoods only; other frames use UTC pending P2 lookup.',
        ...warnings,
      ], statistics: { buildingCount: buildings.length, terrainSamples: GRID * GRID, studyAreaM2: round((studyHalf * 2) ** 2, 1), sourceChecksum: checksum.digest('hex') },
    }
    const files = {
      'manifest.json': manifest, 'terrain.json': terrain, 'buildings.json': wrapper({ buildings }),
      'study-area.json': studyArea, 'roads.json': wrapper({ roads }), 'trees.json': wrapper({ trees: [] }), 'landcover.json': wrapper({ areas: landcover }),
    }
    await timed('validate', async () => {
      // Load the actual TS parsers with the installed Vite toolchain; no parser copies or src edits.
      const server = await createServer({ root: ROOT, configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, cacheDir: resolve(ROOT, 'tmp/spike/.vite'), server: { middlewareMode: true, watch: null, hmr: false } })
      try {
        const parsers = await server.ssrLoadModule('/src/features/sites/package.ts')
        const { parseSiteManifest } = await server.ssrLoadModule('/src/features/sites/manifest.ts')
        parseSiteManifest(manifest)
        for (const [name, fn] of [['terrain.json', 'parseTerrain'], ['buildings.json', 'parseBuildings'], ['study-area.json', 'parseStudyArea'], ['roads.json', 'parseRoads'], ['trees.json', 'parseTrees'], ['landcover.json', 'parseLandCover']]) parsers[fn](files[name])
        for (const [name, file] of Object.entries(files)) {
          if (name !== 'manifest.json' && file.siteId !== id) throw new Error(`${name}: siteId mismatch`)
        }
        if (manifest.statistics.buildingCount !== buildings.length || manifest.statistics.terrainSamples !== terrain.rows * terrain.cols || Math.abs(manifest.statistics.studyAreaM2 - area(studyArea.polygon)) > 1) throw new Error('Manifest statistics mismatch')
      } finally { await server.close() }
    })
    const attribution = `# ${title} — spike data attribution\n\n${sources.map((s) => `${s.attribution}. ${s.license}. ${s.url}\nFetched: ${s.acquiredAt}`).join('\n\n')}\n\nDerived OSM context is provided under ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/\nOSM attribution: https://www.openstreetmap.org/copyright\nKartverket terms: https://www.kartverket.no/api-og-data/vilkar-for-bruk/\nCC BY 4.0: https://creativecommons.org/licenses/by/4.0/\nTile snapshot: ${tileTemplate}\n\n${manifest.simplified.map((line) => `- ${line}`).join('\n')}\n`
    const thumbnail = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-size / 2} ${-size / 2} ${size} ${size}"><title>Imported footprint plan; north up</title><rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" fill="#f3f2ee"/><g transform="scale(1,-1)" fill="#b7b9b6">${buildings.map((b) => `<polygon points="${b.footprint.map((p) => p.map((v) => round(v)).join(',')).join(' ')}"/>`).join('')}</g></svg>\n`
    let outputBytes = 0
    await timed('write', async () => {
      await mkdir(output, { recursive: true })
      for (const [name, body] of Object.entries({ ...Object.fromEntries(Object.entries(files).map(([name, data]) => [name, `${JSON.stringify(data, null, 2)}\n`])), 'attribution.md': attribution, 'thumbnail.svg': thumbnail })) {
        await writeFile(resolve(output, name), body)
        outputBytes += Buffer.byteLength(body)
      }
    })
    const summary = {
      id, acquiredAt, frame: { lat, lon, size }, tileTemplate, tileCount: tiles.length, timings,
      totalSeconds: round((performance.now() - started) / 1000, 3), buildings: buildings.length, roads: roads.length,
      landcover: Object.fromEntries(['park', 'grass', 'wood', 'water'].map((kind) => [kind, landcover.filter((a) => a.kind === kind).length])),
      trees: 0, terrainSource: terrain.source, terrainSources, terrainFlags, terrainFlagCounts, outputBytes, outputKB: round(outputBytes / 1000),
      diagnostics, commonRenderHeights: commonHeights.slice(0, 10), suspiciousDefaultShare: commonHeights[0] ?? null,
      heightMetricNote: 'Modal render_height share among emitted building parts, after clipping/merge/filtering; a suspicion metric, not evidence of estimated/tagged provenance.',
      warnings, requests, validation: 'Existing parseSiteManifest + all six asset parsers passed; IDs and statistics cross-checked',
    }
    await writeFile(resolve(output, 'spike-summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
    const { requests: requestDetails, ...printedSummary } = summary
    console.log(JSON.stringify({ ...printedSummary, requestCount: requestDetails.length, requestFailures: requestDetails.filter((request) => request.error) }, null, 2))
  } catch (error) {
    await mkdir(output, { recursive: true })
    await writeFile(resolve(output, 'spike-failure.json'), `${JSON.stringify({ id, error: error.message, ...partialSummary, timings, elapsedSeconds: round((performance.now() - started) / 1000, 3), requests, warnings }, null, 2)}\n`)
    throw error
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`Site import failed: ${error.message}`); process.exitCode = 1 })
}
