import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { baselineMatches, captureBaseline, deltaBand, DELTA_NOTE, buildClimateView } from '../../features/analysis/climateView'
import { FLOW_DISCLAIMER } from '../../features/analysis/lbm'
import { ACTIVITY_NOTE, DEFAULT_WIND } from '../../features/analysis/climateView'
import { createFlowRunner } from '../../features/analysis/flowRunner'
import { flowFrame } from '../../features/analysis/lbm'
import { circlePolygon } from '../../features/analysis/grid'
import { polygonArea } from '../../lib/polygon'
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
    expect(view.assessed).toBe(75) // 4 m wind cells: 100 − 25 inside the block
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
  it('clips the wind view to the analysis circle', () => {
    const disc = circlePolygon([20, 20], 15)
    expect(Math.abs(polygonArea(disc) - Math.PI * 15 * 15) / (Math.PI * 15 * 15)).toBeLessThan(0.01)
    const runner = createFlowRunner()
    runner.request({ id: 1, frame: flowFrame(disc, 270, 32, 32), buildings: [], reset: true })
    const view = buildClimateView('wind', disc, [], [], runner.tick(0)!)
    for (const cell of view.overlay.cells) expect(Math.hypot(cell.x - 20, cell.y - 20)).toBeLessThanOrEqual(15)
    expect(view.assessed).toBeGreaterThan(0)
  })
  it('toggles circle placement', () => {
    const onPlace = vi.fn()
    render(<ClimatePanel mode="wind" onModeChange={() => {}} wind={DEFAULT_WIND} onWindChange={() => {}} view={null} onPlaceCircle={onPlace} />)
    fireEvent.click(screen.getByRole('button', { name: 'Move circle' }))
    expect(onPlace).toHaveBeenCalledWith(true)
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
    expect(screen.getByLabelText('Wind at 10 m height')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Comfort' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Direction' }))
    expect(onFrom).toHaveBeenLastCalledWith({ ...DEFAULT_WIND, display: 'ratio' })
    fireEvent.change(screen.getByLabelText('Analysis circle'), { target: { value: '150' } })
    expect(onFrom).toHaveBeenLastCalledWith({ ...DEFAULT_WIND, radius: 150 })
    expect(screen.getByText(/Computing the wind flow/)).toBeInTheDocument()
    expect(screen.getByText(`${ACTIVITY_NOTE} ${FLOW_DISCLAIMER}`)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Noise' }))
    expect(onMode).toHaveBeenCalledWith('noise')
  })
  it('explains an empty noise result instead of showing a blank legend', () => {
    const view = buildClimateView('noise', area, [], [], null)
    render(<ClimatePanel mode="noise" onModeChange={() => {}} wind={DEFAULT_WIND} onWindChange={() => {}} view={view} />)
    expect(screen.getByText(/nothing to estimate/)).toBeInTheDocument()
  })
})


describe('baseline delta', () => {
  const frame = flowFrame(area, 270, 32, 32)
  const velocity = new Float32Array(32 * 32 * 2)
  for (let i = 0; i < velocity.length; i += 2) velocity[i] = 1
  const flow = { id: 1, frame, velocity, solid: new Uint8Array(32 * 32), settled: true }
  const circle = { centre: [20, 20] as Vec2, radius: 100 }
  const baseline = captureBaseline(flow, circle, 270)
  it('copies the baseline buffers and frame', () => {
    expect(baseline.flow.velocity).not.toBe(flow.velocity)
    expect(baseline.flow.solid).not.toBe(flow.solid)
    expect(baseline.flow.frame).not.toBe(flow.frame)
    expect(baseline.flow.velocity).toEqual(flow.velocity)
  })
  it.each([[-0.5, 'much-calmer'], [-0.3, 'much-calmer'], [-0.2, 'calmer'], [-0.1, 'same'], [0, 'same'], [0.1, 'same'], [0.2, 'windier'], [0.3, 'much-windier']])('bands delta %s', (value, band) => {
    expect(deltaBand(Number(value)).band).toBe(band)
  })
  it('subtracts baseline ratios at the same local point', () => {
    const nextVelocity = velocity.map((v) => v * 1.5)
    const wind = { ...DEFAULT_WIND, display: 'delta' as const, centre: circle.centre }
    const view = buildClimateView('wind', area, [], [], { ...flow, velocity: nextVelocity }, wind, 10, baseline)
    expect(view.assessed).toBeGreaterThan(0)
    expect(view.legend.find((e) => e.share === 1)?.label).toContain('≥ +0.3')
    expect(buildClimateView('wind', area, [], [], flow, { ...wind, from: 90 }, 10, baseline).assessed).toBe(0)
    expect(baselineMatches(baseline, { ...circle, centre: [21, 20] }, 270)).toBe(false)
    expect(baselineMatches(baseline, { ...circle, radius: 90 }, 270)).toBe(false)
  })
  it('shows Delta only with a baseline and explains mismatches', () => {
    const onSet = vi.fn()
    const onClear = vi.fn()
    const onStreamlines = vi.fn()
    const props = { mode: 'wind' as const, onModeChange: vi.fn(), wind: DEFAULT_WIND, onWindChange: vi.fn(), view: null }
    const { rerender } = render(<ClimatePanel {...props} onSetBaseline={onSet} />)
    expect(screen.queryByRole('button', { name: 'Delta' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Set baseline' })).toBeDisabled()
    rerender(<ClimatePanel {...props} baseline={baseline} baselineMismatch canSetBaseline onSetBaseline={onSet} onClearBaseline={onClear} onStreamlinesChange={onStreamlines} />)
    expect(screen.getByRole('button', { name: 'Delta' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Baseline was taken for W 270°, r = 100 m. Reset it to compare.')
    fireEvent.click(screen.getByRole('button', { name: 'Set baseline' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear baseline' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Streamlines' }))
    expect(onSet).toHaveBeenCalledOnce()
    expect(onClear).toHaveBeenCalledOnce()
    expect(onStreamlines).toHaveBeenCalledWith(true)
    rerender(<ClimatePanel {...props} baseline={baseline} wind={{ ...DEFAULT_WIND, display: 'delta' }} />)
    expect(screen.getByText(DELTA_NOTE)).toBeInTheDocument()
  })
})
