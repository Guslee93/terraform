import { useEffect, useState } from 'react'
import type { RasterGrid } from './contours'
import type { RasterContourRequest, RasterContourResponse } from './rasterContourWorker'

export type RasterContours = {
  /** Flat `[ax, ay, bx, by]` per segment, or null while the worker computes. */
  minor: Float32Array | null
  major: Float32Array | null
  computing: boolean
}

/**
 * The 1 m-tile contours, computed in a worker (TF-VIS-053). The pass costs ~130 ms over 458 k
 * cells, so it must not block the main thread. The result is cached per raster; a change re-runs
 * the worker and the previous result stays until the new one arrives.
 */
export function useRasterContours(
  raster: RasterGrid | null,
  interval: number,
  majorInterval: number,
  enabled: boolean,
  sigmaM = 3,
  minLengthM = 25,
): RasterContours {
  const [state, setState] = useState<{ raster: RasterGrid; minor: Float32Array; major: Float32Array } | null>(null)

  useEffect(() => {
    if (!enabled || !raster || typeof Worker === 'undefined') return
    let cancelled = false
    let active: Worker | null = null
    const timer = setTimeout(() => {
      active = new Worker(new URL('./rasterContourWorker.ts', import.meta.url), { type: 'module' })
      active.onmessage = (event: MessageEvent<RasterContourResponse>) => {
        if (!cancelled) setState({ raster, minor: event.data.minor, major: event.data.major })
        active?.terminate()
      }
      const request: RasterContourRequest = { raster, interval, majorInterval, sigmaM, minLengthM }
      active.postMessage(request)
    }, 0)
    return () => { cancelled = true; clearTimeout(timer); active?.terminate() }
  }, [enabled, raster, interval, majorInterval, sigmaM, minLengthM])

  if (!enabled || !state || state.raster !== raster) return { minor: null, major: null, computing: enabled && !!raster }
  return { minor: state.minor, major: state.major, computing: false }
}
