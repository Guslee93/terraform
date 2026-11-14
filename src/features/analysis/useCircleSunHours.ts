import { useEffect, useRef, useState } from 'react'
import type { AnalysisCircle } from './circle'
import type { CircleSunHours } from './circleSunHours'
import type { CircleSunRequest, CircleSunResponse } from './circleSunWorker'
import type { FootprintBuilding } from './grid'
import type { SunSample } from './shadowRay'

export type CircleSunState = {
  /** The latest result, kept on screen while a newer one computes; null before the first. */
  readonly result: CircleSunHours | null
  /** The buildings and circle that result was computed for: its indices name these buildings. */
  readonly buildings: readonly FootprintBuilding[]
  readonly circle: AnalysisCircle | null
  /** True while the shown result is not for the current inputs. */
  readonly computing: boolean
}

/**
 * Sun hours on every surface in the analysis circle, from a worker (ADR-0031). About half a second
 * on the densest curated site, so it never runs on the main thread; a 250 ms debounce keeps a drag or
 * a slider from starting a computation per frame. The previous result stays on the map, marked as
 * computing, until the new one arrives — the same as the wind map while it re-solves.
 */
export function useCircleSunHours(
  buildings: readonly FootprintBuilding[],
  circle: AnalysisCircle | null,
  samples: readonly SunSample[],
  enabled: boolean,
): CircleSunState {
  const [state, setState] = useState<{ buildings: readonly FootprintBuilding[]; circle: AnalysisCircle; samples: readonly SunSample[]; result: CircleSunHours } | null>(null)
  const worker = useRef<Worker | null>(null)

  useEffect(() => {
    if (!enabled || !circle || typeof Worker === 'undefined') return
    let cancelled = false
    const timer = setTimeout(() => {
      const active = new Worker(new URL('./circleSunWorker.ts', import.meta.url), { type: 'module' })
      worker.current = active
      active.onmessage = (event: MessageEvent<CircleSunResponse>) => {
        if (cancelled) return
        setState({ buildings, circle, samples, result: event.data.result })
        active.terminate()
        if (worker.current === active) worker.current = null
      }
      const request: CircleSunRequest = { buildings, circle, samples }
      active.postMessage(request)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
      worker.current?.terminate()
      worker.current = null
    }
  }, [enabled, buildings, circle, samples])

  if (!enabled || !state) return { result: null, buildings: [], circle: null, computing: enabled }
  const current = state.buildings === buildings && state.circle === circle && state.samples === samples
  return { result: state.result, buildings: state.buildings, circle: state.circle, computing: !current }
}
