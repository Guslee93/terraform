import { describe, expect, it } from 'vitest'
import { ACTIVITY_BANDS, buildClimateView, DEFAULT_WIND, WORST_NOTE, DIRECTION_BANDS, localSpeedMs, particleColour, WIND_RAMP, windSpeedColour, windColour } from './climateView'

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
  it('defaults to following buildings at 65% opacity', () => {
    expect(DEFAULT_WIND.streamlineHeight).toBeNull()
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
  })
})
