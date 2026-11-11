import { pointInPolygon, polygonArea, ringCentroid } from '../../lib/polygon'
import type { Vec2, Vec3 } from '../../lib/coordinates'
import { sampleGrid, type FootprintBuilding } from './grid'
import { blockedAlong, prepareScene, type SunLocation } from './shadowRay'
import { sunDirection, sunDirectionEnu } from './sun'
import { localDayMinuteToInstant } from './time'
import type { LegendEntry } from './climateView'

/**
 * Clear-sky annual irradiation on flat roofs (ADR-0021). An upper bound from a clear-sky model:
 * no clouds, no weather, no reflections, no shading by terrain or trees. Never a yield estimate.
 */

export const ROOF_SOLAR_DISCLAIMER =
  'Indicative clear-sky irradiation — upper bound, no weather or cloud data. Not a yield estimate.'

/** Meinel clear-sky constants: a deliberately simple model, named here so the UI can repeat them. */
export const SOLAR_CONSTANT_W_M2 = 1353
export const CLEAR_SKY_TRANSMITTANCE = 0.7
export const CLEAR_SKY_AIR_MASS_EXPONENT = 0.678
/** Crude constant diffuse share of the horizontal beam, always added even when shaded. */
export const DIFFUSE_FRACTION = 0.1

/** Optional panel readout constants, shown in the UI text; not a yield model. */
export const PANEL_EFFICIENCY = 0.2
export const PERFORMANCE_RATIO = 0.8

export const ROOF_SOLAR_CELL_M = 2
export const ROOF_SOLAR_STEP_MIN = 30
export const ROOF_SOLAR_MIN_SAMPLE_AREA_M2 = 4

/** Representative days: the 15th of each month, weighted by the month's day count (365 total). */
export const ROOF_SOLAR_DAYS_IN_MONTH: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export type WeightedSunSample = {
  readonly enu: Vec3
  readonly elevationDeg: number
  /** Sampling interval × days represented by the month. */
  readonly weightHours: number
}

/** One year of representative above-horizon sun positions, built once per site. */
export function annualSunSamples(location: SunLocation, stepMin = ROOF_SOLAR_STEP_MIN): WeightedSunSample[] {
  if (!(stepMin > 0)) return []
  const samples: WeightedSunSample[] = []
  for (let month = 0; month < 12; month += 1) {
    const date = `2026-${String(month + 1).padStart(2, '0')}-15`
    const days = ROOF_SOLAR_DAYS_IN_MONTH[month] ?? 0
    for (let minute = 0; minute < 1440; minute += stepMin) {
      const { instant } = localDayMinuteToInstant(date, minute, location.timeZone)
      const direction = sunDirection(instant, location.latitude, location.longitude)
      if (!(direction.elevationDeg > 0)) continue
      samples.push({
        enu: sunDirectionEnu(direction),
        elevationDeg: direction.elevationDeg,
        weightHours: (stepMin / 60) * days,
      })
    }
  }
  return samples
}

/** Direct normal irradiance for a clear sky (W/m²), Meinel's simple air-mass model. */
export function clearSkyDni(elevationDeg: number): number {
  if (!(elevationDeg > 0)) return 0
  const sinElevation = Math.sin((elevationDeg * Math.PI) / 180)
  if (!(sinElevation > 1e-6)) return 0
  const airMass = 1 / sinElevation
  return SOLAR_CONSTANT_W_M2 * CLEAR_SKY_TRANSMITTANCE ** (airMass ** CLEAR_SKY_AIR_MASS_EXPONENT)
}

export type RoofSolarValue = {
  /** Mean annual clear-sky irradiation over the roof, kWh/m²·yr. */
  readonly kwhPerM2: number
  readonly sampleCount: number
  /** Share of the footprint that is open roof; the rest lies under a taller overlapping block. */
  readonly exposedShare?: number
}

/**
 * Mean annual clear-sky irradiation per roof. Roofs are flat; a roof under 4 m² (or too narrow for
 * the grid) is represented by its centroid. The own building is skipped, so a tier's roof is shaded
 * by the tier above but not by itself.
 */
