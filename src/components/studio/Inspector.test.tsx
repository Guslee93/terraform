import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SITES } from '../../features/sites/siteCatalog'
import { Inspector } from './Inspector'

it('keeps attribution and export with no planning, project or render controls', () => {
  const site = SITES.find((s) => s.id === 'compact-infill')!
  render(<Inspector site={site} manifest={null} analysisOnly layers={<p>Terrain</p>} packageStatus="ready" visuals={<button>Image passes</button>} selected={null} canEdit editingEnabled onCommand={() => null} />)
  expect(screen.getByText(/Buildings © OpenStreetMap contributors/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Image passes', hidden: true })).toBeInTheDocument()
  for (const name of ['Design check', 'Data notes', 'Notes', 'Selected block', 'Render quality']) expect(screen.queryByText(name)).not.toBeInTheDocument()
})

describe('block selection', () => {
  it('provides instructions when enabled and empty', () => {
    render(<Inspector site={SITES[0]!} manifest={null} analysisOnly={false} layers={null} packageStatus="ready" selected={null} canEdit editingEnabled onCommand={() => null} />)
    expect(screen.getByText('Draw a footprint, or click a block to select it.')).toBeVisible()
  })
})
