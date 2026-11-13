import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { AnalysisCards, type AnalysisCard, type AnalysisId } from './AnalysisCards'

const cards: AnalysisCard[] = [
  { id: 'sun', label: 'Sun', icon: 'sun', stat: { value: '49', unit: '°', secondary: [['az ', ''], ['217°', ' SW']] }, note: 'Geometric sun direction', body: <p>Time slider</p> },
  { id: 'noise', label: 'Noise', icon: 'noise', stat: { value: null, unit: '', hint: 'No mapped roads', secondary: [] }, note: 'Indicative road-noise screening', body: <p>Noise bands</p> },
]

function Harness() {
  const [active, setActive] = useState<AnalysisId | null>('sun')
  return <AnalysisCards cards={cards} active={active} onSelect={(id) => setActive((current) => (current === id ? null : id))} />
}

describe('AnalysisCards', () => {
  it('is a keyboard-reachable group with one card per analysis; the open card shows its controls', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const group = screen.getByRole('group', { name: 'Analysis cards' })
    const sun = within(group).getByTestId('analysis-card-sun')
    const noise = within(group).getByTestId('analysis-card-noise')
    expect(sun).toHaveAttribute('aria-expanded', 'true')
    expect(sun).toHaveTextContent('49°')
    expect(screen.getByRole('region', { name: 'Sun card' })).toHaveTextContent('Time slider')
    expect(noise).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Noise bands')).not.toBeInTheDocument()

    noise.focus()
    await user.keyboard('{Enter}')
    expect(noise).toHaveAttribute('aria-expanded', 'true')
    expect(sun).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('region', { name: 'Noise card' })).toHaveTextContent('Noise bands')
  })

  it('shows a dash and the hint for a value that cannot be calculated; the claim stays visible', () => {
    render(<Harness />)
    const noise = screen.getByRole('region', { name: 'Noise card' })
    expect(noise).toHaveTextContent('—')
    expect(noise).toHaveTextContent('No mapped roads')
    expect(noise).toHaveTextContent('Indicative road-noise screening')
    expect(screen.getByText('Indicative screening — not planning advice')).toBeVisible()
  })

  it('closes the open card when it is selected again', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const sun = screen.getByTestId('analysis-card-sun')
    await user.click(sun)
    expect(sun).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Time slider')).not.toBeInTheDocument()
  })
})
