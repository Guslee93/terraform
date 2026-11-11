import { describe, expect, it } from 'vitest'
import compactBuildings from '../../../public/sites/compact-infill/buildings.json'
import { parseBuildings } from '../sites/package'
import type { FootprintBuilding } from './grid'
import {
  annualSunSamples,
  clearSkyDni,
  computeRoofSolar,
  medianRoofSolar,
  ROOF_SOLAR_DAYS_IN_MONTH,
  roofSolarBand,
  roofSolarLegend,
} from './roofSolar'

const OSLO = { latitude: 59.9139, longitude: 10.7522, timeZone: 'Europe/Oslo' }

const box = (centre: readonly [number, number], width: number, depth: number, height: number): FootprintBuilding => {
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

describe('clear-sky annual roof irradiation', () => {
  it('weights the twelve representative days to 365', () => {
    expect(ROOF_SOLAR_DAYS_IN_MONTH.reduce((sum, days) => sum + days, 0)).toBe(365)
    const samples = annualSunSamples(OSLO)
    expect(samples.length).toBeGreaterThan(0)
    expect(samples.every((sample) => sample.elevationDeg > 0 && sample.weightHours > 0)).toBe(true)
  })

  it('uses Meinel direct normal irradiance at the stated constants', () => {
    expect(clearSkyDni(90)).toBeCloseTo(947.1, 6)
    expect(clearSkyDni(0)).toBe(0)
    expect(clearSkyDni(30)).toBeCloseTo(1353 * 0.7 ** (2 ** 0.678), 6)
  })

  it('returns a plausible unshaded annual total in Oslo', () => {
    const [value] = computeRoofSolar([box([0, 0], 100, 100, 10)], OSLO)
    expect(value).toBeDefined()
    // Meinel DNI = 1353 × 0.7^(AM^0.678), 10 % diffuse always added, 15th of each month at 30-min
    // steps, monthly weights; unshaded horizontal roof at 59.9° N. Upper bound, no clouds.
    console.info(`[roof-solar] unshaded Oslo roof ${value?.kwhPerM2.toFixed(1)} kWh/m²·yr`)
    expect(value?.kwhPerM2).toBeCloseTo(1239.3, 1)
    // The label says "upper bound": a clear sky must exceed Oslo's real, cloudy horizontal total
    // (roughly 850–950 kWh/m²·yr). The first version used 1000 W/m² and landed at 916, i.e. not.
    expect(value?.kwhPerM2 ?? 0).toBeGreaterThan(1000)
  })

  it('leaves the part of a podium roof under a tower out of its value', () => {
    const podium = box([0, 0], 20, 20, 12)
    const tower = box([0, 0], 16, 16, 40)
    const alone = computeRoofSolar([podium], OSLO)[0]!
    const [withTower, top] = computeRoofSolar([podium, tower], OSLO)
    // The covered middle is not roof; the open ring around the tower is only partly shaded.
    expect(withTower!.exposedShare).toBeGreaterThan(0.2)
    expect(withTower!.exposedShare).toBeLessThan(0.5)
    expect(withTower!.kwhPerM2).toBeGreaterThan(600)
    expect(withTower!.kwhPerM2).toBeLessThan(alone.kwhPerM2)
    expect(top!.exposedShare).toBe(1)
  })

  it('lowers the value when a much taller block stands to the south', () => {
    const roof = box([0, 0], 20, 20, 10)
    const tower = box([0, -50], 60, 60, 30)
    const open = computeRoofSolar([roof], OSLO)[0]?.kwhPerM2 ?? 0
    const shaded = computeRoofSolar([roof, tower], OSLO)[0]?.kwhPerM2 ?? 0
    expect(shaded).toBeLessThan(open)
  })

  it('uses the centroid for a roof under 4 m²', () => {
    const tiny = box([0, 0], 1.8, 1.8, 5)
    const [value] = computeRoofSolar([tiny], OSLO)
    expect(value?.sampleCount).toBe(1)
  })

  it('reports descriptive bands, a median and a legend', () => {
    expect(roofSolarBand(0)).toBe('0-300')
    expect(roofSolarBand(300)).toBe('300-600')
    expect(roofSolarBand(600)).toBe('600-900')
    expect(roofSolarBand(900)).toBe('900-1200')
    expect(roofSolarBand(1200)).toBe('1200+')
    const values = [
      { kwhPerM2: 100, sampleCount: 1, analysed: true },
      { kwhPerM2: 1300, sampleCount: 1, analysed: true },
    ]
    expect(medianRoofSolar(values)).toBe(700)
    expect(roofSolarLegend(values).find((entry) => entry.label.startsWith('1200'))?.share).toBe(0.5)
  })

  it('measures the site roofs within the worker budget and leaves the context unmeasured', () => {
    const context = parseBuildings(compactBuildings).buildings
    const buildings = context.map((building) => ({
      height: building.height,
      footprint: building.footprint,
    }))
    // The studio measures the site's roofs; the surrounding blocks only cast shadows.
    const focus = context.flatMap((building, index) => (building.withinStudyArea ? [index] : []))
    const start = performance.now()
    const values = computeRoofSolar(buildings, OSLO, undefined, focus)
    const elapsed = performance.now() - start
    console.info(`[roof-solar] ${elapsed.toFixed(1)} ms · ${values.length} roofs · ${focus.length} measured`)
    expect(values).toHaveLength(buildings.length)
    expect(values.filter((value) => value.analysed)).toHaveLength(focus.length)
    expect(values.every((value, index) => value.analysed === focus.includes(index))).toBe(true)
    // Exact 2 m sampling is well over 150 ms in the main thread, so the studio runs it in
    // roofSolarWorker.ts. This bound only catches an order-of-magnitude regression in the model.
    expect(elapsed).toBeLessThan(4000)
  })
  it('keeps an unmeasured roof out of the median and the legend', () => {
    const values = computeRoofSolar(
      [{ height: 8, footprint: [[0, 0], [10, 0], [10, 10], [0, 10]] }],
      OSLO,
      undefined,
      [],
    )
    expect(values[0]?.analysed).toBe(false)
    expect(medianRoofSolar(values)).toBeNull()
    expect(roofSolarLegend(values).every((entry) => entry.count === 0)).toBe(true)
  })
})
