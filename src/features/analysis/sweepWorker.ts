/// <reference lib="webworker" />
import { createSweepRunner, type SweepRequest } from './directionSweep'

const runner = createSweepRunner()
let pending: SweepRequest | null = null
let timer: ReturnType<typeof setTimeout> | undefined

function loop() {
  if (pending) {
    runner.request(pending)
    pending = null
  }
  const result = runner.tick(60)
  if (result) self.postMessage(result, [result.cells.buffer, ...result.ratios.map((field) => field.buffer)])
  // An unfinished direction produces no result yet, but must keep running.
  if (runner.hasPendingWork()) timer = setTimeout(loop, 0)
}

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) self.onmessage = (event: MessageEvent<SweepRequest>) => {
  clearTimeout(timer)
  pending = event.data
  timer = setTimeout(loop, 0)
}
