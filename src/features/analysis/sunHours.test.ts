import { describe, expect, it } from 'vitest'
import { getTimes } from 'suncalc'
import compactBuildings from '../../../public/sites/compact-infill/buildings.json'
import compactStudyArea from '../../../public/sites/compact-infill/study-area.json'
import { normalizeRing } from '../../lib/polygon'
import { parseBuildings, parseStudyArea } from '../sites/package'
import { daySunSamples } from './shadowRay'
import { computeSunHours, medianSunHours, sunHoursBand } from './sunHours'
import { resolveLocalTime, type LocalDate } from './time'
import type { FootprintBuilding } from './grid'
import type { Vec2 } from '../../lib/coordinates'

const OSLO = { latitude: 59.9139, longitude: 10.7522, timeZone: 'Europe/Oslo' }

const box = (centre: Vec2, width: number, depth: number, height: number): FootprintBuilding => {
  const [x, y] = centre
  return {
    height,
    footprint: [
      [x - width / 2, y - depth / 2],
      [x + width / 2, y - depth / 2],
      [x + width / 2, y + depth / 2],
      [x - width / 2, y + depth / 2],
    ],
  }
}

const square = (centre: Vec2, half: number): Vec2[] => [
  [centre[0] - half, centre[1] - half],
  [centre[0] + half, centre[1] - half],
  [centre[0] + half, centre[1] + half],
  [centre[0] - half, centre[1] + half],
]

const daylightHours = (date: LocalDate): number => {
  const times = getTimes(resolveLocalTime(date, '12:00', OSLO.timeZone).instant, OSLO.latitude, OSLO.longitude)
  if (!times.sunrise || !times.sunset) throw new Error(`No sunrise/sunset for ${date}`)
  return (times.sunset.getTime() - times.sunrise.getTime()) / 3_600_000
}

describe('ground sun hours', () => {
  it.each(['2026-06-21', '2026-12-21'] as const)('matches the geometric day length on %s without buildings', (date) => {
    const samples = daySunSamples(date, OSLO)
    const hours = medianSunHours(computeSunHours(square([0, 0], 40), [], samples))
    // One sample is worth 15 minutes, so the count can sit at either edge of the day.
    expect(hours).not.toBeNull()
    expect(Math.abs((hours ?? 0) - daylightHours(date))).toBeLessThanOrEqual(15 / 60 + 1e-9)
  })

  it('puts a point north of a 30 m block in shade all day and a point 5 m south in full sun', () => {
    const block = box([0, 0], 20, 20, 30)
    const samples = daySunSamples('2026-12-21', OSLO)
    const north = computeSunHours(square([0, 15], 5), [block], samples)
    const south = computeSunHours(square([0, -15], 5), [block], samples)
    expect(north).toHaveLength(1)
    expect(north[0]?.hours).toBe(0)
    // Unobstructed south cell: every above-horizon sample counts.
    expect(south[0]?.hours).toBeCloseTo(samples.length * 0.25, 10)
  })

  it('leaves cells inside a building unassessed', () => {
    const block = box([0, 0], 20, 20, 12)
    const cells = computeSunHours(square([0, 0], 20), [block], daySunSamples('2026-06-21', OSLO))
    expect(cells.some((cell) => cell.hours === null)).toBe(true)
    expect(cells.find((cell) => cell.x === 5 && cell.y === 5)?.band).toBeNull()
  })

  it('reports the median of assessed cells', () => {
    const cells = [
      { x: 0, y: 0, hours: 1, band: '0-20' as const },
      { x: 1, y: 0, hours: null, band: null },
      { x: 2, y: 0, hours: 5, band: '40-60' as const },
      { x: 3, y: 0, hours: 9, band: '80+' as const },
    ]
    expect(medianSunHours(cells)).toBe(5)
    expect(medianSunHours([])).toBeNull()
  })

  it('bands by share of the day, so a long summer day does not saturate the top band', () => {
    expect(sunHoursBand(0, 19)).toBe('0-20')
    expect(sunHoursBand(4, 19)).toBe('20-40')
    expect(sunHoursBand(8.5, 19)).toBe('40-60')
    expect(sunHoursBand(12, 19)).toBe('60-80')
    expect(sunHoursBand(19, 19)).toBe('80+')
    // The same 5 h is a short day's full sun but a small share of midsummer.
    expect(sunHoursBand(5, 6)).toBe('80+')
    expect(sunHoursBand(5, 19)).toBe('20-40')
    expect(sunHoursBand(3, 0)).toBe('0-20')
  })

  it('stays inside the 150 ms budget on the real compact site', () => {
    const buildings = parseBuildings(compactBuildings).buildings.map((building) => ({
      height: building.height,
      footprint: building.footprint,
    }))
    const area = normalizeRing(parseStudyArea(compactStudyArea).polygon)
    const samples = daySunSamples('2026-06-21', OSLO)
    const start = performance.now()
    const cells = computeSunHours(area, buildings, samples, 10)
    const elapsed = performance.now() - start
    console.info(
      `[sun-hours] ${elapsed.toFixed(1)} ms · ${cells.length} cells · ${buildings.length} buildings · ${samples.length} samples`,
    )
    expect(cells.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(150)
  })
})

describe('sun hours on the shipped site', () => {
  it('computes the study-area ground hours within a usable budget', () => {
    const context = parseBuildings(compactBuildings).buildings
    const buildings = context.map((building) => ({ height: building.height, footprint: building.footprint }))
    const area = normalizeRing(parseStudyArea(compactStudyArea).polygon)
    const samples = daySunSamples('2026-06-21', OSLO)
    const start = performance.now()
    const cells = computeSunHours(area, buildings, samples, 10)
    const elapsed = performance.now() - start
    console.info(`[sun-hours] ${elapsed.toFixed(0)} ms · ${buildings.length} context buildings · ${cells.length} cells`)
    expect(cells.length).toBeGreaterThan(0)
    // The studio computes this on the main thread when the Sun group opens.
    expect(elapsed).toBeLessThan(1500)
  })
})
