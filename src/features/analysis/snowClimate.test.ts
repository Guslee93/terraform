import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { SnowPanel } from '../../components/studio/SnowPanel'
import { WaterPanel } from '../../components/studio/WaterPanel'
import { snowStat, waterStat } from '../../components/studio/analysisValues'
import { runoffPixels } from '../../scene/RunoffOverlay'
import { parseSiteManifest } from '../sites/manifest'
import { siteLayers } from '../sites/provenance'
import { computeRunoff, RUNOFF_NOTE, runoffSummary } from './runoff'
import { parseSnowClimate, periodLabel, SNOW_LIMITS, SNOW_NOTE, winterStatistics } from './snowClimate'

/** Daily depths from 1 September `year`: `winters` whole seasons, each a function of the day of the season. */
function series(year: number, winters: ((day: number) => number | null)[]): (number | null)[] {
  const out: (number | null)[] = []
  winters.forEach((depth, index) => {
    const days = (Date.UTC(year + index + 1, 8, 1) - Date.UTC(year + index, 8, 1)) / 86_400_000
    for (let day = 0; day < days; day += 1) out.push(depth(day))
  })
  return out
}
// 1 Dec is day 91 of the season, 1 Mar is day 181 (182 after a leap day).
const snowy = (day: number) => (day >= 91 && day < 151 ? 30 : 0) // 60 days of 30 cm
const thin = (day: number) => (day >= 100 && day < 110 ? 4 : day >= 110 && day < 120 ? 8 : 0) // 10 days under the threshold, 10 over
const bare = () => 0

describe('winter statistics from a daily snow-depth series', () => {
  const stats = winterStatistics(series(1990, [snowy, thin, bare]), '1990-09-01')
  it('counts days with at least 5 cm and the deepest snow, per winter from 1 September', () => {
    expect(stats.winters).toEqual([
      { winter: '1990/91', snowDays: 60, maxDepthCm: 30 },
      { winter: '1991/92', snowDays: 10, maxDepthCm: 8 },
      { winter: '1992/93', snowDays: 0, maxDepthCm: 0 },
    ])
    expect(stats.period).toEqual({ from: 1990, to: 1993 })
  })
  it('gives the median and the extremes between winters', () => {
    expect(stats.snowDays).toEqual({ median: 10, min: 0, max: 60 })
    expect(stats.maxDepthCm).toEqual({ median: 8, min: 0, max: 30 })
    expect(winterStatistics(series(1990, [snowy, bare]), '1990-09-01').snowDays.median).toBe(30)
  })
  it('averages depth by month, October to May', () => {
    expect(stats.monthlyMeanDepthCm.map((month) => month.month)).toEqual(['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'])
    // December: 30 cm on all 31 days of one winter, a little in another, none in the third.
    const december = stats.monthlyMeanDepthCm[2]!.value
    expect(december).toBeGreaterThan(10)
    expect(december).toBeLessThan(12)
    expect(stats.monthlyMeanDepthCm[7]!.value).toBe(0)
  })
  it('drops a winter cut short or full of gaps instead of summarising part of a season', () => {
    const cut = series(1990, [snowy, snowy]).slice(0, 500)
    expect(winterStatistics(cut, '1990-09-01').winters.map((winter) => winter.winter)).toEqual(['1990/91'])
    const gappy = series(1990, [snowy, (day) => (day < 40 ? null : 0)])
    expect(winterStatistics(gappy, '1990-09-01').winters).toHaveLength(1)
    expect(() => winterStatistics([0, 0, 0], '1990-09-01')).toThrow(/no whole winter/)
  })
})

describe('parseSnowClimate', () => {
  const stats = winterStatistics(series(1990, [snowy, thin, bare]), '1990-09-01')
  const file = { schemaVersion: 1, siteId: 'demo', cell: { x: 262953, y: 6650490, altitudeM: 22 }, ...stats }
  it('reads a valid file and rejects a negative depth, a malformed winter and missing months', () => {
    expect(parseSnowClimate(file)).toMatchObject({ siteId: 'demo', cell: { altitudeM: 22 }, snowDays: { median: 10 } })
    expect(() => parseSnowClimate({ ...file, maxDepthCm: { median: -1, min: 0, max: 3 } })).toThrow(/maxDepthCm/)
    expect(() => parseSnowClimate({ ...file, winters: [{ winter: '1990', snowDays: 1, maxDepthCm: 1 }] })).toThrow(/1990\/91/)
    expect(() => parseSnowClimate({ ...file, winters: [{ winter: '1990/91', snowDays: 400, maxDepthCm: 1 }] })).toThrow(/more days/)
    expect(() => parseSnowClimate({ ...file, monthlyMeanDepthCm: [] })).toThrow(/October to May/)
  })
})

