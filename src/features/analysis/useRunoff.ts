import { useEffect, useState } from 'react'
import type { Vec2 } from '../../lib/coordinates'
import type { Runoff } from './runoff'
import type { RunoffRequest, RunoffResponse } from './runoffWorker'
import type { TerrainRaster } from './terrainTools'

type Footprints = readonly (readonly Vec2[])[]

/**
 * The runoff screening for a terrain tile and a set of buildings, from a worker (ADR-0038): half a
 * million cells are filled and routed, which must not block the studio. A 250 ms debounce keeps a
 * drag from starting a computation per frame; the previous result stays on the map, marked as
 * computing, until the new one arrives.
 */
export function useRunoff(raster: TerrainRaster | null, footprints: Footprints, enabled: boolean): { runoff: Runoff | null; computing: boolean } {
  const [state, setState] = useState<{ raster: TerrainRaster; footprints: Footprints; runoff: Runoff } | null>(null)
  useEffect(() => {
    if (!enabled || !raster || typeof Worker === 'undefined') return
    let cancelled = false
    let active: Worker | null = null
    const timer = setTimeout(() => {
      active = new Worker(new URL('./runoffWorker.ts', import.meta.url), { type: 'module' })
      active.onmessage = (event: MessageEvent<RunoffResponse>) => {
        if (!cancelled) setState({ raster, footprints, runoff: event.data.runoff })
        active?.terminate()
      }
      const { cols, rows, minX, minY, maxX, maxY, heights } = raster
      const request: RunoffRequest = { raster: { cols, rows, minX, minY, maxX, maxY, heights }, footprints }
      active.postMessage(request)
    }, 250)
    return () => { cancelled = true; clearTimeout(timer); active?.terminate() }
  }, [enabled, raster, footprints])
  if (!enabled || !state || state.raster !== raster) return { runoff: null, computing: enabled && !!raster }
  return { runoff: state.runoff, computing: state.footprints !== footprints }
}
