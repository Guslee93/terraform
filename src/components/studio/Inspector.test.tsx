import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { SITES, type SiteSummary } from '../../features/sites/siteCatalog'
import { Inspector } from './Inspector'

function requireSite(id: string): SiteSummary {
  const site = SITES.find((candidate) => candidate.id === id)
  if (!site) throw new Error(`The ${id} fixture site is missing`)
  return site
}

const site = requireSite('compact-infill')

function DrawerHarness() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open inspector
      </button>
      <Inspector
        site={site}
        activeTab="model"
        onTabChange={() => undefined}
        isOpen={open}
        onClose={() => setOpen(false)}
        isDrawer
      />
    </div>
  )
}

describe('Inspector drawer', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <Inspector
        site={site}
        activeTab="model"
        onTabChange={() => undefined}
        isOpen={false}
        onClose={() => undefined}
        isDrawer
      />,
    )

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
    render(
      <Inspector
        site={site}
        activeTab="model"
        onTabChange={() => undefined}
        isOpen={false}
        onClose={() => undefined}
        isDrawer={false}
      />,
    )

    expect(screen.getByRole('complementary', { name: 'Inspector' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('No mass selected')).toBeInTheDocument()
  })
})
