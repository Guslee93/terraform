import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { noiseFromGeoJson, noiseRequestUrl } from '../import/officialNoise'
import { parseSiteManifest } from '../sites/manifest'
import { parseRoads } from '../sites/package'
import { siteLayers } from '../sites/provenance'
import { bandLabel, bandLookup, bandShares, footprintInSensitiveBand, largestBand, noiseSourceLine, NOISE_SENSITIVE_NOTE, OFFICIAL_NOISE_NOTE, parseOfficialNoise, type NoisePolygon } from './officialNoise'

const square = (x0: number, y0: number, x1: number, y1: number): Vec2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const area = square(0, 0, 100, 100)
// A 55 band over the whole area with a building-shaped hole, and a nested 65 band along one edge.
const withHole: NoisePolygon = { metric: 'Lden', bandLow: 55, rings: [square(0, 0, 100, 100), square(40, 40, 60, 60)] }
const nested: NoisePolygon = { metric: 'Lden', bandLow: 65, rings: [square(0, 0, 100, 20)] }

describe('band lookup', () => {
  const lookup = bandLookup([withHole, nested], 'Lden')
  it('finds the band at a point and treats a hole as outside (even-odd)', () => {
    expect(lookup(10, 50)).toBe(55)
    expect(lookup(50, 50)).toBeNull()
    expect(lookup(150, 50)).toBeNull()
  })
  it('takes the highest band where bands are nested', () => {
    expect(lookup(50, 10)).toBe(65)
  })
  it('keeps the metrics apart', () => {
    expect(bandLookup([withHole, nested], 'Lnight')(10, 50)).toBeNull()
  })
})

describe('band shares over open ground', () => {
  it('counts each band, leaves buildings out and reports the unmapped ground', () => {
    const noise = { dataYear: 2021, polygons: [{ ...withHole, rings: [square(0, 0, 50, 100)] }, nested] }
    const shares = bandShares(noise, 'Lden', area, [{ height: 10, footprint: square(60, 60, 100, 100) }], 10)
    // 100 cells − 16 in the building = 84 open. 65: y < 20 → 20 cells. 55: x < 50, y ≥ 20 → 40. Rest: 24.
    expect(shares.assessed).toBe(84)
    expect(shares.bands).toEqual([{ bandLow: 55, count: 40, share: 40 / 84 }, { bandLow: 65, count: 20, share: 20 / 84 }])
    expect(shares.unmapped).toEqual({ count: 24, share: 24 / 84 })
    expect(shares.mapped).toBe(true)
    expect(largestBand(shares)?.bandLow).toBe(55)
  })
  it('an empty tile is "not mapped", never a band', () => {
    const shares = bandShares({ dataYear: 2021, polygons: [] }, 'Lden', area, [], 10)
    expect(shares).toMatchObject({ mapped: false, bands: [], unmapped: { count: 100, share: 1 } })
    expect(largestBand(shares)).toBeNull()
    expect(bandShares(null, 'Lden', area, [], 10).mapped).toBe(false)
  })
})

describe('what the studio may say', () => {
  it('labels bands, with the top band open-ended', () => {
    expect([50, 55, 70, 75].map(bandLabel)).toEqual(['50–55 dB', '55–60 dB', '70–75 dB', '75 dB and above'])
  })
  it('names the source, the year from the data, the 5 dB bands and the limitation', () => {
    expect(noiseSourceLine('Lden', 2021)).toBe('Road noise, Lden 2021 (Statens vegvesen strategic noise map, CNOSSOS-EU). 5 dB bands. Not for assessing individual buildings.')
    expect(OFFICIAL_NOISE_NOTE).toContain('Not for assessing individual buildings.')
    // Never the planning-zone word, never a verdict.
    for (const text of [noiseSourceLine('Lnight', 2021), OFFICIAL_NOISE_NOTE, NOISE_SENSITIVE_NOTE]) expect(text).not.toMatch(/støysone|compliant|acceptable|quiet/i)
  })
  it('a drawn block in a band of 55 or more triggers a yes, and nothing below does', () => {
    const lookup = bandLookup([{ metric: 'Lden', bandLow: 50, rings: [square(0, 0, 100, 100)] }, { metric: 'Lden', bandLow: 55, rings: [square(0, 0, 100, 20)] }], 'Lden')
    expect(footprintInSensitiveBand(lookup, square(30, 40, 50, 60))).toBe(false)
    // Only an edge reaches into the 55 band.
    expect(footprintInSensitiveBand(lookup, square(30, 15, 50, 60))).toBe(true)
    expect(footprintInSensitiveBand(bandLookup([], 'Lden'), square(30, 15, 50, 60))).toBe(false)
  })
})

