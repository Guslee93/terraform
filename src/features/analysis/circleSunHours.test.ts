import { describe, expect, it } from 'vitest'
import type { Vec2, Vec3 } from '../../lib/coordinates'
import { computeCircleSunHours, SUN_HOURS_RAMP, sunHoursColour, sunHoursRgb, windowSunSamples } from './circleSunHours'
import type { FootprintBuilding } from './grid'
import { daySunSamples, type SunSample } from './shadowRay'

const rect = (x0: number, x1: number, y0: number, y1: number): Vec2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const OSLO = { latitude: 59.9235, longitude: 10.758, timeZone: 'Europe/Oslo' }

/** Four quarter-hours of sun from due south at 30°: one hour of possible sun. */
const southSun = (): SunSample[] => {
  const e = (30 * Math.PI) / 180
  const enu: Vec3 = [0, -Math.cos(e), Math.sin(e)]
  return [720, 735, 750, 765].map((minute) => ({ minute, enu, elevationDeg: 30 }))
}

/** Hours at the surface cell containing a plan point, and what the cell is. */
function surfaceAt(result: ReturnType<typeof computeCircleSunHours>, x: number, y: number) {
  const { minX, minY, cellM, cols } = result.surface
  const cell = Math.floor((y - minY) / cellM) * cols + Math.floor((x - minX) / cellM)
  return { hours: result.surface.hours[cell], surface: result.surface.surface[cell] }
}

/** Mean hours of the façade vertices whose wall faces `normal`, from the vertex positions. */
function facadeHours(result: ReturnType<typeof computeCircleSunHours>, side: 'south' | 'north' | 'east' | 'west', half = 10) {
  const values: number[] = []
  const { positions, hours } = result.facades
  for (let v = 0; v < hours.length; v += 1) {
    const x = positions[3 * v]!, y = positions[3 * v + 1]!
    const on = side === 'south' ? y < -half : side === 'north' ? y > half : side === 'east' ? x > half : x < -half
    if (on) values.push(hours[v]!)
  }
  return values
}

