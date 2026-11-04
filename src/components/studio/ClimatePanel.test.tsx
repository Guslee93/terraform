import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { buildClimateView } from '../../features/analysis/climateView'
import { ClimatePanel } from './ClimatePanel'

const area: Vec2[] = [[0, 0], [40, 0], [40, 40], [0, 40]]
const road = { highway: 'primary', centreline: [[-100, 0], [100, 0]] as Vec2[] }

describe('buildClimateView', () => {
  it('shares sum to 1 and exclude building cells', () => {
    const block = { height: 10, footprint: [[0, 0], [20, 0], [20, 20], [0, 20]] as Vec2[] }
    const view = buildClimateView('noise', area, [block], [road], 270)
    expect(view.assessed).toBe(12) // 16 cells − 4 inside the block
    expect(view.overlay.cells).toHaveLength(12)
    expect(view.legend.reduce((sum, entry) => sum + entry.share, 0)).toBeCloseTo(1, 9)
  })
  it('reports nothing assessed when no mapped road matters', () => {
    expect(buildClimateView('noise', area, [], [], 270).assessed).toBe(0)
  })
})

describe('ClimatePanel', () => {
  it('switches mode, shows the wind direction and the claim label', () => {
    const onMode = vi.fn()
    const view = buildClimateView('wind', area, [], [], 270)
    render(<ClimatePanel mode="wind" onModeChange={onMode} windFrom={270} onWindFromChange={() => {}} view={view} />)
    expect(screen.getByLabelText('Wind blows from')).toHaveValue('270')
    expect(screen.getByText('Screening estimate — not a wind simulation')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Noise' }))
    expect(onMode).toHaveBeenCalledWith('noise')
  })
  it('explains an empty noise result instead of showing a blank legend', () => {
    const view = buildClimateView('noise', area, [], [], 270)
    render(<ClimatePanel mode="noise" onModeChange={() => {}} windFrom={270} onWindFromChange={() => {}} view={view} />)
    expect(screen.getByText(/nothing to estimate/)).toBeInTheDocument()
  })
})
