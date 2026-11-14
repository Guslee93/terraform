/// <reference lib="webworker" />
import type { AnalysisCircle } from './circle'
import { computeCircleSunHours, type CircleSunHours } from './circleSunHours'
import type { FootprintBuilding } from './grid'
import type { SunSample } from './shadowRay'

export type CircleSunRequest = {
  readonly buildings: readonly FootprintBuilding[]
  readonly circle: AnalysisCircle
  /** The day's samples already cut to the window (`windowSunSamples`). */
  readonly samples: readonly SunSample[]
}

export type CircleSunResponse = { readonly result: CircleSunHours }

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.onmessage = (event: MessageEvent<CircleSunRequest>) => {
    const { buildings, circle, samples } = event.data
    const response: CircleSunResponse = { result: computeCircleSunHours(buildings, circle, samples) }
    const { surface, facades } = response.result
    // The typed arrays move to the main thread instead of being copied.
    self.postMessage(response, [surface.hours.buffer, surface.surface.buffer, facades.positions.buffer, facades.hours.buffer, facades.building.buffer, facades.triangles.buffer])
  }
}