describe('sun hours in the analysis circle (ADR-0031)', () => {
  const circle = { centre: [0, 0] as Vec2, radius: 60 }

  it('gives open ground all the sun the window offers', () => {
    const result = computeCircleSunHours([], circle, southSun())
    expect(result.possibleHours).toBe(1)
    expect(result.median).toEqual({ ground: 1, roofs: null, facades: null })
    expect(result.included).toEqual([])
    // Ground only inside the circle: about π r² of 2 m cells.
    const ground = result.surface.surface.filter((s) => s === -1).length
    expect(ground * 4).toBeGreaterThan(Math.PI * 60 * 60 * 0.97)
    expect(ground * 4).toBeLessThan(Math.PI * 60 * 60 * 1.03)
    expect(surfaceAt(result, 59.5, 59.5).surface).toBe(-2) // outside the circle: nothing measured
  })

  it('shades the ground north of a tower and lights its roof and south wall', () => {
    const tower: FootprintBuilding = { height: 20, footprint: rect(-10, 10, -10, 10) }
    const result = computeCircleSunHours([tower], circle, southSun())
    expect(result.included).toEqual([0])
    // 20 m / tan 30° ≈ 34.6 m of shadow north of the north wall.
    expect(surfaceAt(result, 0, 25)).toEqual({ hours: 0, surface: -1 })
    expect(surfaceAt(result, 0, 50)).toEqual({ hours: 1, surface: -1 })
    expect(surfaceAt(result, 0, -25)).toEqual({ hours: 1, surface: -1 })
    expect(surfaceAt(result, 0, 0)).toEqual({ hours: 1, surface: 0 })
    expect(Math.min(...facadeHours(result, 'south'))).toBe(1)
    expect(Math.max(...facadeHours(result, 'north'))).toBe(0)
    // Sun along the wall is not in front of it.
    expect(Math.max(...facadeHours(result, 'east'), ...facadeHours(result, 'west'))).toBe(0)
  })

  it('lets a tower shade a lower roof behind it, never its own', () => {
    const tower: FootprintBuilding = { height: 30, footprint: rect(-10, 10, -10, 10) }
    const low: FootprintBuilding = { height: 6, footprint: rect(-10, 10, 15, 45) }
    const result = computeCircleSunHours([tower, low], circle, southSun())
    expect(surfaceAt(result, 0, 25)).toEqual({ hours: 0, surface: 1 })
    expect(surfaceAt(result, 0, 0)).toEqual({ hours: 1, surface: 0 })
    expect(result.median.roofs).toBe(0) // 150 shaded low-roof cells against the tower's 100
  })

  it('measures whole roofs and walls of buildings touching the circle, and counts only what is inside it', () => {
    const straddling: FootprintBuilding = { height: 10, footprint: rect(50, 90, -5, 5) }
    const outside: FootprintBuilding = { height: 10, footprint: rect(200, 220, 0, 20) }
    const result = computeCircleSunHours([straddling, outside], circle, southSun())
    expect(result.included).toEqual([0])
    expect(surfaceAt(result, 85, 0).surface).toBe(0) // its roof beyond the rim is drawn whole
    const xs = Array.from({ length: result.facades.hours.length }, (_, v) => result.facades.positions[3 * v]!)
    expect(Math.max(...xs)).toBeGreaterThan(89)
    expect(result.facades.building.every((b) => b === 0)).toBe(true)
  })

  it('builds valid wall triangles: two per storey cell, every index a vertex', () => {
    const result = computeCircleSunHours([{ height: 9, footprint: rect(-4, 4, -3, 3) }], circle, southSun())
    const { triangles, hours } = result.facades
    expect(triangles.length % 3).toBe(0)
    expect(Math.max(...triangles)).toBeLessThan(hours.length)
    // 8 m and 6 m walls in 2 m columns (4 + 3 + 4 + 3 = 14 bays), 9 m in three 3 m storeys: 2 triangles each.
    expect(triangles.length / 3).toBe(14 * 3 * 2)
  })

  it('puts a vertex column at a gable peak', () => {
    const gable: FootprintBuilding = {
      height: 12, footprint: rect(-10, 10, -5, 5),
      roof: { shape: 'gabled', ridge: [[-10, 0], [10, 0]], ridgeHeight: 12, pitchDeg: 45 },
    }
    const result = computeCircleSunHours([gable], circle, southSun())
    const { positions } = result.facades
    const tops: number[] = []
    for (let v = 0; v < positions.length / 3; v += 1) if (Math.abs(positions[3 * v]! + 10.1) < 1e-3) tops.push(positions[3 * v + 2]!)
    expect(Math.max(...tops)).toBeCloseTo(12, 6) // the west gable end reaches the ridge
  })

  it('keeps only the samples inside the window', () => {
    const day = Array.from({ length: 96 }, (_, i): SunSample => ({ minute: i * 15, enu: [0, -1, 1], elevationDeg: 45 }))
    expect(windowSunSamples(day, 360, 720).map((s) => s.minute)).toEqual(Array.from({ length: 24 }, (_, i) => 360 + i * 15))
    expect(windowSunSamples(day, 0, 1440)).toHaveLength(96)
    expect(windowSunSamples(day, 600, 600)).toEqual([])
  })

  it('gives an open south wall more midsummer sun than a north wall, and the north wall none at midwinter', () => {
    const block: FootprintBuilding = { height: 9, footprint: rect(-10, 10, -10, 10) }
    const june = computeCircleSunHours([block], circle, daySunSamples('2026-06-21', OSLO))
    const december = computeCircleSunHours([block], circle, daySunSamples('2026-12-21', OSLO))
    const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length
    expect(mean(facadeHours(june, 'south'))).toBeGreaterThan(mean(facadeHours(june, 'north')))
    expect(Math.max(...facadeHours(december, 'north'))).toBe(0)
    expect(june.possibleHours).toBeGreaterThan(18)
    expect(december.possibleHours).toBeLessThan(7)
  })
})

describe('sun-hours ramp', () => {
  const luminance = ([r, g, b]: [number, number, number]) => {
    const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  }
  it('runs from the dark end at no sun to the light end at all the sun', () => {
    expect(sunHoursColour(0, 10)).toBe(SUN_HOURS_RAMP[0]!.toLowerCase())
    expect(sunHoursColour(10, 10)).toBe(SUN_HOURS_RAMP.at(-1)!.toLowerCase())
    expect(sunHoursColour(4, 0)).toBe(SUN_HOURS_RAMP[0]!.toLowerCase())
  })
  it('gets lighter with every step (a one-hue sequential ramp)', () => {
    const steps = Array.from({ length: 21 }, (_, i) => luminance(sunHoursRgb(i, 20)))
    for (let i = 1; i < steps.length; i += 1) expect(steps[i]!).toBeGreaterThan(steps[i - 1]!)
  })
})