describe('parseOfficialNoise', () => {
  const file = { schemaVersion: 1, siteId: 'demo', dataYear: 2021, polygons: [{ metric: 'Lden', bandLow: 55, rings: [square(0, 0, 10, 10)] }] }
  it('reads a valid file', () => {
    expect(parseOfficialNoise(file)).toMatchObject({ siteId: 'demo', dataYear: 2021, polygons: [{ metric: 'Lden', bandLow: 55 }] })
  })
  it('rejects a missing year, an unknown metric, a band that is not a 5 dB step and a degenerate ring', () => {
    expect(() => parseOfficialNoise({ ...file, dataYear: undefined })).toThrow(/dataYear/)
    expect(() => parseOfficialNoise({ ...file, polygons: [{ metric: 'Lday', bandLow: 55, rings: [square(0, 0, 1, 1)] }] })).toThrow(/metric/)
    expect(() => parseOfficialNoise({ ...file, polygons: [{ metric: 'Lden', bandLow: 57, rings: [square(0, 0, 1, 1)] }] })).toThrow(/bandLow/)
    expect(() => parseOfficialNoise({ ...file, polygons: [{ metric: 'Lden', bandLow: 55, rings: [[[0, 0], [1, 1]]] }] })).toThrow(/three points/)
  })
})

describe('converter from the WFS answer', () => {
  const origin = { latitude: 59.9235, longitude: 10.758 }
  const feature = (band: string, year: string, coordinates: number[][][]) => ({ type: 'Feature', properties: { 'STØYINTERVALL': band, 'BEREGNETÅR': year }, geometry: { type: 'Polygon', coordinates } })
  // About 111 m × 56 m around the origin, with a small hole.
  const outline = [[10.757, 59.923], [10.759, 59.923], [10.759, 59.924], [10.757, 59.924], [10.757, 59.923]]
  const hole = [[10.7578, 59.9234], [10.7582, 59.9234], [10.7582, 59.9236], [10.7578, 59.9236], [10.7578, 59.9234]]
  it('places every vertex with the app projection, keeps holes and reads the year from the features', () => {
    const { polygons, dataYear } = noiseFromGeoJson({ features: [feature('60', '2021', [outline, hole])] }, 'Lden', origin, [-300, -300, 300, 300])
    expect(dataYear).toBe(2021)
    expect(polygons).toHaveLength(1)
    expect(polygons[0]).toMatchObject({ metric: 'Lden', bandLow: 60 })
    expect(polygons[0]!.rings).toHaveLength(2)
    const xs = polygons[0]!.rings[0]!.map((point) => point[0])
    const ys = polygons[0]!.rings[0]!.map((point) => point[1])
    // 0.001° of longitude at 59.92° N is 55.9 m; 0.0005° of latitude is 55.7 m.
    expect(Math.min(...xs)).toBeCloseTo(-55.9, 0)
    expect(Math.max(...xs)).toBeCloseTo(55.9, 0)
    expect(Math.min(...ys)).toBeCloseTo(-55.7, 0)
    expect(bandLookup(polygons, 'Lden')(0, 0)).toBeNull() // the hole
    expect(bandLookup(polygons, 'Lden')(40, 0)).toBe(60)
  })
  it('clips a feature that runs past the extent, and drops one wholly outside it', () => {
    const { polygons } = noiseFromGeoJson({ features: [feature('55', '2021', [outline]), feature('65', '2021', [outline.map(([lon, lat]) => [lon! + 0.1, lat!])])] }, 'Lden', origin, [-20, -20, 20, 20])
    expect(polygons).toHaveLength(1)
    const points = polygons[0]!.rings.flat()
    expect(Math.max(...points.map((point) => Math.abs(point[0])))).toBeLessThanOrEqual(20)
    expect(Math.max(...points.map((point) => Math.abs(point[1])))).toBeLessThanOrEqual(20)
  })
  it('an empty answer is no map, and mixed years are refused', () => {
    expect(noiseFromGeoJson({ features: [] }, 'Lden', origin, [-20, -20, 20, 20])).toEqual({ polygons: [], dataYear: null })
    expect(() => noiseFromGeoJson({ features: [feature('55', '2021', [outline]), feature('55', '2016', [outline])] }, 'Lden', origin, [-300, -300, 300, 300])).toThrow(/more than one calculation year/)
    expect(() => noiseFromGeoJson({ features: [feature('abc', '2021', [outline])] }, 'Lden', origin, [-300, -300, 300, 300])).toThrow(/unexpected band/)
  })
  it('asks the service for WGS84 so no UTM offset is ever used as ENU', () => {
    const url = noiseRequestUrl('Lnight', [10.75, 59.92, 10.76, 59.93])
    expect(url).toContain('typeNames=norstoy_1_0:Strategiskstoykart_lnight')
    expect(url).toContain('srsName=EPSG:4326')
    expect(url).toContain('bbox=10.7500000,59.9200000,10.7600000,59.9300000,EPSG:4326')
  })
})

