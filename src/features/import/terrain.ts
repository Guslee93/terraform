import type { ImportFrame } from './frame'
import { unproject } from './projection'
import { abortable, checkAbort, requestBytes } from './request'

export type TerrainSample = { height: number | null; kind: 'land' | 'water' }
export interface TerrainProvider {
  name: string
  attribution: string
  covers(lat: number, lon: number): boolean
  sample(points: [lon: number, lat: number][], signal?: AbortSignal): Promise<TerrainSample[]>
  /** Optional provenance; custom providers without it are explicitly unreferenced. */
  url?: string
  license?: string
  verticalDatum?: string
}
export const GRID_SIZE = 13
export const KARTVERKET_URL = 'https://ws.geonorge.no/hoydedata/v1/punkt'
export const TERRARIUM_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'

/** Coarse country boxes, not political boundaries. DK mainland is split from Bornholm
 * to keep Malmö out of the Copenhagen box. Overlaps prefer FI, DK, SE, then NO.
 * Border regions can be misclassified; the manifest discloses this approximation. */
export function timeZoneFor(latitude: number, longitude: number): string {
  const within = (w: number, s: number, e: number, n: number) => longitude >= w && longitude <= e && latitude >= s && latitude <= n
  // Finland as stepped boxes following the Gulf of Bothnia, the Torne valley and the northern arm,
  // so Norrland (Umeå, Luleå, Kiruna) and Finnmark (Alta, Kirkenes) stay on CET.
  if (within(19.3,59.7,31.6,63) || within(21,63,31.6,64.5) || within(24,64.5,31.6,65.7) || within(23.6,65.7,31.6,68.4) ||
    within(20.5,68.4,22.5,69.1) || within(22.5,68.4,24.5,68.7) || within(24.5,68.4,28.9,69.4) || within(25.8,69.4,28,70.1)) return 'Europe/Helsinki'
  if (within(8,54.5,11.3,57.8) || within(11.3,54.5,12.7,56.3) || within(14.6,54.95,15.2,55.35)) return 'Europe/Copenhagen'
  if (within(10.9,55.3,24.2,69.1)) return 'Europe/Stockholm'
  if (within(4,57.9,31.5,71.5)) return 'Europe/Oslo'
  return 'UTC'
}
export function terrainPoints(frame: ImportFrame): [number, number][] {
  return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
    const row = Math.floor(index / GRID_SIZE), col = index % GRID_SIZE
    const [lat, lon] = unproject(-frame.sizeMetres / 2 + frame.sizeMetres * col / (GRID_SIZE - 1), -frame.sizeMetres / 2 + frame.sizeMetres * row / (GRID_SIZE - 1), frame.latitude, frame.longitude)
    // Same rounding as C3 and the recorded requests.
    return [Number(lon.toFixed(8)), Number(lat.toFixed(8))]
  })
}
export function parseKartverketSamples(value: unknown, points: readonly [number, number][]): TerrainSample[] {
  if (typeof value !== 'object' || value === null || !('punkter' in value) || !Array.isArray(value.punkter) || value.punkter.length !== points.length) throw new Error('Kartverket: elevation response count mismatch')
  return value.punkter.map((entry: unknown, index) => {
    if (typeof entry !== 'object' || entry === null || !('z' in entry) || (entry.z !== null && (typeof entry.z !== 'number' || !Number.isFinite(entry.z)))) throw new Error('Kartverket: invalid elevation value')
    const point = points[index]!
    if (!('x' in entry) || !('y' in entry) || typeof entry.x !== 'number' || typeof entry.y !== 'number' || Math.abs(entry.x - point[0]) > 1e-7 || Math.abs(entry.y - point[1]) > 1e-7 || !Number.isFinite(entry.x) || !Number.isFinite(entry.y)) throw new Error('Kartverket: elevation response coordinates/order mismatch')
    const water = ('terreng' in entry && entry.terreng === 'Havflate') || ('datakilde' in entry && entry.datakilde === 'dybdekurver')
    return { height: entry.z, kind: water ? 'water' : 'land' }
  })
}
export function kartverketProvider(): TerrainProvider {
  return {
    name: 'Kartverket høydedata', attribution: '© Kartverket · CC BY 4.0', url: KARTVERKET_URL, license: 'CC BY 4.0', verticalDatum: 'NN2000',
    // Coverage hint only: the bbox also intersects neighbouring countries.
    covers: (lat,lon) => lat >= 57.9 && lat <= 71.5 && lon >= 4 && lon <= 31.5,
    async sample(points, signal) {
      checkAbort(signal)
      const samples: TerrainSample[] = []
      for (let start = 0; start < points.length; start += 49) {
        const batch = points.slice(start,start+49)
        const buffer = await requestBytes(`${KARTVERKET_URL}?koordsys=4326&punkter=${encodeURIComponent(JSON.stringify(batch))}`, 'Kartverket elevation', signal)
        checkAbort(signal)
        const data: unknown = JSON.parse(new TextDecoder().decode(buffer))
        samples.push(...parseKartverketSamples(data,batch))
      }
      return samples
    },
  }
}
export type TerrainGrid = {
  absolute: number[]
  flags: ('measured' | 'water-surface' | 'estimated')[]
  counts: { measured: number; water: number; estimated: number }
}
export class TerrainPolicyError extends Error {
  constructor(message: string, readonly reason: 'all-null' | 'too-many-estimates' | 'invalid') { super(message); this.name = 'TerrainPolicyError' }
}
/** Row-major samples. Estimates use original donors only; scanning ascending index
 * gives the required lowest-row, then lowest-column tie break. Flat fallback is
 * deliberately NOT implemented here: only the provider coordinator may choose it. */
