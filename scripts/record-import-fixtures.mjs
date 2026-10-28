#!/usr/bin/env node
// D22 — record offline fixtures for the site-import geocoder and terrain clients.
// Writes the raw API responses into src/features/import/__fixtures__/ plus a README
// with source URLs, fetch dates (UTC) and licences. No map tiles are recorded
// (Codex owns the tiles pipeline). One request per second; one retry after 2 s.
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const OUT_DIR = fileURLToPath(new URL('../src/features/import/__fixtures__/', import.meta.url))
const USER_AGENT =
  'TerraformPortfolio/0.1 (D22 site-import fixture recorder; architectural study prototype)'
const REQUEST_GAP_MS = 1000
const RETRY_DELAY_MS = 2000
const MAX_ATTEMPTS = 2

// 3 × 3 batch around Grünerløkka centre — lat 59.9225, lon 10.7595, koordsys=4326.
const CENTER = [10.7595, 59.9225] // [lon, lat]
const STEP = 0.0006
const round = (value, places) => Number(value.toFixed(places))
const HOYDE_POINTS = []
for (const dLat of [-STEP, 0, STEP]) {
  for (const dLon of [-STEP, 0, STEP]) {
    HOYDE_POINTS.push([round(CENTER[0] + dLon, 7), round(CENTER[1] + dLat, 7)])
  }
}

const targets = [
  {
    file: 'photon-grunerlokka.json',
    url: `https://photon.komoot.io/api/?q=${encodeURIComponent('Grünerløkka Oslo')}&limit=5`,
    licence: 'ODbL 1.0 — data © OpenStreetMap contributors',
    licenceUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
    note: 'Photon geocoder (komoot) — raw /api/ response for verification and offline tests.',
  },
  {
    file: 'photon-sodermalm.json',
    url: `https://photon.komoot.io/api/?q=${encodeURIComponent('Södermalm Stockholm')}&limit=5`,
    licence: 'ODbL 1.0 — data © OpenStreetMap contributors',
    licenceUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
    note: 'Photon geocoder (komoot) — raw /api/ response for verification and offline tests.',
  },
  {
    file: 'kartverket-adresse.json',
    url: `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent('Thorvald Meyers gate 40 Oslo')}&treffPerSide=5`,
    licence: 'CC BY 4.0 — © Kartverket',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    note: 'Kartverket Adresse-API — raw /sok response.',
  },
  {
    file: 'kartverket-hoyde.json',
    url: `https://ws.geonorge.no/hoydedata/v1/punkt?koordsys=4326&punkter=${encodeURIComponent(JSON.stringify(HOYDE_POINTS))}`,
    licence: 'CC BY 4.0 — © Kartverket',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    note: 'Kartverket høydedata DTM1 — raw /punkt batch of 9 points around 59.9225, 10.7595.',
  },
]

async function fetchOnce(target) {
  const response = await fetch(target.url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} for ${target.url}`)
  }
  return response.json()
}

async function record(target) {
  let lastError
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchOnce(target)
    } catch (error) {
      lastError = error
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[retry] ${target.file} attempt ${attempt} failed: ${error.message}`)
        await delay(RETRY_DELAY_MS)
      }
    }
  }
  throw new Error(`giving up on ${target.file}: ${lastError.message}`)
}

await mkdir(OUT_DIR, { recursive: true })

const fetchDateUtc = new Date().toISOString().slice(0, 10)
const rows = []
for (const target of targets) {
  const body = await record(target)
  const serialized = `${JSON.stringify(body, null, 2)}\n`
  await writeFile(join(OUT_DIR, target.file), serialized, 'utf8')
  rows.push({
    file: target.file,
    url: target.url,
    license: target.licence,
    licenseUrl: target.licenceUrl,
    bytes: Buffer.byteLength(serialized, 'utf8'),
    note: target.note,
  })
  console.log(`recorded ${target.file} (${rows.at(-1).bytes} bytes)`)
  await delay(REQUEST_GAP_MS)
}

const readme = `# Site-import fixtures

Recorded responses used by offline tests and mocked playback (no live network in tests).
Captured with \`node scripts/record-import-fixtures.mjs\` on **${fetchDateUtc} UTC** with
the User-Agent \`${USER_AGENT}\`. Files are raw, unmodified API responses.

| File | Endpoint | Bytes | Licence |
|---|---|---|---|
${rows
  .map(
    (row) =>
      `| \`${row.file}\` | <${row.url}> | ${row.bytes} | [${row.license}](${row.licenseUrl}) |`,
  )
  .join('\n')}

- Photon (komoot) serves OpenStreetMap-derived data under the Open Database
  Licence (ODbL 1.0); attribution for derived work: "© OpenStreetMap contributors".
- Kartverket høydedata and Adresse-API are CC BY 4.0; attribution: "© Kartverket".
- Do not re-record except when these endpoints change; keep the date column honest.
`
await writeFile(join(OUT_DIR, 'README.md'), readme, 'utf8')
console.log(`wrote ${join(OUT_DIR, 'README.md')}`)