import { readFileSync } from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { normalizeRing } from '../../lib/polygon'
import { HazardFacts } from '../../components/studio/HazardFacts'
import { hazardLayerFromGml, hazardRequestUrl, HAZARD_MAX_FEATURES } from '../import/hazards'
import { parseSiteManifest } from '../sites/manifest'
import { parseStudyArea } from '../sites/package'
import { siteLayers } from '../sites/provenance'
import { HAZARD_DISCLAIMER, HAZARD_KINDS, hazardFacts, hazardStatus, parseHazards, type HazardLayer, type Hazards } from './hazards'

const square = (x0: number, y0: number, x1: number, y1: number): Vec2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const area = square(0, 0, 100, 100)
const layer = (kind: HazardLayer['kind'], polygons: Vec2[][][], updated: string | null = '2025-06-11'): HazardLayer => ({ kind, updated, polygons })

describe('hazard status for an area', () => {
  it('mapped here when a polygon reaches the area, including a small one inside it and one that covers it', () => {
    expect(hazardStatus(layer('quick-clay', [[square(90, 90, 300, 300)]]), area)).toBe('here')
    expect(hazardStatus(layer('quick-clay', [[square(40, 40, 42, 42)]]), area)).toBe('here')
    expect(hazardStatus(layer('quick-clay', [[square(-500, -500, 500, 500)]]), area)).toBe('here')
  })
  it('mapped nearby when the only polygons are elsewhere in the extent, or the area lies in a hole', () => {
    expect(hazardStatus(layer('quick-clay', [[square(200, 200, 300, 300)]]), area)).toBe('nearby')
    expect(hazardStatus(layer('quick-clay', [[square(-500, -500, 500, 500), square(-10, -10, 110, 110)]]), area)).toBe('nearby')
  })
  it('not mapped when the answer had no area, and not checked when the service was never answered', () => {
    expect(hazardStatus(layer('flood-zones', [], null), area)).toBe('not-mapped')
    expect(hazardStatus(undefined, area)).toBe('not-checked')
  })
})

describe('hazard facts wording', () => {
  const hazards: Hazards = { retrieved: '2026-11-16', layers: [layer('flood-zones', [], null), layer('quick-clay', [[square(50, 50, 300, 300)]], '2026-03-18'), layer('storm-surge', [[square(200, 200, 300, 300)]], '2026-10-02')] }
  const facts = hazardFacts(hazards, area)
  it('gives the four facts in a fixed order with owner, retrieval date and map date', () => {
    expect(facts.map((fact) => [fact.kind, fact.statement])).toEqual([
      ['flood-zones', 'Not mapped by NVE'],
      ['flood-susceptibility', 'Not checked: the service did not answer'],
      ['quick-clay', 'Mapped here'],
      ['storm-surge', 'Mapped nearby (within the site extent)'],
    ])
    expect(facts[2]!.source).toBe('Source: NVE (Aktsomhetskart for kvikkleireskred), retrieved 2026-11-16, map updated 2026-03-18')
    expect(facts[0]!.source).toBe('Source: NVE (Flomsoner (detailed flood-zone maps)), retrieved 2026-11-16')
    expect(facts[3]!.source).toContain('Kartverket')
  })
  it('never says safe, no risk, or a depth, probability or class', () => {
    const text = [...facts.flatMap((fact) => [fact.label, fact.statement, fact.source, fact.note])].join(' ')
    expect(text).not.toMatch(/\bsafe\b|no risk|low risk|\bdepth\b|\d\s*m deep|F[123]\b/i)
    // The one place "safe" appears is the sentence that says what an absence is not.
    expect(HAZARD_DISCLAIMER).toBe('“Not mapped” means the authority has no mapped area here. It is not a statement that the site is safe.')
  })
  it('the panel lists every fact and the disclaimer', () => {
    render(createElement(HazardFacts, { hazards, area }))
    const region = screen.getByRole('region', { name: 'Mapped hazards' })
    expect(within(region).getAllByRole('listitem')).toHaveLength(4)
    expect(within(region).getByText('Not mapped by NVE')).toBeVisible()
    expect(within(region).getByText(HAZARD_DISCLAIMER)).toBeVisible()
  })
})

describe('parseHazards', () => {
  const file = { schemaVersion: 1, siteId: 'demo', retrieved: '2026-11-16', layers: [{ kind: 'flood-zones', updated: null, polygons: [] }, { kind: 'quick-clay', updated: '2026-03-18', polygons: [[square(0, 0, 10, 10)]] }] }
  it('reads a valid file and rejects an unknown kind, a duplicate, a bad date and a degenerate ring', () => {
    expect(parseHazards(file).layers.map((entry) => entry.kind)).toEqual(['flood-zones', 'quick-clay'])
    expect(() => parseHazards({ ...file, layers: [{ kind: 'avalanche', polygons: [] }] })).toThrow(/unknown hazard kind/)
    expect(() => parseHazards({ ...file, layers: [file.layers[0], file.layers[0]] })).toThrow(/twice/)
    expect(() => parseHazards({ ...file, retrieved: 'yesterday' })).toThrow(/date/)
    expect(() => parseHazards({ ...file, layers: [{ kind: 'quick-clay', polygons: [[[[0, 0], [1, 1]]]] }] })).toThrow(/three points/)
  })
})

