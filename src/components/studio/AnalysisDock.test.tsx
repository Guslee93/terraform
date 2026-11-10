import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { AnalysisDock, type DockCard, type DockCardId, type DockSize } from './AnalysisDock'

const cards: DockCard[] = [
  { id: 'sun', label: 'Sun', icon: 'sun', stat: { value: '49', unit: '°', secondary: [['az ', ''], ['217°', ' SW']] }, note: 'Geometric sun direction', quick: <p>Time slider</p> },
  { id: 'noise', label: 'Noise', icon: 'noise', stat: { value: null, unit: '', hint: 'No mapped roads', secondary: [] }, note: 'Indicative road-noise screening' },
]

function Harness({ initialSize = 'M' as DockSize }) {
  const [active, setActive] = useState<DockCardId>('sun')
  const [size, setSize] = useState<DockSize>(initialSize)
  return <AnalysisDock cards={cards} active={active} onActivate={setActive} size={size} onSizeChange={setSize} />
}

describe('AnalysisDock', () => {
  it('is a keyboard-reachable group of toggle buttons; one card is active at a time', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const group = screen.getByRole('group', { name: 'Analysis cards' })
    const sun = within(group).getByRole('button', { name: /^Sun/ })
    const noise = within(group).getByRole('button', { name: /^Noise/ })
    expect(sun).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('region', { name: 'Sun quick controls' })).toHaveTextContent('Time slider')
    noise.focus()
    await user.keyboard('{Enter}')
    expect(noise).toHaveAttribute('aria-pressed', 'true')
    expect(sun).toHaveAttribute('aria-pressed', 'false')
    // No quick controls for noise yet: its claim stands in.
    expect(screen.getByRole('region', { name: 'Noise quick controls' })).toHaveTextContent('Indicative road-noise screening')
  })

  it('shows a dash and the hint for a value that cannot be calculated; the dock claim stays visible', () => {
    render(<Harness />)
    const noise = screen.getByRole('button', { name: /^Noise/ })
    expect(noise).toHaveTextContent('—')
    expect(noise).toHaveTextContent('No mapped roads')
    expect(screen.getByText('Indicative screening — not planning advice')).toBeVisible()
  })

  it('S shows figures only; L adds each card note', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Small' }))
    expect(screen.getByRole('button', { name: 'Small' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('region', { name: 'Sun quick controls' })).not.toBeInTheDocument()
    expect(screen.queryByText('No mapped roads')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Large' }))
    expect(within(screen.getByRole('button', { name: /^Noise/ })).getByText('Indicative road-noise screening')).toBeVisible()
  })
})
