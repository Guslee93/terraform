import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { buildClimateView } from '../../features/analysis/climateView'
import { FLOW_DISCLAIMER } from '../../features/analysis/lbm'
import { ACTIVITY_NOTE, DEFAULT_WIND } from '../../features/analysis/climateView'
import { createFlowRunner } from '../../features/analysis/flowRunner'
import { flowFrame } from '../../features/analysis/lbm'
import { ClimatePanel } from './ClimatePanel'

const area: Vec2[] = [[0, 0], [40, 0], [40, 40], [0, 40]]
const road = { highway: 'primary', centreline: [[-100, 0], [100, 0]] as Vec2[] }

describe('buildClimateView', () => {
  it('shares sum to 1 and exclude building cells', () => {
    const block = { height: 10, footprint: [[0, 0], [20, 0], [20, 20], [0, 20]] as Vec2[] }
    const view = buildClimateView('noise', area, [block], [road], null)
    expect(view.assessed).toBe(12) // 16 cells − 4 inside the block
    expect(view.overlay.cells).toHaveLength(12)
    expect(view.legend.reduce((sum, entry) => sum + entry.share, 0)).toBeCloseTo(1, 9)
  })
  it('colours wind cells from the flow field, skipping building cells', () => {
    const block = { height: 10, footprint: [[0, 0], [20, 0], [20, 20], [0, 20]] as Vec2[] }
    const runner = createFlowRunner()
    runner.request({ id: 1, frame: flowFrame(area, 270, 32, 32), buildings: [block], reset: true })
    const flow = runner.tick(0)!
    expect(flow.settled).toBe(false)
    const view = buildClimateView('wind', area, [block], [], flow)
    expect(view.assessed).toBe(12)
    expect(view.legend.reduce((sum, entry) => sum + entry.share, 0)).toBeCloseTo(1, 9)
  })
  it('activity mode scales the ratio by the reference wind into Lawson-threshold bands', () => {
    const runner = createFlowRunner()
    runner.request({ id: 1, frame: flowFrame(area, 270, 32, 32), buildings: [], reset: true })
    const flow = runner.tick(0)!
    // Open ground: ratio ≈ 1, so 3 m/s → standing (2–4), 7 m/s → walking (6–8).
    const at = (refSpeed: number) => buildClimateView('wind', area, [], [], flow, { ...DEFAULT_WIND, display: 'activity', refSpeed })
    expect(at(3).legend.find((e) => e.share === 1)?.label).toMatch(/^Standing/)
    expect(at(7).legend.find((e) => e.share === 1)?.label).toMatch(/^Walking/)
    expect(at(7).disclaimer).toContain(ACTIVITY_NOTE)
  })
  it('reports nothing assessed when no mapped road matters', () => {
    expect(buildClimateView('noise', area, [], [], null).assessed).toBe(0)
  })
})

describe('ClimatePanel', () => {
  it('switches mode, shows the wind direction and the claim label', () => {
    const onMode = vi.fn()
    const onFrom = vi.fn()
    const view = buildClimateView('wind', area, [], [], null)
    render(<ClimatePanel mode="wind" onModeChange={onMode} wind={DEFAULT_WIND} onWindChange={onFrom} view={view} />)
    const dial = screen.getByLabelText('Wind blows from')
    expect(dial).toHaveValue('270')
    expect(dial).toHaveAttribute('aria-valuetext', 'W, 270 degrees')
    fireEvent.change(dial, { target: { value: '225' } })
    expect(onFrom).toHaveBeenCalledWith({ ...DEFAULT_WIND, from: 225 })
    fireEvent.click(screen.getByRole('checkbox', { name: /Downwash rule/ }))
    expect(onFrom).toHaveBeenLastCalledWith({ ...DEFAULT_WIND, downwash: false })
    expect(screen.queryByLabelText('Wind at 10 m height')).toBeNull()
    expect(screen.getByText(/Computing the wind flow/)).toBeInTheDocument()
    expect(screen.getByText(FLOW_DISCLAIMER)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Noise' }))
    expect(onMode).toHaveBeenCalledWith('noise')
  })
  it('explains an empty noise result instead of showing a blank legend', () => {
    const view = buildClimateView('noise', area, [], [], null)
    render(<ClimatePanel mode="noise" onModeChange={() => {}} wind={DEFAULT_WIND} onWindChange={() => {}} view={view} />)
    expect(screen.getByText(/nothing to estimate/)).toBeInTheDocument()
  })
})
