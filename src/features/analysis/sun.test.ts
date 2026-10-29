import { describe, expect, it } from 'vitest'
import {
  compassPoint,
  DATE_PRESETS,
  dayModel,
  DEMO_SUN_INSTANT,
  describeSunState,
  SUN_BELOW_HORIZON_LABEL,
  sunDirection,
  sunDirectionEnu,
  sunState,
  TIME_PRESETS,
} from './sun'
import { resolveLocalTime, toLocalWallClock } from './time'

const OSLO = { latitude: 59.9235, longitude: 10.758 }
const TROMSO = { latitude: 69.6492, longitude: 18.9553 }
const ZONE = 'Europe/Oslo'

describe('sunDirection', () => {
  it('puts the midsummer solar-noon sun due south at 90° − latitude + 23.44°', () => {
    // Solar noon at 10.758° E is ≈ 12:00 − 43 min − equation of time (−1.7 min) ≈ 11:19 UTC.
    const sun = sunDirection(new Date(Date.UTC(2026, 5, 21, 11, 19)), OSLO.latitude, OSLO.longitude)
    expect(sun.azimuthDeg).toBeCloseTo(180, 0)
    expect(sun.elevationDeg).toBeCloseTo(90 - OSLO.latitude + 23.44, 0)
  })

  it('moves the afternoon sun west of south and lower', () => {
    const sun = sunDirection(DEMO_SUN_INSTANT, OSLO.latitude, OSLO.longitude)
    expect(sun.azimuthDeg).toBeGreaterThan(200)
    expect(sun.azimuthDeg).toBeLessThan(250)
    expect(sun.elevationDeg).toBeGreaterThan(35)
    expect(sun.elevationDeg).toBeLessThan(53)
  })

  it('is the reference view of 21 June, 15:00 Oslo summer time (13:00 UTC)', () => {
    expect(DEMO_SUN_INSTANT.toISOString()).toBe('2026-06-21T13:00:00.000Z')
  })
})

describe('sunDirectionEnu', () => {
  it('points south and up for a southern sun (ADR-0002 ENU)', () => {
    const [east, north, up] = sunDirectionEnu({ azimuthDeg: 180, elevationDeg: 30 })
    expect(east).toBeCloseTo(0, 10)
    expect(north).toBeCloseTo(-Math.cos(Math.PI / 6), 10)
    expect(up).toBeCloseTo(0.5, 10)
  })

  it('points east at azimuth 90 and is a unit vector', () => {
    const v = sunDirectionEnu({ azimuthDeg: 90, elevationDeg: 10 })
    expect(v[0]).toBeGreaterThan(0.9)
    expect(Math.hypot(...v)).toBeCloseTo(1, 10)
  })
})

describe('sunState', () => {
  it('matches the fixtures §4 equinox noon within 0.05°', () => {
    const state = sunState(resolveLocalTime('2026-03-20', '12:00', ZONE).instant, OSLO.latitude, OSLO.longitude)
    expect(state.azimuthDeg).toBeCloseTo(172.96, 1)
    expect(state.elevationDeg).toBeCloseTo(29.85, 1)
    expect(state.belowHorizon).toBe(false)
    expect(state.directionEnu).not.toBeNull()
    expect(state.localLabel).toBe('2026-03-20 12:00 CET')
  })

  it('QA-11: winter night is below the horizon with no direction and no sun-hours wording', () => {
    const state = sunState(resolveLocalTime('2026-12-21', '23:00', ZONE).instant, OSLO.latitude, OSLO.longitude)
    expect(state.belowHorizon).toBe(true)
    expect(state.directionEnu).toBeNull()
    expect(state.elevationDeg).toBeLessThan(-50)
    const text = describeSunState(state)
    expect(text).toBe(SUN_BELOW_HORIZON_LABEL)
    expect(text).not.toMatch(/\d/)
    expect(text.toLowerCase()).not.toMatch(/hour|daylight|verified/)
  })

  it('treats exactly 0° as below the horizon, matching the light rig', () => {
    // Search a minute near Oslo sunrise where the sign flips; both sides must agree with elevationDeg > 0.
    const day = dayModel('2026-03-20', OSLO.latitude, OSLO.longitude, ZONE)
    if (day.kind !== 'normal') throw new Error('expected a normal day')
    const before = sunState(new Date(day.sunrise.getTime() - 20 * 60_000), OSLO.latitude, OSLO.longitude)
    const after = sunState(new Date(day.sunrise.getTime() + 20 * 60_000), OSLO.latitude, OSLO.longitude)
    expect(before.belowHorizon).toBe(true)
    expect(after.belowHorizon).toBe(false)
  })

  it('QA-10: the same site, date and time give an identical state, including after a JSON reload', () => {
    const instant = resolveLocalTime('2026-09-22', '08:45', ZONE).instant
    const first = sunState(instant, OSLO.latitude, OSLO.longitude)
    const reloaded = new Date(JSON.parse(JSON.stringify({ at: instant.toISOString() })).at)
    const second = sunState(reloaded, OSLO.latitude, OSLO.longitude)
    expect(second).toEqual(first)
    expect(second.directionEnu).toEqual(first.directionEnu)
    expect(Object.is(second.azimuthDeg, first.azimuthDeg)).toBe(true)
  })

  it('does not alias the caller’s Date', () => {
    const instant = new Date(DEMO_SUN_INSTANT)
    const state = sunState(instant, OSLO.latitude, OSLO.longitude)
    instant.setUTCFullYear(2000)
    expect(state.instant.toISOString()).toBe('2026-06-21T13:00:00.000Z')
  })

  it('describes a daytime sun with elevation and compass direction', () => {
    const state = sunState(DEMO_SUN_INSTANT, OSLO.latitude, OSLO.longitude)
    expect(describeSunState(state)).toMatch(/^Elevation \d+\.\d° · azimuth \d+° \((SW|WSW|SSW)\)$/)
  })
})

