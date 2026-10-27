import { render as rtlRender, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
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
const layers = { terrain: true, context: true, parcel: true }
const baseProps: ComponentProps<typeof Inspector> = {
  site,
  manifest: null,
  packageStatus: 'ready',
  layers,
  onToggleLayer: () => undefined,
  activeTab: 'model',
  onTabChange: () => undefined,
  isOpen: false,
  onClose: () => undefined,
  isDrawer: false,
  selected: null,
  canEdit: true,
  editingEnabled: true,
  onCommand: () => null,
  masses: [],
  onSelectMass: () => undefined,
}

function DrawerHarness() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open inspector
      </button>
      <Inspector
        {...baseProps}
        isOpen={open}
        onClose={() => setOpen(false)}
        isDrawer
      />
    </div>
  )
}

describe('Inspector drawer', () => {
  it('does not render when closed', () => {
    const { container } = render(<Inspector {...baseProps} isDrawer />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('moves focus into the drawer and restores it on close', async () => {
    const user = userEvent.setup()
    render(<DrawerHarness />)

    const opener = screen.getByRole('button', { name: 'Open inspector' })
    await user.click(opener)

    const close = screen.getByRole('button', { name: 'Close inspector' })
    expect(close).toHaveFocus()

    await user.click(close)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('renders as a static panel on desktop', () => {
    render(<Inspector {...baseProps} />)

    expect(screen.getByRole('complementary', { name: 'Inspector' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('No mass selected')).toBeInTheDocument()
    expect(screen.getByText(/Draw footprint/)).toBeInTheDocument()
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
