import { describe, expect, it } from 'vitest'
import { parseLabParams, serializeTuning } from './params'
import { DEFAULT_TUNING } from '../../scene/style'

describe('parseLabParams (T7 reproducible URLs)', () => {
  it('parses a full URL to its values', () => {
    const params = parseLabParams('style=identity&stage=C&state=wind&preset=isometric&date=2026-06-21&minute=900')
    expect(params).toEqual({ styleId: 'identity', stage: 'C', stateId: 'wind', presetId: 'isometric', date: '2026-06-21', minute: 900, tuning: DEFAULT_TUNING })
  })

  it('falls back to defaults when the query is empty', () => {
    expect(parseLabParams('')).toEqual({ styleId: 'nordic', stage: 'C', stateId: 'neutral', presetId: 'isometric', date: '2026-06-21', minute: 900, tuning: DEFAULT_TUNING })
  })

  it('falls back per-field on invalid values', () => {
    const params = parseLabParams('style=bogus&stage=Z&state=unknown&preset=bird&date=not-a-date&minute=99999')
    expect(params.styleId).toBe('nordic')
    expect(params.stage).toBe('C')
    expect(params.stateId).toBe('neutral')
    expect(params.presetId).toBe('isometric')
    expect(params.date).toBe('2026-06-21')
    expect(params.minute).toBe(900)
  })

  it('accepts every stage, state and preset id', () => {
    for (const stage of ['A', 'B', 'C']) expect(parseLabParams(`stage=${stage}`).stage).toBe(stage)
    for (const state of ['neutral', 'sun-hours', 'wind', 'noise', 'water', 'slope', 'mass']) {
      expect(parseLabParams(`state=${state}`).stateId).toBe(state)
    }
    for (const preset of ['isometric', 'top', 'north', 'south', 'eyeLevel']) {
      expect(parseLabParams(`preset=${preset}`).presetId).toBe(preset)
    }
  })

  it('clamps the minute to the 0–1439 range', () => {
    expect(parseLabParams('minute=0').minute).toBe(0)
    expect(parseLabParams('minute=1439').minute).toBe(1439)
    expect(parseLabParams('minute=-1').minute).toBe(900)
    expect(parseLabParams('minute=1440').minute).toBe(900)
    expect(parseLabParams('minute=15.5').minute).toBe(900)
  })

  it('round-trips the tuning through the URL', () => {
    const tuning = { ...DEFAULT_TUNING, exposure: 1.5, vignetteStrength: 0.7, waterSheen: 0.3, contourSlopeMinDeg: 5, contourSlopeMaxDeg: 15 }
    const params = parseLabParams(`style=identity&tuning=${encodeURIComponent(serializeTuning(tuning))}`)
    expect(params.tuning).toEqual(tuning)
  })

  it('falls back to the default tuning on invalid tuning JSON', () => {
    expect(parseLabParams('style=identity&tuning=not-json').tuning).toEqual(DEFAULT_TUNING)
  })
})
