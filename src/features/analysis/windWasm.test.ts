import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it, vi } from 'vitest'
import { createLbm, stepLbm, warmStartLbm } from './lbm'
import { createWasmWindStep, createWorkerWindStep } from './windWasm'

const binary = readFileSync(resolve('src/features/analysis/lbm.wasm'))

it('matches both distributions across grids, odd swaps, warm starts and edited masks', async () => {
  const { instance } = await WebAssembly.instantiate(binary)
  const step = createWasmWindStep(instance)
  for (const [nx, ny] of [[12, 8], [8, 6], [12, 8]] as const) {
    const solid = new Uint8Array(nx * ny)
    solid[nx * 3 + 3] = 1
    const js = createLbm(nx, ny, solid, undefined, undefined, 0.012)
    const wasm = createLbm(nx, ny, solid, undefined, undefined, 0.012)
    const originalTmp = wasm.tmp
    stepLbm(js, 9)
    step(wasm, 9)
    expect(wasm.f).toBe(originalTmp)
    expect(wasm.f).toEqual(js.f)
    expect(wasm.tmp).toEqual(js.tmp)

    const editedMask = solid.slice()
    editedMask[nx * 3 + 4] = 1
    const jsEdited = createLbm(nx, ny, editedMask)
    const wasmEdited = createLbm(nx, ny, editedMask)
    warmStartLbm(jsEdited, js)
    warmStartLbm(wasmEdited, wasm)
    stepLbm(jsEdited, 10)
    step(wasmEdited, 10)
    expect(wasmEdited.f).toEqual(jsEdited.f)
    expect(wasmEdited.tmp).toEqual(jsEdited.tmp)
  }
})

it('keeps solving before load and after a failed load without retrying', async () => {
  const load = vi.fn(async () => { throw new Error('Network failure') })
  const step = createWorkerWindStep(load)
  const solid = new Uint8Array(48)
  const expected = createLbm(8, 6, solid)
  const actual = createLbm(8, 6, solid)
  step(actual, 4)
  await Promise.resolve()
  await Promise.resolve()
  step(actual, 8)
  stepLbm(expected, 12)
  expect(actual.f).toEqual(expected.f)
  expect(actual.tmp).toEqual(expected.tmp)
  expect(load).toHaveBeenCalledOnce()
})
