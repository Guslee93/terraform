import { stepLbm, type Lbm } from './lbm'

export function createWasmWindStep(instance: WebAssembly.Instance): typeof stepLbm {
  const { memory, setup, solid_ptr, f_ptr, tmp_ptr, step } = instance.exports
  if (!(memory instanceof WebAssembly.Memory) || typeof setup !== 'function' ||
    typeof solid_ptr !== 'function' || typeof f_ptr !== 'function' ||
    typeof tmp_ptr !== 'function' || typeof step !== 'function') {
    throw new Error('Unexpected wind Wasm exports')
  }
  let nx = 0
  let ny = 0

  return (state: Lbm, steps = 1) => {
    if (state.nx < 2 || state.ny < 2 || state.nx > 512 || state.ny > 512) {
      stepLbm(state, steps)
      return
    }

    if (nx !== state.nx || ny !== state.ny) {
      setup(state.nx, state.ny)
      nx = state.nx
      ny = state.ny
    }

    // JS keeps the authoritative state for warm starts, convergence and fallback.
    const view = (pointer: number) => new Float32Array(memory.buffer, pointer, state.f.length)
    new Uint8Array(memory.buffer, Number(solid_ptr()), state.solid.length).set(state.solid)
    view(Number(f_ptr())).set(state.f)
    view(Number(tmp_ptr())).set(state.tmp)
    step(steps, state.omega, state.u0, state.exchange)

    // A Wasm failure before this point leaves both JS distributions untouched.
    const f = view(Number(f_ptr()))
    const tmp = view(Number(tmp_ptr()))
    if (steps % 2 === 1) [state.f, state.tmp] = [state.tmp, state.f]
    state.f.set(f)
    state.tmp.set(tmp)
  }
}

/** Each worker initializes independently. Requests can run while Wasm loads. */
export function createWorkerWindStep(load = async () => {
  const response = await fetch(new URL('./lbm.wasm', import.meta.url))
  if (!response.ok) throw new Error(`Wind Wasm request failed: ${response.status}`)
  return (await WebAssembly.instantiate(await response.arrayBuffer())).instance
}): typeof stepLbm {
  let started = false
  let wasm: typeof stepLbm | undefined
  return (state, steps) => {
    if (!started) {
      started = true
      if (typeof WebAssembly !== 'undefined') {
        void load().then(instance => {
          wasm = createWasmWindStep(instance)
        }).catch(() => { /* The TypeScript solver is already running. */ })
      }
    }
    if (wasm) {
      try {
        wasm(state, steps)
        return
      } catch {
        wasm = undefined
      }
    }
    stepLbm(state, steps)
  }
}
