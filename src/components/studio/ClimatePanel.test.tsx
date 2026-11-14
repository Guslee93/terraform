import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { baselineMatches, captureBaseline, deltaBand, DELTA_NOTE, buildClimateView } from '../../features/analysis/climateView'
import { FLOW_DISCLAIMER } from '../../features/analysis/lbm'
import { ACTIVITY_NOTE, DEFAULT_WIND } from '../../features/analysis/climateView'
import { createFlowRunner } from '../../features/analysis/flowRunner'
import { flowFrame } from '../../features/analysis/lbm'
import { circlePolygon } from '../../features/analysis/grid'
import { polygonArea } from '../../lib/polygon'
import { ClimatePanel, useWindDemo } from './ClimatePanel'

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
    expect(at(7).legend.find((e) => e.share === 1)?.label).toMatch(/^Strolling/) // 7 m/s at 10 m ≈ 4.9 m/s at 2 m
    expect(at(10).legend.find((e) => e.share === 1)?.label).toMatch(/^Walking/) // ≈ 7.0 m/s
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
  it('says the wind model ignores the slope only on steep sites', () => {
    const view = buildClimateView('wind', area, [], [], null)
    const { rerender } = render(<ClimatePanel mode="wind" onModeChange={() => {}} wind={DEFAULT_WIND} onWindChange={() => {}} view={view} terrainReliefM={4} />)
    expect(screen.queryByText(/Steep site/)).toBeNull()
    rerender(<ClimatePanel mode="wind" onModeChange={() => {}} wind={DEFAULT_WIND} onWindChange={() => {}} view={view} terrainReliefM={23.4} />)
    expect(screen.getByText(/Steep site: the ground rises about 23 m across this circle/)).toBeVisible()
  })
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
  const baseline = captureBaseline(flow, circle, 270, DEFAULT_WIND.downwash)
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
    expect(screen.getByRole('status')).toHaveTextContent('Baseline was taken for W 270°, r = 100 m, downwash rule on. Reset it to compare.')
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


describe('wind demo playback', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  function setup(reduced = false) {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reduced })))
    const restored = vi.fn()
    const original = { ...DEFAULT_WIND, from: 135 }
    function Demo() {
      const [wind, setWind] = useState(original)
      const [streamlines, setStreamlines] = useState(true)
      const demo = useWindDemo(wind, streamlines, setWind, setStreamlines)
      return <>
        <ClimatePanel mode="wind" onModeChange={() => {}} wind={wind} onWindChange={setWind} view={null}
          streamlines={streamlines} demoPlaying={demo.playing} onToggleDemo={demo.toggle} />
        <button onPointerDown={demo.stop}>Canvas stand-in</button>
        <output aria-label="Demo orbit">{demo.orbitDeg ?? 'stopped'}</output>
        <button onClick={() => restored(wind, streamlines)}>Read settings</button>
      </>
    }
    const result = render(<Demo />)
    const button = screen.getByRole('button', { name: 'Play demo' })
    const expectRestored = () => {
      expect(button).toHaveAttribute('aria-pressed', 'false')
      fireEvent.click(screen.getByRole('button', { name: 'Read settings' }))
      expect(restored).toHaveBeenLastCalledWith(original, true)
      expect(vi.getTimerCount()).toBe(0)
    }
    return { ...result, button, expectRestored }
  }

  it('toggles and restores the original wind and streamlines on a second click', () => {
    const { button, expectRestored } = setup()
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Wind blows from')).toHaveValue('270')
    expect(screen.getByRole('checkbox', { name: 'Streamlines' })).not.toBeChecked()
    act(() => vi.advanceTimersByTime(5000))
    fireEvent.click(button)
    expectRestored()
  })

  it.each(['Escape', 'a', 'Enter', ' '])('stops and restores on key %s', (key) => {
    const { button, expectRestored } = setup()
    fireEvent.click(button)
    fireEvent.keyDown(button, { key })
    expectRestored()
  })

  it('stops and restores on canvas pointer-down', () => {
    const { button, expectRestored } = setup()
    fireEvent.click(button)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Canvas stand-in' }))
    expectRestored()
  })

  it('enables streamlines at 15 seconds and restores at completion', () => {
    const { button, expectRestored } = setup()
    fireEvent.click(button)
    act(() => vi.advanceTimersByTime(15020))
    expect(screen.getByRole('checkbox', { name: 'Streamlines' })).toBeChecked()
    act(() => vi.advanceTimersByTime(5000))
    expectRestored()
  })

  it('keeps the orbit still under reduced motion', () => {
    const { button } = setup(true)
    fireEvent.click(button)
    for (let i = 0; i < 4; i++) {
      expect(screen.getByLabelText('Demo orbit')).toHaveTextContent('0')
      act(() => vi.advanceTimersByTime(3000))
    }
  })

  it('cancels its scheduled frame when unmounted', () => {
    const { button, unmount } = setup()
    fireEvent.click(button)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})