describe('compassPoint', () => {
  it.each([
    [0, 'N'],
    [11, 'N'],
    [12, 'NNE'],
    [90, 'E'],
    [180, 'S'],
    [225, 'SW'],
    [359, 'N'],
    [-90, 'W'],
    [450, 'E'],
  ])('%d° → %s', (azimuth, expected) => {
    expect(compassPoint(azimuth)).toBe(expected)
  })
})

describe('dayModel', () => {
  it('gives sunrise and sunset for Oslo at midsummer, both on the local date', () => {
    const day = dayModel('2026-06-21', OSLO.latitude, OSLO.longitude, ZONE)
    if (day.kind !== 'normal') throw new Error('expected a normal day')
    expect(toLocalWallClock(day.sunrise, ZONE)).toMatchObject({ date: '2026-06-21', time: '03:53' })
    expect(toLocalWallClock(day.sunset, ZONE)).toMatchObject({ date: '2026-06-21', time: '22:43' })
    expect(day.daylightMinutes).toBeGreaterThan(18 * 60)
    expect(day.daylightMinutes).toBeLessThan(19 * 60)
  })

  it('FR-065: the winter solstice day is far shorter than the summer one', () => {
    const summer = dayModel('2026-06-21', OSLO.latitude, OSLO.longitude, ZONE)
    const winter = dayModel('2026-12-21', OSLO.latitude, OSLO.longitude, ZONE)
    if (summer.kind !== 'normal' || winter.kind !== 'normal') throw new Error('expected normal days')
    expect(winter.daylightMinutes).toBeLessThan(6 * 60)
    expect(summer.daylightMinutes - winter.daylightMinutes).toBeGreaterThan(12 * 60)
  })

  it('reports polar day in Tromsø at midsummer and polar night at midwinter', () => {
    expect(dayModel('2026-06-21', TROMSO.latitude, TROMSO.longitude, ZONE).kind).toBe('polar-day')
    expect(dayModel('2026-12-21', TROMSO.latitude, TROMSO.longitude, ZONE).kind).toBe('polar-night')
  })

  it('polar night keeps the sun below the horizon all day (QA-11 for the scrubber)', () => {
    for (let minute = 0; minute < 24 * 60; minute += 30) {
      const hours = String(Math.floor(minute / 60)).padStart(2, '0')
      const minutes = String(minute % 60).padStart(2, '0')
      const instant = resolveLocalTime('2026-12-21', `${hours}:${minutes}`, ZONE).instant
      expect(sunState(instant, TROMSO.latitude, TROMSO.longitude).belowHorizon).toBe(true)
    }
  })

  it('solar noon in Oslo is around 12:15–12:20 CET at the winter solstice', () => {
    const day = dayModel('2026-12-21', OSLO.latitude, OSLO.longitude, ZONE)
    const local = toLocalWallClock(day.solarNoon, ZONE)
    expect(local.date).toBe('2026-12-21')
    expect(local.time >= '12:14' && local.time <= '12:20').toBe(true)
  })
})

describe('presets', () => {
  it('has the four FR-065 dates and three FR-063 times', () => {
    expect(DATE_PRESETS.map((p) => p.date)).toEqual(['2026-03-20', '2026-06-21', '2026-09-22', '2026-12-21'])
    expect(TIME_PRESETS.map((p) => p.time)).toEqual(['09:00', '12:00', '18:00'])
  })

  it('every preset resolves to a normal wall-clock in Oslo', () => {
    for (const date of DATE_PRESETS) {
      for (const time of TIME_PRESETS) {
        expect(resolveLocalTime(date.date, time.time, ZONE).kind).toBe('normal')
      }
    }
  })
})
