import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { PARCEL_MAX_FEATURES, parcelRequestUrl, parcelsFromGml } from '../import/parcels'
import { parseSiteManifest } from '../sites/manifest'
import { siteLayers } from '../sites/provenance'
import { parcelLinePositions, PARCEL_LIFT_M } from '../../scene/ParcelLines'
import { parcelArea, parcelAt, parseParcels, type Parcel } from './parcels'

const square = (x0: number, y0: number, x1: number, y1: number): Vec2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const parcel = (id: string, rings: Vec2[][], matrikkel: string | null = `0301-1/${id}`): Parcel => ({ id, matrikkel, updated: '2020-06-16', rings })

describe('parcel area and lookup', () => {
  const big = parcel('big', [square(0, 0, 100, 100), square(40, 40, 60, 60)])
  const inner = parcel('inner', [square(40, 40, 60, 60)])
  it('area is the outline minus its holes (shoelace)', () => {
    expect(parcelArea(big)).toBeCloseTo(10_000 - 400, 9)
    expect(parcelArea(inner)).toBeCloseTo(400, 9)
    expect(parcelArea(parcel('tri', [[[0, 0], [10, 0], [0, 10]]]))).toBeCloseTo(50, 9)
  })
  it('finds the parcel at a point; a hole belongs to the parcel inside it; open ground has none', () => {
    expect(parcelAt([big, inner], 10, 10)?.id).toBe('big')
    expect(parcelAt([big, inner], 50, 50)?.id).toBe('inner')
    expect(parcelAt([big], 50, 50)).toBeNull()
    expect(parcelAt([big, inner], 500, 500)).toBeNull()
  })
  it('takes the smallest parcel where two overlap', () => {
    expect(parcelAt([parcel('wide', [square(0, 0, 100, 100)]), parcel('small', [square(10, 10, 20, 20)])], 15, 15)?.id).toBe('small')
  })
})

describe('parseParcels', () => {
  it('reads parcels with and without a property number, and rejects a degenerate ring', () => {
    const file = { schemaVersion: 1, siteId: 'demo', parcels: [{ id: 'a', matrikkel: '0301-228/255', updated: '2020-06-16', rings: [square(0, 0, 10, 10)] }, { id: 'b', matrikkel: null, updated: null, rings: [square(0, 0, 1, 1)] }] }
    expect(parseParcels(file).parcels.map((p) => p.matrikkel)).toEqual(['0301-228/255', null])
    expect(() => parseParcels({ ...file, parcels: [{ id: 'a', rings: [[[0, 0], [1, 1]]] }] })).toThrow(/three points/)
    expect(() => parseParcels({ ...file, schemaVersion: 2 })).toThrow(/schema/)
  })
})

