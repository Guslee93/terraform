/// <reference lib="webworker" />
import { createFlowRunner, type FlowRequest } from './flowRunner'

const runner = createFlowRunner()
let timer: ReturnType<typeof setTimeout> | undefined

let pending: FlowRequest | null = null

function loop() {
  // Apply only the newest queued request; older edits are obsolete (no backlog during a drag).
  if (pending) {
    runner.request(pending)
    pending = null
  }
  const result = runner.tick(60)
  if (!result) return
  const transfers = [result.velocity.buffer, result.solid.buffer]
  for (const slice of result.slices ?? []) transfers.push(slice.velocity.buffer, slice.solid.buffer)
  self.postMessage(result, transfers)
  if (runner.hasPendingWork()) timer = setTimeout(loop, 0)
}

self.onmessage = (event: MessageEvent<FlowRequest>) => {
  clearTimeout(timer)
  pending = event.data
  timer = setTimeout(loop, 0)
}