export function buildTerrainGrid(samples: readonly TerrainSample[], policy: { rows?: number; cols?: number; source?: string } = {}): TerrainGrid {
  const { rows = GRID_SIZE, cols = GRID_SIZE, source = 'Terrain' } = policy
  const fail = (message: string, reason: TerrainPolicyError['reason']): never => { throw new TerrainPolicyError(`${source}: ${message}`, reason) }
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 2 || cols < 2 || samples.length !== rows * cols) fail('grid dimensions/count mismatch','invalid')
  for (const sample of samples) {
    if (!sample || !['land','water'].includes(sample.kind) || (sample.height !== null && (typeof sample.height !== 'number' || !Number.isFinite(sample.height)))) fail('invalid terrain sample','invalid')
  }
  const values = samples.map(s => s.kind === 'water' ? 0 : s.height)
  const donors = values.flatMap((height,index) => height === null ? [] : [{height,index}])
  if (!donors.length) fail('all terrain samples are null','all-null')
  const missing = values.length - donors.length
  if (missing / samples.length > 0.05) fail(`${missing} of ${samples.length} terrain samples need estimation (exceeds 5%)`,'too-many-estimates')
  const flags: TerrainGrid['flags'] = samples.map(s => s.kind === 'water' ? 'water-surface' : s.height === null ? 'estimated' : 'measured')
  const absolute = values.map((height,index) => {
    if (height !== null) return height
    let best = donors[0]!, bestDistance = Infinity
    for (const donor of donors) {
      const distance = (Math.floor(index/cols) - Math.floor(donor.index/cols)) ** 2 + (index%cols - donor.index%cols) ** 2
      if (distance < bestDistance) { best = donor; bestDistance = distance }
    }
    return best.height
  })
  return { absolute, flags, counts: { measured: flags.filter(f=>f==='measured').length, water: flags.filter(f=>f==='water-surface').length, estimated: missing } }
}
export type TerrariumRaster = { width: number; height: number; heights: Float64Array }
export function decodeTerrarium(rgba: Uint8ClampedArray, width: number, height: number): TerrariumRaster {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || rgba.length !== width * height * 4) throw new Error('Terrarium: invalid pixel dimensions')
  const heights = new Float64Array(width * height)
  for (let index = 0; index < heights.length; index++) {
    const offset = index * 4
    heights[index] = rgba[offset+3] === 255 ? rgba[offset]! * 256 + rgba[offset+1]! + rgba[offset+2]! / 256 - 32768 : NaN
  }
  return { width, height, heights }
}
/** Pixel-centre coordinates. Edge clamping also supports a 1×1 synthetic tile. */
export function sampleTerrarium(raster: TerrariumRaster, x: number, y: number): number | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Terrarium: invalid sample coordinate')
  const px = Math.max(0, Math.min(raster.width-1,x)), py = Math.max(0,Math.min(raster.height-1,y))
  const x0 = Math.floor(px), y0 = Math.floor(py), x1 = Math.min(x0+1,raster.width-1), y1 = Math.min(y0+1,raster.height-1)
  const fx = px-x0, fy = py-y0
  const corners = [[x0,y0,(1-fx)*(1-fy)],[x1,y0,fx*(1-fy)],[x0,y1,(1-fx)*fy],[x1,y1,fx*fy]]
  let result = 0
  for (const [cx,cy,weight] of corners) {
    if (!weight) continue
    const value = raster.heights[cy!*raster.width+cx!]!
    if (!Number.isFinite(value)) return null
    result += value*weight
  }
  return result
}
/** Browser-only adapter. PNG decoding needs createImageBitmap + OffscreenCanvas;
 * the pure Terrarium arithmetic above is independently tested without a renderer. */
