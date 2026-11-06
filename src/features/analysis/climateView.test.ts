import { describe, expect, it } from 'vitest'
import { DEFAULT_WIND, localSpeedMs, WIND_RAMP, windSpeedColour, windColour } from './climateView'

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