export function computeRoofSolar(
  buildings: readonly FootprintBuilding[],
  location: SunLocation,
  cellM = ROOF_SOLAR_CELL_M,
): RoofSolarValue[] {
  const samples = annualSunSamples(location)
  const prepared = prepareScene(buildings)
  const boxes = buildings.map(({ footprint }) => {
    const xs = footprint.map((p) => p[0]), ys = footprint.map((p) => p[1])
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as const
  })
  return buildings.map((building, index) => {
    const area = polygonArea(building.footprint)
    let points: readonly Vec2[] = sampleGrid(building.footprint, cellM).map((cell): Vec2 => [cell.x, cell.y])
    if (points.length === 0 || area < ROOF_SOLAR_MIN_SAMPLE_AREA_M2) {
      points = [ringCentroid(building.footprint)]
    }
    // A point under a taller overlapping footprint (the tier above, a building part) is not roof.
    const box = boxes[index]!
    const above = buildings.filter((other, j) => {
      const o = boxes[j]!
      return j !== index && other.height > building.height && o[0] <= box[2] && o[2] >= box[0] && o[1] <= box[3] && o[3] >= box[1]
    })
    const sampled = points.length
    if (above.length) points = points.filter((point) => !above.some((other) => pointInPolygon(point, other.footprint)))
    let totalKwh = 0
    for (const point of points) {
      const roofPoint: Vec3 = [point[0], point[1], building.height + 0.05]
      let wattHours = 0
      for (const sample of samples) {
        const dni = clearSkyDni(sample.elevationDeg)
        const horizontal = dni * sample.enu[2]
        const diffuse = DIFFUSE_FRACTION * horizontal
        const beam = blockedAlong(roofPoint, sample.enu, prepared, building) ? 0 : horizontal
        wattHours += (beam + diffuse) * sample.weightHours
      }
      totalKwh += wattHours / 1000
    }
    return {
      kwhPerM2: points.length === 0 ? 0 : totalKwh / points.length,
      sampleCount: points.length,
      exposedShare: points.length / sampled,
    }
  })
}

export type RoofSolarBand = '0-300' | '300-600' | '600-900' | '900-1200' | '1200+'

export const ROOF_SOLAR_ORDER: readonly RoofSolarBand[] = ['0-300', '300-600', '600-900', '900-1200', '1200+']

export const ROOF_SOLAR_BAND_LABEL: Record<RoofSolarBand, string> = {
  '0-300': '0–300 kWh/m²·yr',
  '300-600': '300–600 kWh/m²·yr',
  '600-900': '600–900 kWh/m²·yr',
  '900-1200': '900–1200 kWh/m²·yr',
  '1200+': '1200 kWh/m²·yr and above',
}

export const ROOF_SOLAR_COLOUR: Record<RoofSolarBand, string> = {
  '0-300': '#E7E1D2',
  '300-600': '#E8D48A',
  '600-900': '#E0B25C',
  '900-1200': '#CC7340',
  '1200+': '#9C2F2F',
}

export function roofSolarBand(kwhPerM2: number): RoofSolarBand {
  if (kwhPerM2 < 300) return '0-300'
  if (kwhPerM2 < 600) return '300-600'
  if (kwhPerM2 < 900) return '600-900'
  if (kwhPerM2 < 1200) return '900-1200'
  return '1200+'
}

/** Roofs with open area; one fully under another block has no roof to report. */
const openRoofs = (values: readonly RoofSolarValue[]) => values.filter((value) => value.exposedShare !== 0)

export function roofSolarLegend(all: readonly RoofSolarValue[]): LegendEntry[] {
  const values = openRoofs(all)
  return ROOF_SOLAR_ORDER.map((band) => {
    const count = values.filter((value) => roofSolarBand(value.kwhPerM2) === band).length
    return {
      label: ROOF_SOLAR_BAND_LABEL[band],
      colour: ROOF_SOLAR_COLOUR[band],
      count,
      share: values.length === 0 ? 0 : count / values.length,
    }
  })
}

export function medianRoofSolar(values: readonly RoofSolarValue[]): number | null {
  const sorted = openRoofs(values).map((value) => value.kwhPerM2).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle] ?? null
  const lower = sorted[middle - 1]
  const upper = sorted[middle]
  return lower === undefined || upper === undefined ? null : (lower + upper) / 2
}

/** Optional readout: kWh/yr if the roof were fully covered at the stated panel constants. */
export function roofSolarYieldKwh(value: RoofSolarValue, roofAreaM2: number): number {
  return value.kwhPerM2 * roofAreaM2 * PANEL_EFFICIENCY * PERFORMANCE_RATIO
}
