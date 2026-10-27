import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MassList, type MassListItem } from './MassList'

const items: MassListItem[] = [
  { id: 'v1', name: 'Mass 1', detail: '3 storeys · 9.6 m', hidden: false, warning: false },
  { id: 'v2', name: 'Mass 2', detail: '5 storeys · 16.0 m', hidden: true, warning: true },
]

describe('MassList', () => {
  it('lists every mass, including hidden ones', () => {
    render(<MassList items={items} selectedId={null} onSelect={() => undefined} />)
    const list = screen.getByRole('list', { name: 'Masses' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(within(list).getByText('3 storeys · 9.6 m')).toBeInTheDocument()
    expect(within(list).getByText('Hidden')).toBeInTheDocument()
    expect(within(list).getByText('Needs attention')).toBeInTheDocument()
  })

  it('marks the selected mass and selects on click', async () => {
    const onSelect = vi.fn()
    render(<MassList items={items} selectedId="v1" onSelect={onSelect} />)
    expect(screen.getByRole('button', { name: /Mass 1/ })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: /Mass 2/ })).not.toHaveAttribute('aria-current')

    await userEvent.setup().click(screen.getByRole('button', { name: /Mass 2/ }))
    expect(onSelect).toHaveBeenCalledWith('v2')
  })

  it('renders nothing when there are no masses', () => {
    const { container } = render(<MassList items={[]} selectedId={null} onSelect={() => undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})
