// Health check for the live services behind the curated site assets (ADR-0036, feasibility IT-4).
//
//   node scripts/check-sources.mjs            # report
//   node scripts/check-sources.mjs --strict   # exit 1 when a service fails
//
// Every raw response in data/raw/ that a site-asset build step fetched has a `<name>.retrieved`
// file beside it: the retrieval date and the exact request. This script repeats each request and
// reports the HTTP status and whether the data still match the cached response (the request
// timestamp a WFS writes into every answer is ignored). The cache is checked against SHA256SUMS.
// Read-only: it changes no file. A changed checksum is drift, not an error: the publisher updated
// the data, and the asset should be rebuilt on purpose (REFRESH=1, see scripts/site-assets/raw.ts).
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'

const RAW = new URL('../data/raw/', import.meta.url)
const sums = new Map(readFileSync(new URL('SHA256SUMS', RAW), 'utf8').split('\n').filter(Boolean).map((line) => { const [digest, name] = line.split(/\s+/); return [name, digest] }))
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
// A WFS stamps every answer with the time of the request, and a layer without a primary key gets
// feature ids generated per request (Statens vegvesen's noise layers); neither is a change in the data.
const content = (bytes, name) => (/\.(gml|geojson|json|xml)$/.test(name)
  ? Buffer.from(Buffer.from(bytes).toString('utf8').replace(/timeStamp="[^"]*"/g, '').replace(/"timeStamp":"[^"]*"/g, '').replace(/"id":"[^"]*\.fid-[^"]*"/g, ''))
  : bytes)
const strict = process.argv.includes('--strict')
const rows = []
for (const file of readdirSync(RAW).filter((name) => name.endsWith('.retrieved')).sort()) {
  const name = file.replace(/\.retrieved$/, '')
  const [retrieved, url] = readFileSync(new URL(file, RAW), 'utf8').trim().split('\n')
  const host = new URL(url).host
  const started = Date.now()
  let status = 'FAIL'
  let detail
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'site-package-check/1.0' }, signal: AbortSignal.timeout(120_000) })
    if (!response.ok) detail = `HTTP ${response.status}`
    else {
      const bytes = new Uint8Array(await response.arrayBuffer())
      const cachedBytes = new Uint8Array(readFileSync(new URL(name, RAW)))
      // The cache itself must still be the file the build used.
      if (sha256(cachedBytes) !== sums.get(name)) { status = 'FAIL'; detail = 'cached file does not match SHA256SUMS' }
      else {
        status = sha256(content(bytes, name)) === sha256(content(cachedBytes, name)) ? 'OK' : 'DRIFT'
        detail = status === 'DRIFT' ? `data differs from the cached response (${cachedBytes.length} → ${bytes.length} bytes)` : ''
      }
    }
  } catch (error) {
    detail = error instanceof Error ? error.message : String(error)
  }
  rows.push({ status, name, host, retrieved, seconds: ((Date.now() - started) / 1000).toFixed(1), detail })
  console.log(`${status.padEnd(5)} ${name.padEnd(46)} ${host.padEnd(22)} cached ${retrieved}  ${rows.at(-1).seconds.padStart(5)} s  ${detail}`)
}
const count = (status) => rows.filter((row) => row.status === status).length
console.log(`\n${rows.length} sources: ${count('OK')} unchanged, ${count('DRIFT')} changed, ${count('FAIL')} failed`)
if (strict && count('FAIL') > 0) process.exit(1)
