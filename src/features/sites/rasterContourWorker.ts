/// <reference lib="webworker" />
import type { RasterGrid } from './contours'
import { flattenContours, rasterContourSegments } from './contours'

export type RasterContourRequest = {
  readonly raster: RasterGrid
  readonly interval: number
  readonly majorInterval: number
}
export type RasterContourResponse = {
  readonly minor: Float32Array
  readonly major: Float32Array
}

// TF-VIS-053: the 1 m-tile contour pass takes ~130 ms on 458 k cells, so it runs off the main
// thread. The typed arrays move to the main thread instead of being copied.
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.onmessage = (event: MessageEvent<RasterContourRequest>) => {
    const { minor, major } = rasterContourSegments(event.data.raster, event.data.interval, event.data.majorInterval)
    const minorFlat = flattenContours(minor)
    const majorFlat = flattenContours(major)
    const response: RasterContourResponse = { minor: minorFlat, major: majorFlat }
    self.postMessage(response, [minorFlat.buffer, majorFlat.buffer])
  }
}
