import { describe, expect, it } from 'vitest'
import reference from '../../../docs/qa/sun-reference/nrel_spa_reference.json'
import { bearingDelta, noaaSunPosition } from './__fixtures__/noaa-oracle'
import { sunDirection } from './sun'
import { resolveLocalTime } from './time'

/**
 * Fixtures §4 solar verification protocol. Three independent sources:
 *   - suncalc 2.1.1 (the implementation)
 *   - the NOAA general solar position equations (`__fixtures__/noaa-oracle.ts`, test-only)
 *   - NREL SPA via pvlib 0.15.2 (`docs/qa/sun-reference/nrel_spa_reference.json`, D30)
 * Agreement is required to 0.5° while the sun is above the horizon. Below it, refraction
 * models diverge (fixtures §4 records 0.48° at −51°), so those rows are not compared.
 */

const SITES = {
  oslo: { latitude: 59.9235, longitude: 10.758 },
  tromso: { latitude: 69.6492, longitude: 18.9553 },
} as const

const TOLERANCE_DEG = 0.5
const ZONE = 'Europe/Oslo'

type ReferenceRow = (typeof reference)[number]

function parseUtc(row: ReferenceRow): Date {
  // "2026-03-20 11:00 UTC"
  return new Date(row.utc_datetime.replace(' UTC', ':00Z').replace(' ', 'T'))
}

describe('NOAA oracle vs suncalc, hourly through 2026', () => {
  it.each(Object.entries(SITES))('agree within 0.5° above the horizon at %s', (_name, site) => {
    let compared = 0
    let worstElevation = 0
    let worstAzimuth = 0
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 3_600_000) {
      const instant = new Date(t)
      const oracle = noaaSunPosition(instant, site.latitude, site.longitude)
      const sun = sunDirection(instant, site.latitude, site.longitude)
      if (oracle.apparentElevationDeg <= 0 || sun.elevationDeg <= 0) continue
      compared += 1
      worstElevation = Math.max(worstElevation, Math.abs(oracle.apparentElevationDeg - sun.elevationDeg))
      worstAzimuth = Math.max(worstAzimuth, bearingDelta(oracle.azimuthDeg, sun.azimuthDeg))
    }
    expect(compared).toBeGreaterThan(3000)
    expect(worstElevation).toBeLessThanOrEqual(TOLERANCE_DEG)
    expect(worstAzimuth).toBeLessThanOrEqual(TOLERANCE_DEG)
  })

  it('both agree the sun is up or down at every hour, except within 0.5° of the horizon', () => {
    const site = SITES.oslo
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 3_600_000) {
      const instant = new Date(t)
      const oracle = noaaSunPosition(instant, site.latitude, site.longitude).apparentElevationDeg
      const sun = sunDirection(instant, site.latitude, site.longitude).elevationDeg
      if (Math.abs(oracle) < TOLERANCE_DEG) continue
      expect(oracle > 0).toBe(sun > 0)
    }
  })
})

describe('NREL SPA table (pvlib) vs suncalc and the NOAA oracle', () => {
  const daytime = reference.filter((row) => row.apparent_elevation > 0)

  it('has both sites and the four fixture dates', () => {
    expect(new Set(reference.map((row) => row.site))).toEqual(new Set(['oslo', 'tromso']))
    expect(daytime.length).toBeGreaterThan(80)
  })

  it.each(daytime.map((row) => [row.site, row.local_datetime, row] as const))(
    '%s %s: suncalc and NOAA within 0.5° of NREL',
    (site, _label, row) => {
      const { latitude, longitude } = SITES[site as keyof typeof SITES]
      const instant = parseUtc(row)
      const sun = sunDirection(instant, latitude, longitude)
      const oracle = noaaSunPosition(instant, latitude, longitude)
      expect(Math.abs(sun.elevationDeg - row.apparent_elevation)).toBeLessThanOrEqual(TOLERANCE_DEG)
      expect(bearingDelta(sun.azimuthDeg, row.azimuth)).toBeLessThanOrEqual(TOLERANCE_DEG)
      expect(Math.abs(oracle.apparentElevationDeg - row.apparent_elevation)).toBeLessThanOrEqual(TOLERANCE_DEG)
      expect(bearingDelta(oracle.azimuthDeg, row.azimuth)).toBeLessThanOrEqual(TOLERANCE_DEG)
    },
  )

  it.each([
    ['2026-03-20', '12:00', 172.96, 29.85],
    ['2026-06-21', '12:00', 150.58, 51.01],
    ['2026-09-22', '12:00', 160.01, 28.82],
    ['2026-12-21', '12:00', 176.53, 6.71],
  ])('fixtures §4 row %s %s: suncalc within 0.05° of the independent value', (date, time, azimuth, elevation) => {
    const instant = resolveLocalTime(date, time, ZONE).instant
    const sun = sunDirection(instant, SITES.oslo.latitude, SITES.oslo.longitude)
    expect(bearingDelta(sun.azimuthDeg, azimuth)).toBeLessThanOrEqual(0.05)
    expect(Math.abs(sun.elevationDeg - elevation)).toBeLessThanOrEqual(0.05)
  })

  it('the NREL local labels resolve to the listed UTC instants through the time model', () => {
    for (const row of reference) {
      const [date, time] = row.local_datetime.split(' ')
      const resolved = resolveLocalTime(date ?? '', time ?? '', ZONE)
      expect(resolved.instant.getTime()).toBe(parseUtc(row).getTime())
    }
  })
})
