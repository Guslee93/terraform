/// <reference lib="webworker" />
import { createFlowRunner, type FlowResult, type FlowRequest } from './flowRunner'

/** Ground ticks change the field; settled ticks only warrant posting a newly completed stack. */
export function shouldPostFlow(previous: Pick<FlowResult, 'id' | 'settled' | 'slices'> | null, next: FlowResult): boolean {
  return !previous || previous.id !== next.id || !previous.settled || (!previous.slices && !!next.slices)
}
let lastPosted: Pick<FlowResult, 'id' | 'settled' | 'slices'> | null = null
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
  if (shouldPostFlow(lastPosted, result)) {
    lastPosted = { id: result.id, settled: result.settled, slices: result.slices }
    const transfers = [result.velocity.buffer, result.solid.buffer]
    for (const slice of result.slices ?? []) transfers.push(slice.velocity.buffer, slice.solid.buffer)
    self.postMessage(result, transfers)
  }
  if (runner.hasPendingWork()) timer = setTimeout(loop, 0)
}

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) self.onmessage = (event: MessageEvent<FlowRequest>) => {
  clearTimeout(timer)
  pending = event.data
  timer = setTimeout(loop, 0)
}
