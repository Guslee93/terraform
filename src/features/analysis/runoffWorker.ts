/// <reference lib="webworker" />
import type { Vec2 } from '../../lib/coordinates'
import { computeRunoff, type Runoff } from './runoff'
import type { TerrainRaster } from './terrainTools'

export type RunoffRequest = {
  readonly raster: Pick<TerrainRaster, 'cols' | 'rows' | 'minX' | 'minY' | 'maxX' | 'maxY' | 'heights'>
  readonly footprints: readonly (readonly Vec2[])[]
}
export type RunoffResponse = { readonly runoff: Runoff }

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.onmessage = (event: MessageEvent<RunoffRequest>) => {
    const runoff = computeRunoff(event.data.raster, event.data.footprints)
    const response: RunoffResponse = { runoff }
    // The typed arrays move to the main thread instead of being copied.
    self.postMessage(response, [runoff.accumulation.buffer, runoff.hollow.buffer, runoff.building.buffer])
  }
}
