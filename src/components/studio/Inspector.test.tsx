import { act, render as rtlRender, screen } from '@testing-library/react'
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
const layers = { terrain: true, context: true, streets: true, trees: true, parcel: true, setback: true, heightLimit: true }
const baseProps: ComponentProps<typeof Inspector> = {
  check: <p>Check slot</p>,
  figures: <p>Figures slot</p>,
  sun: null,
  site,
  metrics: null,
  manifest: null,
  packageStatus: 'ready',
  layers,
  onToggleLayer: () => undefined,
  renderPreference: 'auto',
  onRenderPreferenceChange: () => undefined,
  selected: null,
  canEdit: true,
  editingEnabled: true,
  onCommand: () => null,
  masses: [],
  onSelectMass: () => undefined,
  onSelectTier: () => undefined,
}

describe('Studio panel', () => {
  it('labels the quality select, describes Auto and permits keyboard focus and selection', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Inspector {...baseProps} onRenderPreferenceChange={onChange} />)
    await user.click(screen.getByText('Layers and render quality'))
    const quality = screen.getByRole('combobox', { name: 'Render quality' })
    expect(quality).toHaveValue('auto')
    expect(quality).toHaveAccessibleDescription('Auto lowers quality on software rendering.')
    // It immediately follows the last layer checkbox in the keyboard sequence.
    screen.getByRole('checkbox', { name: 'Height limit' }).focus()
    await user.tab()
    expect(quality).toHaveFocus()
    await user.selectOptions(quality, 'low')
    expect(onChange).toHaveBeenCalledWith('low')
  })

  it('is always rendered as a non-modal panel with the check and figures first', () => {
    render(<Inspector {...baseProps} />)
    const panel = screen.getByRole('complementary', { name: 'Inspector' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(panel.textContent?.indexOf('Check slot')).toBeLessThan(panel.textContent?.indexOf('Figures slot') ?? 0)
    expect(screen.getByText('No mass selected')).toBeInTheDocument()
    expect(screen.getByText(/Draw building/)).toBeInTheDocument()
  })

  it('opens and focuses the Layers group when asked by the toolbar', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame'] })
    const { rerender } = render(<Inspector {...baseProps} focusGroup="layers" focusNonce={0} />)
    expect(screen.queryByRole('checkbox', { name: 'Terrain' })).not.toBeVisible()
    rerender(<MemoryRouter><Inspector {...baseProps} focusGroup="layers" focusNonce={1} /></MemoryRouter>)
    act(() => { vi.runAllTimers() })
    expect(screen.getByRole('checkbox', { name: 'Terrain' })).toBeVisible()
    expect(screen.getByText('Layers and render quality').closest('summary')).toHaveFocus()
    vi.useRealTimers()
  })

  it('shows editable fields for the selected mass', () => {
    const tier = createTier({ id: 't1', footprint: createRectangleFootprint(18, 12), storeys: 5 })
    const volume = createVolume({ id: 'v1', name: 'Mass 1', tiers: [tier] })
    render(<Inspector {...baseProps} selected={{ volume, tier }} />)

    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Mass 1')
    expect(screen.getByLabelText('Storeys')).toHaveValue('5')
    expect(screen.getByText('16.0 m')).toBeInTheDocument()
  })

  it('states that massing is read-only on small screens', () => {
    render(<Inspector {...baseProps} canEdit={false} />)

    expect(screen.getByText(/read-only on small screens/)).toBeInTheDocument()
  })
})
