import { describe, expect, it } from 'vitest'
import { FLOW_DISCLAIMER } from './lbm'
import { profileFactor } from './windProfile'
import { ACTIVITY_BANDS, buildClimateView, captureBaseline, windCaption, DEFAULT_WIND, DELTA_BANDS, displayAt, flowAtHeight, windDrawLift, WORST_NOTE, DIRECTION_BANDS, localSpeedMs, particleColour, WIND_RAMP, windSpeedColour, windColour } from './climateView'

describe('Direction speed ramp', () => {
  it.each(WIND_RAMP)('matches $speed m/s', ({ speed, colour }) => expect(windSpeedColour(speed)).toBe(colour))
  it.each([[1, '#DAE5F7'], [3, '#8DB0F1'], [5, '#456BE0'], [7, '#553CD1'], [9, '#9F27C2']])('interpolates %s m/s', (speed, colour) => {
    expect(windSpeedColour(Number(speed))).toBe(colour)
  })
  it('clamps both ends and scales ratios by reference speed', () => {
    expect(windSpeedColour(-1)).toBe(WIND_RAMP[0].colour)
    expect(windSpeedColour(20)).toBe(WIND_RAMP[5].colour)
    // ratio 1 at the pedestrian slice with 8 m/s at 10 m → 8 × profileFactor(2) ≈ 5.62 m/s on the ramp
    expect(localSpeedMs(1, 8)).toBeCloseTo(8 * (2 / 10) ** 0.22, 9)
    expect(windColour(0.5, { ...DEFAULT_WIND, display: 'ratio', refSpeed: 8 })).toBe(windSpeedColour(localSpeedMs(0.5, 8)))
  })
  it('defaults to the pedestrian height, streamlines following buildings at 65% opacity', () => {
    expect(DEFAULT_WIND.heightM).toBe(2)
    expect(DEFAULT_WIND.streamlines3d).toBe(true)
    expect(DEFAULT_WIND.streamlineOpacity).toBe(0.65)
  })
})