it('disables upper controls until slices exist and exposes Direction reference speed', () => {
  const onWindChange = vi.fn()
  const props = { mode: 'wind' as const, onModeChange: vi.fn(), wind: { ...DEFAULT_WIND, display: 'ratio' as const }, onWindChange, view: null }
  const { rerender } = render(<ClimatePanel {...props} />)
  expect(screen.getByLabelText('Follow buildings in 3D')).toBeDisabled()
  expect(screen.getByLabelText('Streamline opacity')).toBeDisabled()
  expect(screen.getByText(/Upper heights computing… ready to 2 m of 30 m/)).toBeInTheDocument()
  expect(screen.getByLabelText('Wind at 10 m height')).toBeEnabled()
  // Every whole metre (ADR-0029); a height still computing lands on the highest ready one.
  const height = screen.getByRole('slider', { name: 'Height above terrain' })
  expect(height).toBeEnabled()
  expect(height).toHaveAttribute('min', '2')
  expect(height).toHaveAttribute('max', '30')
  expect(height).toHaveAttribute('aria-valuetext', '2 metres above terrain')
  fireEvent.change(height, { target: { value: '20' } })
  expect(onWindChange).toHaveBeenLastCalledWith({ ...props.wind, heightM: 2 })
  // Progressive: the ground solve covers up to the first roof (here 13 m); 20 m is still computing.
  const upTo = (top: number) => Array.from({ length: top - 1 }, (_, i) => i + 2)
  rerender(<ClimatePanel {...props} availableHeights={upTo(12)} />)
  expect(screen.getByText(/ready to 12 m of 30 m/)).toBeInTheDocument()
  expect(screen.getByLabelText('Follow buildings in 3D')).toBeDisabled() // 3D streamlines need the whole stack
  fireEvent.change(height, { target: { value: '20' } })
  expect(onWindChange).toHaveBeenLastCalledWith({ ...props.wind, heightM: 12 })
  rerender(<ClimatePanel {...props} availableHeights={upTo(30)} slicesComplete />)
  expect(screen.queryByText(/Upper heights computing/)).toBeNull()
  expect(screen.getByLabelText('Follow buildings in 3D')).toBeEnabled()
  expect(screen.getByLabelText('Streamline opacity')).toBeEnabled()
  fireEvent.change(height, { target: { value: '17' } })
  expect(onWindChange).toHaveBeenLastCalledWith({ ...props.wind, heightM: 17 })
  fireEvent.change(screen.getByLabelText('Streamline opacity'), { target: { value: '0.5' } })
  expect(onWindChange).toHaveBeenLastCalledWith({ ...props.wind, streamlineOpacity: 0.5 })
  fireEvent.click(screen.getByLabelText('Follow buildings in 3D'))
  expect(onWindChange).toHaveBeenLastCalledWith({ ...props.wind, streamlines3d: false })
})