describe('converter from the WFS answer', () => {
  const origin = { latitude: 59.9235, longitude: 10.758 }
  const member = (posList: string, date = '2026-03-18T18:14:48') => `<wfs:member><app:X><app:oppdateringsdato>${date}</app:oppdateringsdato><gml:Polygon><gml:exterior><gml:LinearRing><gml:posList>${posList}</gml:posList></gml:LinearRing></gml:exterior></gml:Polygon></app:X></wfs:member>`
  const wrap = (members: string) => `<wfs:FeatureCollection>${members}</wfs:FeatureCollection>`
  // About 111 m × 111 m around the origin, latitude first.
  const near = '59.923 10.757 59.923 10.759 59.924 10.759 59.924 10.757 59.923 10.757'
  const far = '59.933 10.757 59.933 10.759 59.934 10.759 59.934 10.757 59.933 10.757'
  it('clips to the extent, keeps the newest map date of the kept features, and drops a feature outside', () => {
    const converted = hazardLayerFromGml(wrap(member(near, '2025-01-01T00:00:00') + member(near, '2026-03-18T18:14:48') + member(far, '2027-01-01T00:00:00')), 'quick-clay', origin, [-20, -20, 20, 20])
    expect(converted.polygons).toHaveLength(2)
    expect(converted.updated).toBe('2026-03-18')
    expect(Math.max(...converted.polygons[0]![0]!.map((point) => Math.max(Math.abs(point[0]), Math.abs(point[1]))))).toBeLessThanOrEqual(20)
  })
  it('an answer with no feature is "not mapped", and a truncated or foreign answer is refused', () => {
    expect(hazardLayerFromGml(wrap(''), 'flood-zones', origin, [-20, -20, 20, 20])).toEqual({ kind: 'flood-zones', updated: null, polygons: [] })
    expect(() => hazardLayerFromGml('<ows:ExceptionReport/>', 'flood-zones', origin, [-20, -20, 20, 20])).toThrow(/not a WFS feature collection/)
    expect(() => hazardLayerFromGml(wrap(member(near).repeat(HAZARD_MAX_FEATURES)), 'quick-clay', origin, [-20, -20, 20, 20])).toThrow(/may be incomplete/)
  })
  it('asks each service for its own feature type over the whole extent, latitude first', () => {
    expect(hazardRequestUrl('flood-zones', [10.75, 59.92, 10.76, 59.93])).toBe('https://wfs.geonorge.no/skwms1/wfs.flomsoner?service=WFS&version=2.0.0&request=GetFeature&typeNames=app%3AFlomAreal&srsName=urn:ogc:def:crs:EPSG::4326&count=2000&bbox=59.9200000,10.7500000,59.9300000,10.7600000,urn:ogc:def:crs:EPSG::4326')
    expect(hazardRequestUrl('storm-surge', [10.75, 59.92, 10.76, 59.93])).toContain('wfs.stormflo_havniva')
  })
})

describe('shipped hazard facts (ADR-0036)', () => {
  const read = (site: string, name: string): unknown => JSON.parse(readFileSync(`public/sites/${site}/${name}`, 'utf8'))
  it('Compact Infill: flood zones are not mapped by NVE; quick-clay susceptibility is mapped in the extent', () => {
    const hazards = parseHazards(read('compact-infill', 'hazards.json'))
    expect(hazards.layers.map((entry) => entry.kind)).toEqual([...HAZARD_KINDS])
    const study = normalizeRing(parseStudyArea(read('compact-infill', 'study-area.json')).polygon)
    const facts = hazardFacts(hazards, study)
    expect(facts[0]).toMatchObject({ kind: 'flood-zones', statement: 'Not mapped by NVE' })
    expect(facts[0]!.source).toMatch(/^Source: NVE \(Flomsoner.*retrieved \d{4}-\d{2}-\d{2}$/)
    expect(['here', 'nearby']).toContain(facts[2]!.status)
    expect(facts[2]!.source).toMatch(/Source: NVE \(Aktsomhetskart for kvikkleireskred\), retrieved \d{4}-\d{2}-\d{2}, map updated \d{4}-\d{2}-\d{2}/)
  })
  it.each(['compact-infill', 'sloped-edge'])('%s: each hazard map has its own provenance entry', (site) => {
    const manifest = parseSiteManifest(read(site, 'manifest.json'))
    expect(manifest.assetPaths.hazards).toBe('hazards.json')
    const layers = siteLayers(manifest).layers
    for (const kind of HAZARD_KINDS) expect(layers.find((entry) => entry.id === kind)).toMatchObject({ licence: 'NLOD 1.0', owner: kind === 'storm-surge' ? 'Kartverket' : 'NVE' })
  })
})