async function pngPixels(buffer: ArrayBuffer, signal?: AbortSignal): Promise<TerrariumRaster> {
  checkAbort(signal)
  const bitmap = await createImageBitmap(new Blob([buffer], {type:'image/png'}), {colorSpaceConversion:'none', premultiplyAlpha:'none'})
  try {
    checkAbort(signal)
    const canvas = new OffscreenCanvas(bitmap.width,bitmap.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Terrarium: OffscreenCanvas 2D context unavailable')
    context.drawImage(bitmap,0,0)
    const pixels = context.getImageData(0,0,bitmap.width,bitmap.height)
    return decodeTerrarium(pixels.data,bitmap.width,bitmap.height)
  } finally { bitmap.close() }
}
export function terrariumProvider(): TerrainProvider {
  return {
    name: 'AWS Terrain Tiles (Terrarium)', attribution: 'Mapzen Terrain Tiles · multiple elevation sources: https://github.com/tilezen/joerd/blob/master/docs/attribution.md',
    url: TERRARIUM_URL, license: 'Multiple source licences; see Mapzen Terrain Tiles attribution', verticalDatum: 'Source-dependent Terrain Tiles elevations; not NN2000',
    covers: (lat,lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat)<85 && Math.abs(lon)<180,
    async sample(points,signal) {
      checkAbort(signal)
      // Per-sample-call cache: no cross-import signals or stale tile promises.
      const rasters = new Map<string,TerrariumRaster>()
      const samples: TerrainSample[] = []
      for (const [lon,lat] of points) {
        checkAbort(signal)
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>=85 || Math.abs(lon)>=180) throw new Error('Terrarium: coordinate outside coverage')
        const tx = (lon+180)/360*16384, ty = (1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*16384
        const x = Math.floor(tx), y = Math.floor(ty), key = `${x}/${y}`
        let raster = rasters.get(key)
        if (!raster) {
          const buffer = await requestBytes(`${TERRARIUM_URL}/14/${key}.png`,'AWS Terrain Tiles',signal)
          checkAbort(signal)
          raster = await abortable(()=>pngPixels(buffer,signal),signal)
          checkAbort(signal)
          rasters.set(key,raster)
        }
        // Pixel centres lie half a pixel inside the XYZ tile edges.
        // Terrarium carries bathymetry: below 0 m is sea floor, modelled (like Kartverket's sea) as a 0 m water surface.
        // ponytail: also flags rare below-sea-level land (polders) as water; add a water mask if such sites matter.
        const height = sampleTerrarium(raster,(tx-x)*raster.width-0.5,(ty-y)*raster.height-0.5)
        samples.push(height !== null && height < 0 ? {height:0,kind:'water'} : {height,kind:'land'})
      }
      return samples
    },
  }
}
