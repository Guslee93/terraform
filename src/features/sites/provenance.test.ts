import { describe, expect, it } from 'vitest'
import { SitePackageError, type SiteSource } from './manifest'
import { creditLine, credits, exportCreditLines, layersFromSources, nlodAttribution, parseLayerProvenance, parseLayers, siteLayers, visibleLayerIds, type LayerProvenance } from './provenance'

const noise = {
  id: 'noise',
  owner: 'Statens vegvesen',
  dataset: 'Strategic road noise map, Lden',
  datasetUuid: '4bbae38e-4718-481d-9827-237cd5e115c8',
  url: 'https://www.vegvesen.no/kart/ogc/norstoy_1_0/ows',
  licence: 'NLOD 1.0',
  licenceUrl: 'https://data.norge.no/nlod/en/1.0',
  attribution: nlodAttribution('Statens vegvesen'),
  retrieved: '2026-11-15',
  dataYear: 2021,
  useLimitation: 'Not for assessing measures on individual buildings.',
}

const SOURCES: SiteSource[] = [
  { title: 'OpenStreetMap site extract (buildings, roads, trees, land cover)', url: 'https://www.openstreetmap.org/copyright', license: 'ODbL 1.0', attribution: '© OpenStreetMap contributors', acquiredAt: '2026-11-11' },
  { title: 'Kartverket DTM1 elevation', url: 'https://ws.geonorge.no/hoydedata/v1/', license: 'CC BY 4.0', attribution: '© Kartverket', acquiredAt: '2026-10-27' },
]

describe('parseLayerProvenance', () => {
  it('reads a complete entry', () => {
    expect(parseLayerProvenance(noise, 'layers[0]')).toEqual(noise)
  })
  it('rejects an entry without a licence', () => {
    const { licence: _licence, ...rest } = noise
    void _licence
    expect(() => parseLayerProvenance(rest, 'layers[0]')).toThrow(SitePackageError)
    expect(() => parseLayerProvenance(rest, 'layers[0]')).toThrow(/layers\[0\]\.licence/)
  })
  it('rejects a licence outside the verified set', () => {
    expect(() => parseLayerProvenance({ ...noise, licence: 'CC BY-NC 4.0' }, 'layers[0]')).toThrow(/unknown licence "CC BY-NC 4.0"/)
  })
  it('rejects an unknown layer, a year that is not a year, a date that is not a date and a non-https link', () => {
    expect(() => parseLayerProvenance({ ...noise, id: 'zoning' }, 'l')).toThrow(/unknown layer/)
    expect(() => parseLayerProvenance({ ...noise, dataYear: '2021' }, 'l')).toThrow(/dataYear/)
    expect(() => parseLayerProvenance({ ...noise, retrieved: '15.11.2026' }, 'l')).toThrow(/retrieved/)
    expect(() => parseLayerProvenance({ ...noise, url: 'javascript:alert(1)' }, 'l')).toThrow(/https/)
  })
  it('rejects the same layer listed twice', () => {
    expect(() => parseLayers([noise, noise], 'manifest.layers')).toThrow(/listed twice/)
  })
})

describe('layers of a package written before ADR-0032', () => {
  it('synthesises OSM and Kartverket entries from sources', () => {
    const { layers, unlisted } = layersFromSources(SOURCES)
    expect(unlisted).toEqual([])
    expect(layers.map((layer) => [layer.id, layer.licence])).toEqual([
      ['buildings', 'ODbL 1.0'], ['roads', 'ODbL 1.0'], ['trees', 'ODbL 1.0'], ['landcover', 'ODbL 1.0'], ['terrain', 'CC BY 4.0'],
    ])
    expect(layers[4]).toMatchObject({ owner: 'Kartverket', attribution: '© Kartverket', retrieved: '2026-10-27', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' })
  })
  it('keeps a source it cannot express, so its credit is still shown', () => {
    const terrarium: SiteSource = { title: 'AWS Terrain Tiles (Terrarium)', attribution: 'Mapzen Terrain Tiles', license: 'Multiple source licences', url: 'https://example.org', acquiredAt: '2026-11-15' }
    expect(layersFromSources([terrarium])).toEqual({ layers: [], unlisted: [terrarium] })
  })
  it('reads an import surface-model source as the heights layer', () => {
    const dom: SiteSource = { title: 'Kartverket surface model (DOM)', attribution: '© Kartverket · CC BY 4.0', license: 'CC BY 4.0', url: 'https://wcs.geonorge.no/skwms1/wcs.hoyde-dom-nhm-25833', acquiredAt: '2026-11-15T10:00:00Z' }
    expect(layersFromSources([dom]).layers).toMatchObject([{ id: 'heights', attribution: '© Kartverket', retrieved: '2026-11-15' }])
  })
  it('a declared layer wins over the synthesised one', () => {
    const own = { ...(noise as LayerProvenance), id: 'terrain' as const }
    const { layers } = siteLayers({ sources: SOURCES, layers: [own] })
    expect(layers.filter((layer) => layer.id === 'terrain')).toEqual([own])
    expect(layers).toHaveLength(5)
  })
})

describe('credits', () => {
  const layers = [...layersFromSources(SOURCES).layers, noise as LayerProvenance]
  it('lists only the layers on screen, one line per source', () => {
    const visible = visibleLayerIds({ terrain: false, ground: true, context: true, streets: true, trees: false })
    expect(credits(layers, visible).map((credit) => credit.ids)).toEqual([['buildings', 'roads', 'landcover']])
    expect(credits(layers, visibleLayerIds({ terrain: true, ground: false, context: false, streets: false, trees: false }, ['noise'])).map(creditLine)).toEqual([
      '© Kartverket · Kartverket DTM1 elevation · CC BY 4.0',
      'Contains data under the Norwegian licence for Open Government data (NLOD) distributed by Statens vegvesen · Strategic road noise map, Lden (2021) · NLOD 1.0',
    ])
  })
  it('exports carry the visible credits and any source the contract cannot express', () => {
    const unlisted: SiteSource = { title: 'Terrain tiles', attribution: 'Mapzen Terrain Tiles' }
    const visible = visibleLayerIds({ terrain: true, ground: true, context: true, streets: true, trees: true })
    expect(exportCreditLines({ sources: [...SOURCES, unlisted] }, visible)).toEqual([
      '© OpenStreetMap contributors · OpenStreetMap site extract (buildings, roads, trees, land cover) · ODbL 1.0',
      '© Kartverket · Kartverket DTM1 elevation · CC BY 4.0',
      'Mapzen Terrain Tiles',
    ])
  })
})
