// Run from repository root with the compiled .wasm path as the sole argument.
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { rolldown } from 'rolldown'

const wasmPath = process.argv[2]
if (!wasmPath) throw new Error('Pass the compiled lbm.wasm path')
const wasm = await readFile(wasmPath)
const bundle = await rolldown({ input: 'scripts/wind-wasm/worker.ts', platform: 'browser' })
const { output } = await bundle.generate({ format: 'es' })
await bundle.close()
const worker = output.find(item => item.type === 'chunk')
if (!worker) throw new Error('Worker bundle missing')
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.route('http://wind-benchmark.local/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html>' })
    if (path === '/worker.js') {
      return route.fulfill({ contentType: 'text/javascript', body: worker.code })
    }
    if (path === '/lbm.wasm') {
      return route.fulfill({ contentType: 'application/wasm', body: wasm })
    }
    if (/^\/sites\/(compact-infill|sloped-edge)\/(buildings|study-area)\.json$/.test(path)) {
      return route.fulfill({ path: resolve('public' + path), contentType: 'application/json' })
    }
    return route.abort()
  })
  await page.goto('http://wind-benchmark.local/')
  const result = await page.evaluate(async () => {
    const bytes = await (await fetch('/lbm.wasm')).arrayBuffer()
    const worker = new globalThis.Worker('/worker.js', { type: 'module' })
    try {
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Benchmark exceeded 180 seconds')), 180_000)
        worker.onmessage = ({ data }) => { clearTimeout(timeout); resolve(data) }
        worker.onerror = event => { clearTimeout(timeout); reject(new Error(event.message)) }
        worker.postMessage(bytes, [bytes])
      })
    } finally {
      worker.terminate()
    }
  })
  if (result.error) throw new Error(result.error)
  console.log(JSON.stringify({ chromium: browser.version(), bytes: wasm.length, ...result }, null, 2))
} finally {
  await browser.close()
}
