import { render as rtlRender, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SITES, type SiteSummary } from '../../features/sites/siteCatalog'
import { Inspector } from './Inspector'

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

  it('summarises the selected mass', () => {
    render(<Inspector {...baseProps} selected={{ name: 'Mass 1', detail: '5 storeys · 16.0 m' }} />)

    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(screen.getByText('Mass 1')).toBeInTheDocument()
    expect(screen.getByText('5 storeys · 16.0 m')).toBeInTheDocument()
  })

  it('states that massing is read-only on small screens', () => {
    render(<Inspector {...baseProps} canEdit={false} />)

    expect(screen.getByText(/read-only on small screens/)).toBeInTheDocument()
  })
})
