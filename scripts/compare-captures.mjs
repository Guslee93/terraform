// Compare two reference capture sets (TF-VIS-010).
//
//   node scripts/compare-captures.mjs <labelA> <labelB>
//
// Reads docs/screenshots/vis/<label>/ for both labels, compares every PNG the two sets share with
// Playwright's own image comparator (pixelmatch, the same comparator `toHaveScreenshot` uses — no
// new dependency) and prints the differing-pixel count per image, then a summary.
import { readFile, readdir, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { getComparator } = require('playwright-core/lib/coreBundle').utils
const comparePng = getComparator('image/png')

const root = fileURLToPath(new URL('../', import.meta.url))
const [labelA, labelB] = process.argv.slice(2)
if (!labelA || !labelB) throw new Error('Usage: node scripts/compare-captures.mjs <labelA> <labelB>')
for (const label of [labelA, labelB]) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(label)) throw new Error(`Not a valid label: "${label}"`)
}

const dir = (label) => `${root}/docs/screenshots/vis/${label}`

async function pngFiles(label) {
  const path = dir(label)
  const entries = await readdir(path).catch(() => [])
  const files = []
  for (const entry of entries) {
    if (!entry.endsWith('.png')) continue
    if ((await stat(`${path}/${entry}`)).isFile()) files.push(entry)
  }
  return files.sort()
}

/**
 * Differing pixel count between two PNG files, via Playwright's comparator. Returns 0 when they
 * match, null when the comparator cannot give a count (size mismatch or undecodable input).
 */
async function diffPixels(pathA, pathB) {
  const actual = await readFile(pathA)
  const expected = await readFile(pathB)
  let result
  try {
    result = comparePng(actual, expected, { maxDiffPixels: 0 })
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
  if (!result) return 0
  const count = /(\d+) pixels\b/.exec(result.errorMessage ?? '')
  return count ? Number(count[1]) : { error: result.errorMessage }
}

const filesA = await pngFiles(labelA)
const filesB = await pngFiles(labelB)
const shared = filesA.filter((file) => filesB.includes(file))
const onlyA = filesA.filter((file) => !filesB.includes(file))
const onlyB = filesB.filter((file) => !filesA.includes(file))

let totalDiff = 0
let differingImages = 0
for (const file of shared) {
  const pixels = await diffPixels(`${dir(labelA)}/${file}`, `${dir(labelB)}/${file}`)
  if (typeof pixels === 'number') {
    console.log(`${pixels.toString().padStart(8)}  ${file}`)
    if (pixels > 0) differingImages += 1
    totalDiff += pixels
  } else {
    console.log(`${'—'.padStart(8)}  ${file}  (${pixels.error})`)
  }
}
for (const file of onlyA) console.log(`${'missing'.padStart(8)}  ${file}  (only in ${labelA})`)
for (const file of onlyB) console.log(`${'missing'.padStart(8)}  ${file}  (only in ${labelB})`)

console.log(`\n${shared.length} images compared; ${differingImages} differ; ${totalDiff} differing pixels total.`)
console.log(`Only in ${labelA}: ${onlyA.length}; only in ${labelB}: ${onlyB.length}.`)
