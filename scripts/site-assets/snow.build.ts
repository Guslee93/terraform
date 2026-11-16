/**
 * Winter climate context for the curated sites (ADR-0039).
 *
 *   npx vitest run --config scripts/site-assets/vitest.config.ts snow
 *
 * For each site: the daily snow depth of the model cell at the site origin (seNorge 1 km grid), from NVE's
 * grid time-series API (keyless, NLOD), for the winters 1990/91 to 2019/20 (the 1991–2020 normal
 * period), cached raw in data/raw/ with checksum and request; summarised into `snow.json` and
 * registered in the manifest. The API sends no CORS header, so this is a build step only.
 *
 * Only the snow depth theme (`sd`) is read. The same API has a `snowload` theme; it is never used:
 * a snow load is an engineering value (NS-EN 1991-1-3), not climate context.
 */
import { expect, it } from 'vitest'
import { SNOW_LIMITS, SNOW_NOTE, SNOW_OWNER, winterStatistics } from '../../src/features/analysis/snowClimate'
import { attributionSection, cached, readJson, registerAsset, sitePath, SITES, writeJson, type Manifest } from './raw'
import { toUtm33 } from './utm33'

const GTS_URL = 'https://gts.nve.no/api/GridTimeSeries'
const FROM = '1990-09-01'
const TO = '2020-08-31'

it('UTM33 conversion reproduces the feasibility origin', () => {
  // docs/feasibility: the Compact Infill origin is EPSG:25833 (262952.91, 6650490.44).
  const [east, north] = toUtm33(59.9235, 10.758)
  expect(east).toBeCloseTo(262952.91, 1)
  expect(north).toBeCloseTo(6650490.44, 1)
})

for (const site of SITES) {
  it(`${site}: snow.json from the seNorge snow model`, async () => {
    const manifest = readJson<Manifest>(sitePath(site, 'manifest.json'))
    const [east, north] = toUtm33(manifest.crs.originLatitude, manifest.crs.originLongitude).map(Math.round) as [number, number]
    const raw = await cached(`${site}-snow-depth.json`, `${GTS_URL}/${east}/${north}/${FROM}/${TO}/sd.json`, { headers: { 'User-Agent': 'site-package-build/1.0' } })
    const answer = JSON.parse(new TextDecoder().decode(raw.bytes)) as { Theme: string; Unit: string; TimeResolution: number; NoDataValue: number; Altitude: number; StartDate: string; Data: number[] }
    // Read the answer, do not trust the request: the theme, the unit and the first day.
    expect(answer.Theme).toBe('sd')
    expect(answer.Unit).toBe('cm')
    expect(answer.TimeResolution).toBe(1440)
    expect(answer.StartDate.startsWith('01.09.1990')).toBe(true)
    const daily = answer.Data.map((value) => (value === answer.NoDataValue ? null : value))
    const statistics = winterStatistics(daily, FROM)
    expect(statistics.winters).toHaveLength(30)
    writeJson(sitePath(site, 'snow.json'), { schemaVersion: 1, siteId: site, cell: { x: east, y: north, altitudeM: answer.Altitude }, ...statistics }, 0)
    const note = `Winter climate context is NVE's snow model on the seNorge grid (daily snow depth, 1 km cell at ${answer.Altitude} m above sea level), winters ${statistics.winters[0]!.winter} to ${statistics.winters.at(-1)!.winter}; modelled for open terrain, not measured at the site`
    registerAsset(site, 'snow', 'snow.json', {
      id: 'snow',
      owner: SNOW_OWNER,
      dataset: 'Snow depth, grid time series (seNorge grid)',
      url: 'https://api.nve.no/doc/gridtimeseries-data-gts/',
      licence: 'NLOD',
      licenceUrl: 'https://data.norge.no/nlod/',
      attribution: 'Kilde: NVE',
      retrieved: raw.retrieved,
      useLimitation: `${SNOW_NOTE} ${SNOW_LIMITS} NVE: the data are provided "as is" and may contain errors and omissions.`,
    }, note)
    attributionSection(site, 'Winter climate', `Kilde: NVE. Licence: Norsk lisens for offentlige data (NLOD), https://data.norge.no/nlod/ (the publisher does not state a version). Source: NVE grid time series, ${GTS_URL} (documented at https://api.nve.no/doc/gridtimeseries-data-gts/), theme \`sd\`, retrieved ${raw.retrieved}.\n\n${note}. ${SNOW_LIMITS}`)
  })
}
