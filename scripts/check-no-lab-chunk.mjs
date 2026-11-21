// Build check for TF-VIS-015 (ADR-0040): the Visual Lab must be tree-shaken out of the
// production build. After `npm run build`, no file under dist/ may reference `LabPage`.
//
//   npm run build && node scripts/check-no-lab-chunk.mjs
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const distDir = `${root}/dist`

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) files.push(...(await walk(path)))
    else files.push(path)
  }
  return files
}

const files = await walk(distDir)
const offenders = []
for (const file of files) {
  // Source maps list every source path in the module graph, including tree-shaken modules; the
  // shipped code is the JS and CSS chunks. Check those only.
  if (!file.endsWith('.js') && !file.endsWith('.css')) continue
  const content = await readFile(file, 'utf8')
  if (content.includes('LabPage')) offenders.push(file)
}

if (offenders.length > 0) {
  console.error(`LabPage found in the production build:\n  ${offenders.join('\n  ')}`)
  process.exit(1)
}

// The owner's local aerial screenshots (public/local-ortho/, visuals plan V2a) must never ship:
// Kartverket's permission covers neither publishing nor redistribution yet.
const photos = files.filter((file) => file.includes('/local-ortho/') && /\.(png|jpe?g|webp)$/i.test(file))
if (photos.length > 0) {
  console.error(`Local aerial photos found in the production build:\n  ${photos.join('\n  ')}`)
  process.exit(1)
}
console.log(`No LabPage reference in ${files.length} production files.`)
