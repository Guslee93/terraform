/// <reference lib="webworker" />
import { createFlowRunner, type FlowRequest } from './flowRunner'

const runner = createFlowRunner()
let timer: ReturnType<typeof setTimeout> | undefined

function loop() {
  const result = runner.tick(120)
  if (!result) return
  self.postMessage(result, [result.velocity.buffer, result.solid.buffer])
  if (!result.settled) timer = setTimeout(loop, 0)
}

self.onmessage = (event: MessageEvent<FlowRequest>) => {
  clearTimeout(timer)
  runner.request(event.data)
  loop()
}