describe('shipped noise layers (ADR-0034)', () => {
  const read = (site: string, name: string): unknown => JSON.parse(readFileSync(`public/sites/${site}/${name}`, 'utf8'))
  it.each(['compact-infill', 'sloped-edge'])('%s: bands, year and provenance are in the package', (site) => {
    const noise = parseOfficialNoise(read(site, 'noise.json'))
    expect(noise.siteId).toBe(site)
    expect(noise.dataYear).toBe(2021)
    const manifest = parseSiteManifest(read(site, 'manifest.json'))
    expect(manifest.assetPaths.noise).toBe('noise.json')
    const layer = siteLayers(manifest).layers.find((entry) => entry.id === 'noise')
    expect(layer).toMatchObject({ owner: 'Statens vegvesen', licence: 'NLOD 1.0', dataYear: 2021 })
    expect(layer?.useLimitation).toContain('Datasettet skal ikke brukes til å vurdere behov for tiltak på enkeltbygg')
    expect(layer?.attribution).toBe('Contains data under the Norwegian licence for Open Government data (NLOD) distributed by Statens vegvesen')
  })

  // Registration gate (feasibility 09 §1): the major roads lie inside the ≥ 65 dB band. Measured
  // 2026-11-15: 100 % of 142 samples at zero shift, 99–100 % at ±8 m, 9–22 % at ±20 m diagonal shifts.
  it('Compact Infill: at least 90 % of major-road samples are in the ≥ 65 band at zero shift', () => {
    const noise = parseOfficialNoise(read('compact-infill', 'noise.json'))
    const lookup = bandLookup(noise.polygons, 'Lden')
    const roads = parseRoads(read('compact-infill', 'roads.json')).roads.filter((road) => ['primary', 'secondary', 'trunk', 'motorway'].includes(road.highway))
    const samples: Vec2[] = []
    for (const road of roads) {
      road.centreline.forEach((a, index) => {
        const b = road.centreline[index + 1]
        if (!b) return
        const steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 5))
        for (let step = 0; step < steps; step += 1) samples.push([a[0] + ((b[0] - a[0]) * step) / steps, a[1] + ((b[1] - a[1]) * step) / steps])
      })
    }
    // Stay 15 m inside the clipped extent, where the map is complete.
    const inner = samples.filter(([x, y]) => Math.abs(x) < 295 && Math.abs(y) < 350)
    expect(inner.length).toBeGreaterThan(100)
    const share = (dx: number, dy: number) => inner.filter(([x, y]) => (lookup(x + dx, y + dy) ?? 0) >= 65).length / inner.length
    expect(share(0, 0)).toBeGreaterThanOrEqual(0.9)
    // Where a road runs, the band is wide; a 20 m shift across it loses the alignment.
    expect(share(0, 0)).toBeGreaterThan(Math.max(share(20, 20), share(-20, -20), share(20, -20), share(-20, 20)))
  })
})
