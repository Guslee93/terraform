import { useEffect, useMemo, useRef, useState } from 'react'
import type { Vec2 } from '../../lib/coordinates'
import type { FlowRequest, FlowResult } from './flowRunner'
import type { FootprintBuilding } from './grid'
import { flowFrame } from './lbm'

/** Grid for the analysis circle: 160² over 1.4 × the radius ≈ 1.75 m cells at r = 100 m. */
const GRID = 160
const MARGIN = 1.4

export type WindFlowState = {
  /** Latest field from the worker (may be a preview of older inputs while a newer request is pending). */
  readonly flow: FlowResult | null
  /** True only when `f` was solved for the current inputs (no newer edit pending). */
  readonly isCurrent: (f: FlowResult | null) => boolean
}

/** Live 2D flow from the worker; flow is null while off, before the first field, or where Workers are unavailable. */
export function useWindFlow(
  area: readonly Vec2[] | null,
  buildings: readonly FootprintBuilding[],
  fromBearingDeg: number,
  enabled: boolean,
  downwash = false,
  slices = false,
): WindFlowState {
  const [flow, setFlow] = useState<FlowResult | null>(null)
  const worker = useRef<Worker | null>(null)
  const lastFrame = useRef<unknown>(null)
  // Bumped on every input change, before throttling, so an older result can never pass as current.
  const revision = useRef(0)
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

  // Throttle edits (a drag emits many) so a continuous drag still re-solves every ~80 ms.
  const lastSent = useRef(0)
  useEffect(() => {
    if (!frame) return
    const id = ++revision.current
    const send = () => {
      lastSent.current = performance.now()
      const request: FlowRequest = { id, frame, buildings, reset: lastFrame.current !== frame, downwash, slices }
      lastFrame.current = frame
      worker.current?.postMessage(request)
    }
    const wait = Math.max(0, 80 - (performance.now() - lastSent.current))
    const handle = setTimeout(send, wait)
    return () => clearTimeout(handle)
  }, [frame, buildings, downwash, slices])

  return { flow: frame ? flow : null, isCurrent: (f) => !!f && f.id === revision.current }
}
