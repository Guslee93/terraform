import { useEffect, useMemo, useRef, useState } from 'react'
import type { Vec2 } from '../../lib/coordinates'
import type { FlowRequest, FlowResult } from './flowRunner'
import type { FootprintBuilding } from './grid'
import { flowFrame } from './lbm'

/** Grid for the analysis circle: 160² over 1.4 × the radius ≈ 1.75 m cells at r = 100 m. */
const GRID = 160
const MARGIN = 1.4

/** Live 2D flow from the worker; null while off, before the first field, or where Workers are unavailable. */
export function useWindFlow(
  area: readonly Vec2[] | null,
  buildings: readonly FootprintBuilding[],
  fromBearingDeg: number,
  enabled: boolean,
  downwash = false,
): FlowResult | null {
  const [flow, setFlow] = useState<FlowResult | null>(null)
  const worker = useRef<Worker | null>(null)
  const lastFrame = useRef<unknown>(null)
  const nextId = useRef(0)
  const frame = useMemo(
    () => (enabled && area && area.length >= 3 ? flowFrame(area, fromBearingDeg, GRID, GRID, MARGIN) : null),
    [enabled, area, fromBearingDeg],
  )

  useEffect(() => {
    if (!frame || typeof Worker === 'undefined') return
    const w = new Worker(new URL('./flowWorker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (event: MessageEvent<FlowResult>) => setFlow(event.data)
    worker.current = w
    lastFrame.current = null
    return () => {
      w.terminate()
      worker.current = null
      setFlow(null)
    }
    // One worker per enabled session; frame changes are sent as messages below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame !== null])

  useEffect(() => {
    if (!frame) return
    // Debounce geometry edits (a drag emits many) before rasterising in the worker.
    const handle = setTimeout(() => {
      const request: FlowRequest = { id: ++nextId.current, frame, buildings, reset: lastFrame.current !== frame, downwash }
      lastFrame.current = frame
      worker.current?.postMessage(request)
    }, 50)
    return () => clearTimeout(handle)
  }, [frame, buildings, downwash])

  return frame ? flow : null
}
