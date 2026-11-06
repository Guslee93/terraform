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
  self.postMessage(result, [result.velocity.buffer, result.solid.buffer])
  if (!result.settled) timer = setTimeout(loop, 0)
}

self.onmessage = (event: MessageEvent<FlowRequest>) => {
  clearTimeout(timer)
  pending = event.data
  timer = setTimeout(loop, 0)
}
