import { ringCentroid } from '../../src/lib/polygon'
import { parseBuildings, parseStudyArea } from '../../src/features/sites/package'
import { circlePolygon } from '../../src/features/analysis/grid'
import { createLbm, flowFrame, rasterize, refillExchange, stepLbm, velocityField, type Lbm } from '../../src/features/analysis/lbm'
import { sliceObstacles } from '../../src/features/analysis/windProfile'

import { createSweepRunner, type SweepResult } from '../../src/features/analysis/directionSweep'
import { createFlowRunner, type FlowResult } from '../../src/features/analysis/flowRunner'
import { createWasmWindStep } from '../../src/features/analysis/windWasm'
import type { FootprintBuilding } from '../../src/features/analysis/grid'
import type { Vec2 } from '../../src/lib/coordinates'

type Kernel = {
  memory: WebAssembly.Memory
  setup(nx: number, ny: number): void
  solid_ptr(): number
  f_ptr(): number
  tmp_ptr(): number
  step(steps: number, omega: number, u0: number, exchange: number): void
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!

function compare(label: string, expected: Float32Array, actual: Float32Array, allowNaN = false) {
  if (expected.length !== actual.length) throw new Error(`${label} length differs`)
  const a = new Uint32Array(expected.buffer, expected.byteOffset, expected.length)
  const b = new Uint32Array(actual.buffer, actual.byteOffset, actual.length)
  for (let i = 0; i < a.length; i++) {
    if (allowNaN && Number.isNaN(expected[i]) && Number.isNaN(actual[i])) continue
    if (!Number.isFinite(expected[i]) || a[i] !== b[i]) {
      throw new Error(`${label} differs at cell component ${i}: ${expected[i]} vs ${actual[i]}`)
    }
  }
}

function run(kernel: Kernel, initial: Lbm, steps: number, wasm: boolean) {
  const start = performance.now()
  const state = { ...initial, f: initial.f.slice(), tmp: initial.tmp.slice() }
  if (wasm) {
    kernel.setup(state.nx, state.ny)
    const memory = kernel.memory.buffer
    new Uint8Array(memory, kernel.solid_ptr(), state.solid.length).set(state.solid)
    new Float32Array(memory, kernel.f_ptr(), state.f.length).set(state.f)
    new Float32Array(memory, kernel.tmp_ptr(), state.tmp.length).set(state.tmp)
    for (let i = 0; i < steps; i += 10) {
      kernel.step(Math.min(10, steps - i), state.omega, state.u0, state.exchange)
    }
    state.f.set(new Float32Array(memory, kernel.f_ptr(), state.f.length))
    state.tmp.set(new Float32Array(memory, kernel.tmp_ptr(), state.tmp.length))
  } else {
    for (let i = 0; i < steps; i += 10) stepLbm(state, Math.min(10, steps - i))
  }
  const velocity = velocityField(state)
  return { state, velocity, ms: performance.now() - start }
}

self.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  try {
    const start = performance.now()
    const { instance } = await WebAssembly.instantiate(event.data)
    const { memory, setup, solid_ptr, f_ptr, tmp_ptr, step } = instance.exports
    if (!(memory instanceof WebAssembly.Memory) || typeof setup !== 'function' ||
      typeof solid_ptr !== 'function' || typeof f_ptr !== 'function' ||
      typeof tmp_ptr !== 'function' || typeof step !== 'function') {
      throw new Error('Unexpected Wasm exports')
    }
    const kernel: Kernel = {
      memory,
      setup: (nx, ny) => { setup(nx, ny) },
      solid_ptr: () => Number(solid_ptr()),
      f_ptr: () => Number(f_ptr()),
      tmp_ptr: () => Number(tmp_ptr()),
      step: (steps, omega, u0, exchange) => { step(steps, omega, u0, exchange) },
    }
    const setupMs = performance.now() - start
    const results = []
    const stacks = []
    const wasmStep = createWasmWindStep(instance)
    const sites: { site: string; centre: Vec2; buildings: readonly FootprintBuilding[] }[] = []
    for (const site of ['compact-infill', 'sloped-edge']) {
      const get = async (file: string) => {
        const response = await fetch(`/sites/${site}/${file}.json`)
        if (!response.ok) throw new Error(`Fixture ${site}/${file} returned ${response.status}`)
        return response.json()
      }
      const [rawBuildings, rawArea] = await Promise.all([get('buildings'), get('study-area')])
      const buildings = parseBuildings(rawBuildings).buildings
      const centre = ringCentroid(parseStudyArea(rawArea).polygon)
      sites.push({ site, centre, buildings })
    }
    const buildings: FootprintBuilding[] = Array.from({ length: 2_000 }, (_, i) => {
      const x = (i % 50) * 24 - 600
      const y = Math.floor(i / 50) * 24 - 480
      return { height: 6 + (i * 37) % 30, footprint: [[x, y], [x + 14, y], [x + 14, y + 14], [x, y + 14]] }
    })
    sites.push({ site: 'synthetic-2000-buildings', centre: [0, 0], buildings })
    for (const { site, centre, buildings } of sites) {
      const bearing = site.startsWith('synthetic') ? 45 : 270
      for (const z of [2, 15]) {
        const size = z === 2 ? 160 : 80
        const frame = flowFrame(circlePolygon(centre, 100), bearing, size, size, 1.4)
        const solid = rasterize(frame, sliceObstacles(buildings, z))
        const initial = createLbm(size, size, solid, undefined, undefined,
          refillExchange(z === 2 ? null : 50, frame.dx))
        const steps = 301
        const jsMs: number[] = []
        const wasmMs: number[] = []
        for (let trial = 0; trial < 6; trial++) {
          const first = run(kernel, initial, steps, trial % 2 === 1)
          const second = run(kernel, initial, steps, trial % 2 === 0)
          const [js, wasm] = trial % 2 === 0 ? [first, second] : [second, first]
          compare('distribution', js.state.f, wasm.state.f)
          compare('scratch distribution', js.state.tmp, wasm.state.tmp)
          compare('velocity', js.velocity, wasm.velocity)
          if (trial > 0) {
            jsMs.push(js.ms)
            wasmMs.push(wasm.ms)
          }
        }
        results.push({ site, z, size, steps, jsMs: median(jsMs), wasmMs: median(wasmMs) })
      }
      const frame = flowFrame(circlePolygon(centre, 100), bearing, 160, 160, 1.4)
      const solve = (wasm: boolean) => {
        const start = performance.now()
        const runner = createFlowRunner(undefined, wasm ? wasmStep : undefined)
        runner.request({ id: 1, frame, buildings, reset: true, slices: true, downwash: true })
        let final: FlowResult | null = null
        while (runner.hasPendingWork()) final = runner.tick(12)
        if (!final?.slicesComplete || !final.slices) throw new Error('Wind stack did not complete')
        return { ms: performance.now() - start, ground: final.velocity, slices: final.slices }
      }
      const wasmFirst = site === 'sloped-edge'
      const first = solve(wasmFirst)
      const second = solve(!wasmFirst)
      const [js, wasm] = wasmFirst ? [second, first] : [first, second]
      compare('ground wind field', js.ground, wasm.ground)
      if (js.slices.length !== wasm.slices.length) throw new Error('Wind slice counts differ')
      for (const [i, slice] of js.slices.entries()) {
        const actual = wasm.slices[i]
        if (!actual || actual.z !== slice.z || slice.solid.some((v, j) => v !== actual.solid[j])) {
          throw new Error('Wind slice geometry differs')
        }
        compare(`wind field at ${slice.z} m`, slice.velocity, actual.velocity)
      }
      stacks.push({ site, slices: js.slices.length, jsMs: js.ms, wasmMs: wasm.ms })

    }
    const sweep = (wasm: boolean) => {
      const start = performance.now()
      const runner = createSweepRunner(undefined, wasm ? wasmStep : undefined)
      runner.request({ id: 1, centre: [0, 0], radius: 100, buildings, downwash: true })
      let final: SweepResult | null = null
      while (runner.hasPendingWork()) final = runner.tick(12) ?? final
      if (!final?.complete) throw new Error('Directional sweep did not complete')
      return { final, ms: performance.now() - start }
    }
    const js = sweep(false)
    const wasm = sweep(true)
    compare('sweep sample cells', js.final.cells, wasm.final.cells)
    for (const [i, ratios] of js.final.ratios.entries()) {
      if (js.final.directions[i] !== wasm.final.directions[i]) throw new Error('Sweep directions differ')
      compare('sweep ratios', ratios, wasm.final.ratios[i]!, true)
    }
    self.postMessage({ setupMs, results, stacks, sweep: { jsMs: js.ms, wasmMs: wasm.ms } })
  } catch (error) {
    self.postMessage({ error: String(error) })
  }
}