it('above 2 m the map shows m/s: Comfort is disabled and says why (ADR-0028)', () => {
  const props = { mode: 'wind' as const, onModeChange: vi.fn(), onWindChange: vi.fn(), view: null, availableHeights: Array.from({ length: 29 }, (_, i) => i + 2), slicesComplete: true }
  const { rerender } = render(<ClimatePanel {...props} wind={{ ...DEFAULT_WIND, display: 'activity', heightM: 20 }} />)
  const comfort = screen.getByRole('button', { name: 'Comfort' })
  expect(comfort).toBeDisabled()
  expect(comfort).toHaveAccessibleDescription(/Comfort classes apply at 2 m only/)
  expect(screen.getByRole('button', { name: 'Direction' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText(/Wind speed at 20 m above terrain, in m\/s/)).toBeInTheDocument()
  rerender(<ClimatePanel {...props} wind={{ ...DEFAULT_WIND, display: 'activity', heightM: 2 }} />)
  expect(screen.getByRole('button', { name: 'Comfort' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Comfort' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByText(/above terrain, in m\/s/)).toBeNull()
})

it('on a steep site the lifted map says it follows the ground but is solved flat (phase 4)', () => {
  // The note sits with the legend, so the panel needs a (here empty) wind view.
  const view = { overlay: { cellM: 4, cells: [] }, legend: [], disclaimer: 'Indicative wind screening — 2D flow, not engineering', assessed: 0 }
  const props = { mode: 'wind' as const, onModeChange: vi.fn(), onWindChange: vi.fn(), view, terrainReliefM: 24 }
  const { rerender } = render(<ClimatePanel {...props} wind={{ ...DEFAULT_WIND, heightM: 2 }} />)
  expect(screen.getByText(/Steep site/)).not.toHaveTextContent('solved as a flat slice')
  rerender(<ClimatePanel {...props} wind={{ ...DEFAULT_WIND, heightM: 20 }} />)
  expect(screen.getByText(/Steep site/)).toHaveTextContent('each height is still solved as a flat slice')
})

it('above 2 m the streamline controls are off and say the flow shows as particles (owner, 2026-11-13)', () => {
  const props = { mode: 'wind' as const, onModeChange: vi.fn(), onWindChange: vi.fn(), view: null, availableHeights: Array.from({ length: 29 }, (_, i) => i + 2), slicesComplete: true }
  const { rerender } = render(<ClimatePanel {...props} wind={{ ...DEFAULT_WIND, heightM: 20 }} />)
  const toggle = screen.getByRole('checkbox', { name: 'Streamlines' })
  expect(toggle).toBeDisabled()
  expect(toggle).toHaveAccessibleDescription(/particles at the chosen height/)
  expect(screen.getByLabelText('Follow buildings in 3D')).toBeDisabled()
  expect(screen.getByLabelText('Streamline opacity')).toBeDisabled()
  rerender(<ClimatePanel {...props} wind={{ ...DEFAULT_WIND, heightM: 2 }} />)
  expect(screen.getByRole('checkbox', { name: 'Streamlines' })).toBeEnabled()
  expect(screen.getByLabelText('Follow buildings in 3D')).toBeEnabled()
})

it('the worst case is a 2 m screen: choosing it returns to 2 m and locks the height', () => {
  const onWindChange = vi.fn()
  const sweep = { sectors: [{ from: 0, meanRatio: 0.6, shareAbove: 0.1 }], worstFrom: 0, total: 8 }
  const { rerender } = render(<ClimatePanel mode="wind" onModeChange={vi.fn()} onWindChange={onWindChange} view={null} sweepOn sweep={sweep} wind={{ ...DEFAULT_WIND, display: 'ratio', heightM: 20 }} />)
  fireEvent.click(screen.getByRole('button', { name: 'Worst case' }))
  expect(onWindChange).toHaveBeenLastCalledWith({ ...DEFAULT_WIND, display: 'worst', heightM: 2 })
  rerender(<ClimatePanel mode="wind" onModeChange={vi.fn()} onWindChange={onWindChange} view={null} sweepOn sweep={sweep} wind={{ ...DEFAULT_WIND, display: 'worst', heightM: 2 }} />)
  expect(screen.getByLabelText('Height above terrain')).toBeDisabled()
})

it('#8 an edit during Play demo stops it, restores the saved settings and keeps the edit', () => {
  const onDemoEdit = vi.fn()
  const onWindChange = vi.fn()
  render(<ClimatePanel mode="wind" onModeChange={() => {}} wind={{ ...DEFAULT_WIND, from: 15 }} onWindChange={onWindChange} view={null} demoPlaying onDemoEdit={onDemoEdit} />)
  fireEvent.change(screen.getByLabelText('Analysis circle'), { target: { value: '150' } })
  expect(onDemoEdit).toHaveBeenCalledWith({ radius: 150 })
  expect(onWindChange).not.toHaveBeenCalled()
})

it('#8 useWindDemo.stopWith restores the pre-demo settings plus the patch', () => {
  // Stable setters, as in StudioShell: an inline callback would change `stop` every render.
  function Demo() {
    const [wind, setWind] = useState({ ...DEFAULT_WIND, from: 135 })
    const [streamlines, setStreamlines] = useState(false)
    const demo = useWindDemo(wind, streamlines, setWind, setStreamlines)
    return <><button onClick={demo.toggle}>go</button><button onClick={() => demo.stopWith({ radius: 200 })}>edit</button><output aria-label="from">{wind.from}</output><output aria-label="radius">{wind.radius}</output></>
  }
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
  render(<Demo />)
  fireEvent.click(screen.getByRole('button', { name: 'go' }))
  fireEvent.click(screen.getByRole('button', { name: 'edit' }))
  expect(screen.getByLabelText('from')).toHaveTextContent('135')
  expect(screen.getByLabelText('radius')).toHaveTextContent('200')
  vi.unstubAllGlobals()
})