describe('what the studio says about snow', () => {
  const stats = winterStatistics(series(1990, [snowy, thin, bare]), '1990-09-01')
  const snow = { cell: { x: 1, y: 2, altitudeM: 22 }, ...stats }
  it('is climate context, and never drift, accumulation on buildings or load', () => {
    expect(SNOW_NOTE).toContain('not a measurement at the site')
    expect(SNOW_LIMITS).toBe('Not snowdrift, not snow accumulating on or around buildings, and not a snow load. Those need a specialist study.')
    render(createElement(SnowPanel, { snow, siteAltitudeM: 20.28 }))
    expect(screen.getByText(SNOW_LIMITS)).toBeVisible()
    expect(screen.getByText(/1 km cell at 22 m above sea level; the site is at 20 m, winters 1990\/91 to 1992\/93/)).toBeVisible()
    expect(screen.getByRole('img', { name: 'Deepest snow of each winter, winters 1990/91 to 1992/93: from 0 to 30 cm' })).toBeVisible()
    // No load, no pressure, no kN or kg per square metre anywhere in the card.
    expect(document.body.textContent).not.toMatch(/kN|kg\/m|snow load of|pressure/i)
  })
  it('the card names the median winter and its period; without data it says so', () => {
    const stat = snowStat(snow)
    expect(stat).toMatchObject({ value: '10', unit: ' days' })
    expect(stat.secondary.map(([value, unit]) => value + unit).join('')).toBe('with snow on the ground in a median winter · 1990/91–1992/93')
    expect(snowStat(null)).toMatchObject({ value: null, hint: 'No winter climate data for this site' })
    expect(periodLabel(snow)).toBe('winters 1990/91 to 1992/93')
  })
  it('an imported site says why it has no snow context', () => {
    render(createElement(SnowPanel, { snow: null, siteAltitudeM: null }))
    expect(screen.getByText(/cannot be read from the browser/)).toBeVisible()
  })
})

describe('shipped winter climate (ADR-0039)', () => {
  const read = (site: string, name: string): unknown => JSON.parse(readFileSync(`public/sites/${site}/${name}`, 'utf8'))
  it.each(['compact-infill', 'sloped-edge'])('%s: thirty winters, registered with NVE and its limitation', (site) => {
    const snow = parseSnowClimate(read(site, 'snow.json'))
    expect(snow.winters).toHaveLength(30)
    expect(snow.winters[0]!.winter).toBe('1990/91')
    expect(snow.winters.at(-1)!.winter).toBe('2019/20')
    expect(snow.snowDays.max).toBeLessThanOrEqual(366)
    const layer = siteLayers(parseSiteManifest(read(site, 'manifest.json'))).layers.find((entry) => entry.id === 'snow')
    expect(layer).toMatchObject({ owner: 'NVE', licence: 'NLOD', attribution: 'Kilde: NVE' })
    expect(layer?.useLimitation).toContain('not a snow load')
  })
  it('the higher site has more snow than the city-centre one', () => {
    const low = parseSnowClimate(read('compact-infill', 'snow.json')), high = parseSnowClimate(read('sloped-edge', 'snow.json'))
    expect(high.cell.altitudeM).toBeGreaterThan(low.cell.altitudeM)
    expect(high.snowDays.median).toBeGreaterThan(low.snowDays.median)
  })
})

describe('Water card (ADR-0038)', () => {
  const heights = new Float32Array(60 * 60)
  for (let row = 0; row < 60; row += 1) for (let col = 0; col < 60; col += 1) heights[row * 60 + col] = (col >= 25 && col < 35 && row >= 25 && row < 35 ? 4 : 5) + (60 - col) * 0.001
  const runoff = computeRunoff({ cols: 60, rows: 60, minX: 0, minY: 0, maxX: 60, maxY: 60, heights })
  const summary = runoffSummary(runoff)
  const hazards = { retrieved: '2026-11-16', layers: [{ kind: 'flood-zones' as const, updated: null, polygons: [] }, { kind: 'quick-clay' as const, updated: null, polygons: [] }] }
  it('shows the legend, the screening claim and the mapped flood facts, and no quick clay', () => {
    render(createElement(WaterPanel, { available: true, computing: false, summary, hazards, area: [[0, 0], [60, 0], [60, 60], [0, 60]] }))
    expect(screen.getByText(RUNOFF_NOTE)).toBeVisible()
    expect(screen.getByText(/courtyard closed in by buildings shows as a depression/)).toBeVisible()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent).slice(0, 3)).toEqual([
      'Main flow paths (water from 5 000 m² or more)', 'Flow paths (water from 500 m² or more)', 'Depressions and enclosed courtyards (hollows deeper than 5 cm)',
    ])
    expect(screen.getByText('Not mapped by NVE')).toBeVisible()
    expect(screen.queryByText(/Quick-clay/)).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\d\s*(mm|cm) of water|flood depth|return period/i)
  })
  it('says what it needs on a site without the 1 m terrain', () => {
    render(createElement(WaterPanel, { available: false, computing: false, summary: null, hazards: null, area: [] }))
    expect(screen.getByText(/needs the 1 m terrain/)).toBeVisible()
  })
  it('the card figure is the share of ground in depressions, shown only once traced', () => {
    expect(waterStat(summary, true, true, false)).toMatchObject({ value: '3', unit: '%' })
    expect(waterStat(null, true, true, true)).toMatchObject({ value: null, hint: 'Tracing where the water runs…' })
    expect(waterStat(null, true, false, false)).toMatchObject({ value: null, hint: 'Select to trace the runoff' })
    expect(waterStat(null, false, false, false)).toMatchObject({ value: null, hint: 'Needs the 1 m terrain' })
  })
  it('paints depressions softly and leaves dry ground clear', () => {
    const pixels = runoffPixels(runoff)
    expect(pixels[(30 * 60 + 30) * 4 + 3]).toBeGreaterThan(0)
    expect(pixels[(5 * 60 + 50) * 4 + 3]).toBe(0)
  })
})
