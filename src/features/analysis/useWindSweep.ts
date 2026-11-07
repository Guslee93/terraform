import { useEffect, useRef, useState } from 'react'
import type { Vec2 } from '../../lib/coordinates'
import type { FootprintBuilding } from './grid'
import type { SweepRequest, SweepResult } from './directionSweep'

export function useWindSweep(
  circle: { centre: Vec2; radius: number } | null,
  buildings: readonly FootprintBuilding[],
  enabled: boolean,
  downwash: boolean,
): SweepResult | null {
  const [result, setResult] = useState<SweepResult | null>(null)
  const worker = useRef<Worker | null>(null)
  const revision = useRef(0)
  const lastSent = useRef(-Infinity)
  const active = enabled && circle !== null
  const east = circle?.centre[0], north = circle?.centre[1], radius = circle?.radius

  useEffect(() => {
    if (!active || typeof Worker === 'undefined') return
    const w = new Worker(new URL('./sweepWorker.ts', import.meta.url), { type: 'module' })
    worker.current = w
    w.onmessage = (event: MessageEvent<SweepResult>) => {
      if (worker.current === w && event.data.id === revision.current) setResult(event.data)
    }
    return () => {
      w.terminate()
      worker.current = null
      setResult(null)
    }
  }, [active])

  useEffect(() => {
    const id = ++revision.current
    setResult(null)
    if (!active || east === undefined || north === undefined || radius === undefined) return
    const handle = setTimeout(() => {
      lastSent.current = performance.now()
      const request: SweepRequest = { id, centre: [east, north], radius, buildings, downwash }
      worker.current?.postMessage(request)
    }, Math.max(0, 250 - (performance.now() - lastSent.current)))
    return () => clearTimeout(handle)
  }, [active, east, north, radius, buildings, downwash])

  return active ? result : null
}
