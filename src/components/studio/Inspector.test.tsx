import { render as rtlRender, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SITES, type SiteSummary } from '../../features/sites/siteCatalog'
import { Inspector } from './Inspector'
import { createRectangleFootprint, createTier, createVolume } from '../../features/massing/factories'

function render(ui: ReactNode) {
  return rtlRender(<MemoryRouter>{ui}</MemoryRouter>)
}

function requireSite(id: string): SiteSummary {
  const site = SITES.find((candidate) => candidate.id === id)
  if (!site) throw new Error(`The ${id} fixture site is missing`)
  return site
}

const site = requireSite('compact-infill')
const baseProps: ComponentProps<typeof Inspector> = {
  check: <p>Check slot</p>,
  notes: <p>Notes slot</p>,
  site,
  metrics: null,
  manifest: null,
  packageStatus: 'ready',
  renderPreference: 'auto',
  onRenderPreferenceChange: () => undefined,
  grid: true,
  onGridChange: () => undefined,
  selected: null,
  canEdit: true,
  editingEnabled: true,
  onCommand: () => null,
  onSelectTier: () => undefined,
}

describe('Parameters panel', () => {
  it('labels the quality select, describes it and permits keyboard selection', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Inspector {...baseProps} onRenderPreferenceChange={onChange} />)
    const quality = screen.getByRole('combobox', { name: 'Render quality' })
    expect(quality).toHaveValue('auto')
    expect(quality).toHaveAccessibleDescription('Sets shadows and ambient occlusion. Auto lowers quality on software rendering or when frames run slow.')
    // It follows the grid switch in the keyboard sequence.
    screen.getByRole('checkbox', { name: 'Ground grid · 1 m / 10 m' }).focus()
    await user.tab()
    expect(quality).toHaveFocus()
    await user.selectOptions(quality, 'low')
    expect(onChange).toHaveBeenCalledWith('low')
  })

  it('toggles the ground grid', async () => {
    const onGridChange = vi.fn()
    render(<Inspector {...baseProps} onGridChange={onGridChange} />)
    await userEvent.setup().click(screen.getByRole('checkbox', { name: 'Ground grid · 1 m / 10 m' }))
    expect(onGridChange).toHaveBeenCalledWith(false)
  })

  it('is a non-modal panel: selected mass, check, site, view, notes in that order', () => {
    render(<Inspector {...baseProps} />)
    const panel = screen.getByRole('complementary', { name: 'Parameters' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const text = panel.textContent ?? ''
    const order = ['Selected mass', 'Check slot', 'Site', 'View', 'Notes slot'].map((label) => text.indexOf(label))
    expect(order.every((at) => at >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(screen.getByText('Draw a footprint, or click a mass to select it.')).toBeInTheDocument()
  })

  it('hides massing groups in the analysis-only studio', () => {
    render(<Inspector {...baseProps} analysisOnly />)
    expect(screen.queryByText('Selected mass')).not.toBeInTheDocument()
    expect(screen.queryByText('Notes slot')).not.toBeInTheDocument()
    expect(screen.getByText('Study area')).toBeInTheDocument()
  })

  it('shows editable fields for the selected mass', () => {
    const tier = createTier({ id: 't1', footprint: createRectangleFootprint(18, 12), storeys: 5 })
    const volume = createVolume({ id: 'v1', name: 'Mass 1', tiers: [tier] })
    render(<Inspector {...baseProps} selected={{ volume, tier }} />)

    expect(screen.getByLabelText('Name')).toHaveValue('Mass 1')
    expect(screen.getByLabelText('Storeys')).toHaveValue('5')
    expect(screen.getByText('16.0 m')).toBeInTheDocument()
  })

  it('states that massing is read-only on small screens', () => {
    render(<Inspector {...baseProps} canEdit={false} />)

    expect(screen.getByText(/read-only on small screens/)).toBeInTheDocument()
  })
})
