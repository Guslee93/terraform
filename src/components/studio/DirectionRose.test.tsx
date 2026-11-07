import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DirectionRose, ShareBar } from './DirectionRose'

const sectors = [0, 45, 90, 135, 180, 225, 270, 315].map((from, i) => ({ from, meanRatio: 0.5 + i * 0.05, shareAbove: from === 180 ? 0.12 : 0.02 }))

describe('DirectionRose', () => {
  it('draws one keyboard wedge per direction, names the worst, and selects on click or Enter', () => {
    const onSelect = vi.fn()
    render(<DirectionRose sectors={sectors} worstFrom={180} currentFrom={270} thresholdMs={4} msPerRatio={4} total={8} onSelect={onSelect} />)
    const wedges = screen.getAllByRole('button')
    expect(wedges).toHaveLength(8)
    expect(screen.getByRole('button', { name: /from S \(180°\).*worst direction/ })).toBeInTheDocument()
    expect(screen.getByText(/Worst direction:/)).toHaveTextContent('Worst direction: S 180° — mean 2.8 m/s, 12 % of open ground ≥ 4 m/s')
    fireEvent.click(screen.getByRole('button', { name: /from E \(90°\)/ }))
    expect(onSelect).toHaveBeenLastCalledWith(90)
    fireEvent.keyDown(screen.getByRole('button', { name: /from NW \(315°\)/ }), { key: 'Enter' })
    expect(onSelect).toHaveBeenLastCalledWith(315)
  })
  it('shows progress until every direction is solved', () => {
    render(<DirectionRose sectors={sectors.slice(0, 3)} worstFrom={0} currentFrom={0} thresholdMs={4} msPerRatio={4} total={8} onSelect={() => {}} />)
    expect(screen.getByText('3/8 directions solved…')).toBeInTheDocument()
  })
})

describe('ShareBar', () => {
  it('describes the non-zero shares for screen readers', () => {
    render(<ShareBar label="Share" entries={[{ label: 'A', colour: '#000', share: 0.75 }, { label: 'B', colour: '#fff', share: 0.25 }, { label: 'C', colour: '#f00', share: 0 }]} />)
    expect(screen.getByRole('img', { name: 'Share: A 75 %, B 25 %' })).toBeInTheDocument()
  })
})
