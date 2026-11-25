import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SITES } from '../../features/sites/siteCatalog'
import { DataAttribution, Inspector } from './Inspector'
import type { SiteManifest } from '../../features/sites/manifest'
import type { LayerId } from '../../features/sites/provenance'

it('keeps attribution and export with no planning, project or render controls', () => {
  const site = SITES.find((s) => s.id === 'compact-infill')!
  render(<Inspector site={site} manifest={null} analysisOnly layers={<p>Terrain</p>} packageStatus="ready" visibleLayers={new Set()} visuals={<button>Image passes</button>} selected={null} canEdit editingEnabled onCommand={() => null} />)
  expect(screen.getByText(/Buildings © OpenStreetMap contributors/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Image passes', hidden: true })).toBeInTheDocument()
  for (const name of ['Design check', 'Data notes', 'Notes', 'Selected block', 'Render quality']) expect(screen.queryByText(name)).not.toBeInTheDocument()
})

describe('block selection', () => {
  it('provides instructions when enabled and empty', () => {
    render(<Inspector site={SITES[0]!} manifest={null} analysisOnly={false} layers={null} packageStatus="ready" visibleLayers={new Set()} selected={null} canEdit editingEnabled onCommand={() => null} />)
    expect(screen.getByText('Draw a footprint, or click a block to select it.')).toBeVisible()
  })
})

describe('data attribution (ADR-0032)', () => {
  const manifest = {
    sources: [
      { title: 'OpenStreetMap site extract', url: 'https://www.openstreetmap.org/copyright', license: 'ODbL 1.0', attribution: '© OpenStreetMap contributors', acquiredAt: '2026-11-11' },
      { title: 'Kartverket DTM1 elevation', url: 'https://ws.geonorge.no/hoydedata/v1/', license: 'CC BY 4.0', attribution: '© Kartverket', acquiredAt: '2026-10-27' },
    ],
    layers: [{
      id: 'noise', owner: 'Statens vegvesen', dataset: 'Strategic road noise map, Lden', url: 'https://www.vegvesen.no/kart/ogc/norstoy_1_0/ows',
      licence: 'NLOD 1.0', licenceUrl: 'https://data.norge.no/nlod/en/1.0', attribution: 'Contains data under NLOD distributed by Statens vegvesen',
      retrieved: '2026-11-15', dataYear: 2021, useLimitation: 'Not for assessing individual buildings.',
    }],
  } as unknown as SiteManifest

  it('lists one line per source of the layers on screen, with year, licence link and limitation', () => {
    render(<DataAttribution manifest={manifest} visible={new Set<LayerId>(['terrain', 'noise'])} />)
    const items = within(screen.getByRole('list', { name: 'Data attribution' })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    // Declared layers first, then the ones the older sources stand for.
    expect(items[1]).toHaveTextContent('© Kartverket · Kartverket DTM1 elevation · CC BY 4.0 · retrieved 2026-10-27')
    expect(within(items[1]!).getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/')
    expect(items[0]).toHaveTextContent('Strategic road noise map, Lden (2021) · NLOD 1.0 · retrieved 2026-11-15')
    expect(items[0]).toHaveTextContent('Use limitation: Not for assessing individual buildings.')
    // OpenStreetMap layers are switched off here, so its line is not shown.
    expect(screen.queryByText(/OpenStreetMap/)).not.toBeInTheDocument()
  })
})