// Audit 2026-11-07 regressions (docs/reviews/wind-status-audit-2026-11-07.md).
describe('audit fixes', () => {
  it('#1 particles use the map colour scale; a neutral blue in Delta', () => {
    const direction = { ...DEFAULT_WIND, display: 'ratio' as const }
    expect(particleColour(1.2, direction)).toBe(windColour(1.2, direction))
    expect(particleColour(1.2, DEFAULT_WIND)).toBe(windColour(1.2, DEFAULT_WIND))
    expect(particleColour(1.2, { ...DEFAULT_WIND, display: 'delta' })).toBe('#1E3A8A')
  })
  it('#2 Direction has an m/s legend coloured from the ramp', () => {
    expect(DIRECTION_BANDS.map((b) => b.label)).toEqual(['0–2 m/s', '2–4 m/s', '4–6 m/s', '6–8 m/s', '8–10 m/s', '10 m/s and above'])
    expect(DIRECTION_BANDS[2]!.colour).toBe(windSpeedColour(5))
  })
  it('#5 Comfort splits at the Lawson 10 m/s threshold', () => {
    const at = (ms: number) => ACTIVITY_BANDS.find((b) => ms < b.below)!.label
    expect(at(9)).toMatch(/^Uncomfortable \(8–10/)
    expect(at(12)).toMatch(/^Very uncomfortable \(10–15/)
    expect(at(16)).toMatch(/^Unsafe/)
  })
})

describe('worst-case view (ADR-0015)', () => {
  it('colours each cell by the Lawson band of its worst speed and labels the equal weighting', () => {
    // ref 6 m/s at 10 m → 1 ratio ≈ 4.2 m/s at 2 m: 0.3 → sitting, 1.2 → strolling, NaN skipped.
    const worst = { cells: new Float32Array([0, 0, 4, 0, 8, 0]), maxRatio: new Float32Array([0.3, 1.2, Number.NaN]) }
    const view = buildClimateView('wind', [], [], [], null, { ...DEFAULT_WIND, display: 'worst' }, 10, null, worst)
    expect(view.assessed).toBe(2)
    expect(view.legend.find((e) => e.label.startsWith('Sitting'))?.share).toBe(0.5)
    expect(view.legend.find((e) => e.label.startsWith('Strolling'))?.share).toBe(0.5)
    expect(view.disclaimer).toContain(WORST_NOTE)
    expect(view.disclaimer).not.toContain('Partial')
    const partial = buildClimateView('wind', [[0, 0], [8, 0], [8, 8]], [], [], null, { ...DEFAULT_WIND, display: 'worst' }, 10, null, { ...worst, solved: 3 })
    expect(partial.disclaimer).toContain('3 of 8 directions solved')
  })
})

// ADR-0028 phase 2: the wind map at a chosen height above terrain.
describe('the wind map at a chosen height', () => {
  // A 20 × 20 grid of 2 m cells. The 2 m field is 0.5× with a solid 8 m × 8 m block in the middle;
  // the 20 m slice is 1.2× everywhere, because the block is lower than 20 m.
  const n = 20, frame = { nx: n, ny: n, dx: 2, centre: [0, 0] as [number, number], flow: [1, 0] as [number, number] }
  const field = (ratio: number) => Float32Array.from({ length: n * n * 2 }, (_, i) => (i % 2 ? 0 : ratio))
  const groundSolid = Uint8Array.from({ length: n * n }, (_, k) => (Math.abs((k % n) - 9.5) < 2 && Math.abs(Math.floor(k / n) - 9.5) < 2 ? 1 : 0))
  const ground = Object.assign(field(0.5), {})
  for (let k = 0; k < n * n; k++) if (groundSolid[k]) { ground[2 * k] = 0 }
  const open = new Uint8Array(n * n)
  // Planned solves at 2, 20 and 25 m; the 25 m one is still computing.
  const flow = (upper = 1.2) => ({ id: 1, frame, settled: true, slicesComplete: false, velocity: ground, solid: groundSolid, sliceHeights: [2, 20, 25],
    slices: [{ z: 2, velocity: ground, solid: groundSolid }, { z: 20, velocity: field(upper), solid: open }] })
  const area: [number, number][] = [[-14, -14], [14, -14], [14, 14], [-14, 14]]
  const view = (wind: Partial<typeof DEFAULT_WIND>, f = flow(), baseline: ReturnType<typeof captureBaseline> | null = null) =>
    buildClimateView('wind', area, [], [], f, { ...DEFAULT_WIND, centre: [0, 0], ...wind }, 10, baseline)

  it('flowAtHeight keeps the solved ground field at 2 m and swaps in the slice above', () => {
    const f = flow()
    expect(flowAtHeight(f, 2)).toBe(f)
    expect(flowAtHeight(f, 20)!.velocity).toBe(f.slices[1]!.velocity)
    expect(flowAtHeight(f, 20)!.solid).toBe(open)
    // A height whose covering slice is still computing has no field.
    expect(flowAtHeight(f, 25)).toBeNull()
    expect(flowAtHeight(f, 30)).toBeNull()
  })

  it('shows any metre: the covering slice scaled by the wind profile (ADR-0029)', () => {
    const f = flow()
    // 23 m is covered by the 20 m solve: same obstacles, faster by the profile from 20 to 23 m.
    const at23 = flowAtHeight(f, 23)!
    expect(at23.solid).toBe(open)
    expect(at23.velocity[0]).toBeCloseTo(1.2 * profileFactor(23) / profileFactor(20), 6)
    // 12 m is covered by the ground solve: the block still blocks there.
    const at12 = flowAtHeight(f, 12)!
    expect(at12.solid).toBe(groundSolid)
    expect(at12.velocity[0]).toBeCloseTo(0.5 * profileFactor(12) / profileFactor(2), 6)
  })

  it('shows comfort classes at 2 m only, and speed in m/s above', () => {
    expect(displayAt({ ...DEFAULT_WIND, display: 'activity', heightM: 2 })).toBe('activity')
    expect(displayAt({ ...DEFAULT_WIND, display: 'activity', heightM: 10 })).toBe('ratio')
    expect(displayAt({ ...DEFAULT_WIND, display: 'delta', heightM: 10 })).toBe('delta')
    const upper = view({ display: 'activity', heightM: 20 })
    expect(upper.legend.map((e) => e.label)).toEqual(DIRECTION_BANDS.map((b) => b.label))
    // The comfort note (Lawson thresholds) belongs to 2 m only.
    expect(upper.disclaimer).not.toContain('Lawson')
    expect(view({ display: 'activity', heightM: 2 }).legend.map((e) => e.label)).toEqual(ACTIVITY_BANDS.map((b) => b.label))
  })

  it('colours each cell from the slice at that height', () => {
    const at2 = view({ display: 'ratio', heightM: 2 }), at20 = view({ display: 'ratio', heightM: 20 })
    expect(new Set(at2.overlay.cells.map((c) => c.colour))).toEqual(new Set([windSpeedColour(localSpeedMs(0.5, 6))]))
    expect(new Set(at20.overlay.cells.map((c) => c.colour))).toEqual(new Set([windSpeedColour(localSpeedMs(1.2, 6))]))
    // The block is lower than 20 m: its cells are holes at 2 m and carry wind at 20 m.
    expect(at20.assessed).toBeGreaterThan(at2.assessed)
  })

  it('draws nothing at a height that is still computing', () => {
    expect(view({ display: 'ratio', heightM: 25 }).assessed).toBe(0)
  })

  it('compares against the baseline at the same height', () => {
    const baseline = captureBaseline(flow(1.0), { centre: [0, 0], radius: 100 }, 270, true)
    const delta = view({ display: 'delta', heightM: 20 }, flow(1.2), baseline)
    expect(delta.assessed).toBeGreaterThan(0)
    // 1.2× now against 1.0× before: windier by 0.2 in every cell.
    expect(new Set(delta.overlay.cells.map((c) => c.colour))).toEqual(new Set([DELTA_BANDS[3]!.colour]))
    // A baseline without that slice cannot be compared at that height.
    const flat = captureBaseline({ ...flow(1.0), slices: [flow().slices[0]!] }, { centre: [0, 0], radius: 100 }, 270, true)
    expect(view({ display: 'delta', heightM: 20 }, flow(1.2), flat).assessed).toBe(0)
  })

  it('names the height in the map caption once the map is lifted (phase 4)', () => {
    expect(windCaption(2)).toBe(FLOW_DISCLAIMER)
    expect(windCaption(20)).toBe('Indicative wind screening at 20 m above terrain — 2D flow, not engineering')
    // The claim itself never changes: still indicative, still 2D, still not engineering.
    expect(windCaption(65)).toContain('2D flow, not engineering')
  })

  it('draws the map on the ground at 2 m and at terrain + height above', () => {
    expect(windDrawLift(2)).toBe(0)
    expect(windDrawLift(5)).toBe(5)
    expect(windDrawLift(30)).toBe(30)
  })
})