describe('converter from the WFS answer', () => {
  const origin = { latitude: 59.9235, longitude: 10.758 }
  const member = (id: string, body: string, numbers = '<app:kommunenummer>0301</app:kommunenummer><app:gardsnummer>228</app:gardsnummer><app:bruksnummer>255</app:bruksnummer>') =>
    `<wfs:member><app:Teig><app:teigId>${id}</app:teigId><app:oppdateringsdato>2020-06-16T05:18:28.889</app:oppdateringsdato><gml:Point><gml:pos>59.9 10.7</gml:pos></gml:Point>${numbers}${body}</app:Teig></wfs:member>`
  const polygon = (exterior: string, interior = '') => `<gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>${exterior}</gml:posList></gml:LinearRing></gml:exterior>${interior && `<gml:interior><gml:LinearRing><gml:posList>${interior}</gml:posList></gml:LinearRing></gml:interior>`}</gml:Polygon>`
  // The real outline of 0301-228/255 as the WFS answers it: latitude first.
  const real = '59.923488 10.757932 59.923690 10.757931 59.923769 10.757931 59.923766 10.758195 59.923486 10.758199 59.923488 10.757932'
  const wrap = (members: string) => `<wfs:FeatureCollection>${members}</wfs:FeatureCollection>`

  it('reads latitude-first coordinates through the app projection, with the register number and date', () => {
    const [found] = parcelsFromGml(wrap(member('291468076', polygon(real))), origin, [-300, -300, 300, 300])
    expect(found).toMatchObject({ id: '291468076', matrikkel: '0301-228/255', updated: '2020-06-16' })
    expect(found!.rings[0]).toHaveLength(5) // the closing point is dropped
    // The register stores 464.6 m²; the outline at the WFS's 6-decimal degrees gives the same to the metre.
    expect(parcelArea(found!)).toBeGreaterThan(463)
    expect(parcelArea(found!)).toBeLessThan(466)
    // The parcel sits just north-west of the origin, not 6 000 km away (axis order).
    expect(Math.max(...found!.rings[0]!.map((p) => Math.hypot(p[0], p[1])))).toBeLessThan(40)
  })
  it('keeps holes, keeps a parcel that only touches the extent whole, and drops one outside it', () => {
    const hole = '59.92355 10.75800 59.92365 10.75800 59.92365 10.75810 59.92355 10.75810 59.92355 10.75800'
    const far = real.split(' ').map((value, index) => (index % 2 ? (Number(value) + 0.1).toFixed(6) : value)).join(' ')
    const found = parcelsFromGml(wrap(member('1', polygon(real, hole)) + member('2', polygon(far))), origin, [-5, -5, 5, 5])
    expect(found.map((p) => p.id)).toEqual(['1'])
    expect(found[0]!.rings).toHaveLength(2)
    // Not clipped to the 10 m extent: the whole outline is there.
    expect(Math.max(...found[0]!.rings[0]!.map((p) => Math.abs(p[1])))).toBeGreaterThan(20)
  })
  it('a parcel without a property number is kept and says so', () => {
    const [found] = parcelsFromGml(wrap(member('9', polygon(real), '<app:kommunenummer>0301</app:kommunenummer><app:gardsnummer>0</app:gardsnummer><app:bruksnummer>0</app:bruksnummer>')), origin, [-300, -300, 300, 300])
    expect(found!.matrikkel).toBeNull()
  })
  it('refuses a ring built from curve segments instead of reading its first segment only', () => {
    const curved = '<gml:Polygon><gml:exterior><gml:Ring><gml:curveMember><gml:posList>59.9 10.7 59.91 10.7</gml:posList></gml:curveMember></gml:Ring></gml:exterior></gml:Polygon>'
    expect(() => parcelsFromGml(wrap(member('1', curved)), origin, [-300, -300, 300, 300])).toThrow(/curve rings are not supported/)
  })
  it('refuses an answer that is not a feature collection or that hit the feature limit', () => {
    expect(() => parcelsFromGml('<ows:ExceptionReport/>', origin, [-1, -1, 1, 1])).toThrow(/not a WFS feature collection/)
    expect(() => parcelsFromGml(wrap(member('1', polygon(real)).repeat(PARCEL_MAX_FEATURES)), origin, [-300, -300, 300, 300])).toThrow(/may be incomplete/)
  })
  // Feasibility IT-5: a ±3 m box returned nothing where a 25 m box returned the parcel. The request
  // is always the whole extent, and a parcel is found in that answer by a point lookup.
  it('asks for the whole extent once, latitude first, and looks a point up client-side', () => {
    const url = parcelRequestUrl([10.7515, 59.9198, 10.7646, 59.9272])
    expect(url).toContain('typeNames=app:Teig')
    expect(url).toContain('bbox=59.9198000,10.7515000,59.9272000,10.7646000,urn:ogc:def:crs:EPSG::4326')
    const parcels = parcelsFromGml(wrap(member('291468076', polygon(real))), origin, [-300, -300, 300, 300])
    expect(parcelAt(parcels, 4, 10)?.matrikkel).toBe('0301-228/255')
  })
})

describe('shipped parcels (ADR-0035)', () => {
  const read = (site: string, name: string): unknown => JSON.parse(readFileSync(`public/sites/${site}/${name}`, 'utf8'))
  it('Compact Infill: the parcel at the origin is 0301-228/255, about 465 m² from the polygon', () => {
    const { parcels, siteId } = parseParcels(read('compact-infill', 'parcels.json'))
    expect(siteId).toBe('compact-infill')
    const found = parcelAt(parcels, 0, 0)
    expect(found?.matrikkel).toBe('0301-228/255')
    expect(parcelArea(found!)).toBeGreaterThan(463)
    expect(parcelArea(found!)).toBeLessThan(467)
  })
  it.each(['compact-infill', 'sloped-edge'])('%s: the layer is registered with Kartverket, CC BY 4.0 and the boundary caveat', (site) => {
    const manifest = parseSiteManifest(read(site, 'manifest.json'))
    expect(manifest.assetPaths.parcels).toBe('parcels.json')
    const layer = siteLayers(manifest).layers.find((entry) => entry.id === 'parcels')
    expect(layer).toMatchObject({ owner: 'Kartverket', licence: 'CC BY 4.0', attribution: '© Kartverket' })
    expect(layer?.useLimitation).toContain('not a surveyed boundary')
    expect(parseParcels(read(site, 'parcels.json')).parcels.length).toBeGreaterThan(50)
  })
})

describe('draped outlines', () => {
  it('lifts every vertex 0.25 m above the ground and follows it along a long edge', () => {
    const positions = parcelLinePositions([parcel('a', [square(0, 0, 10, 4)])], (east) => east)
    // 10 m edges split into 3 steps, 4 m edges into 1: (3 + 1) × 2 segments, 6 numbers each.
    expect(positions).toHaveLength(8 * 6)
    expect(positions.slice(0, 6).map((v) => Number(v.toFixed(3)) + 0)).toEqual([0, PARCEL_LIFT_M, 0, 3.333, 3.333 + PARCEL_LIFT_M, 0])
  })
})
