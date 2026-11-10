/// <reference lib="webworker" />
import type { FootprintBuilding } from './grid'
import { computeRoofSolar, type RoofSolarValue } from './roofSolar'
import type { SunLocation } from './shadowRay'

export type RoofSolarRequest = {
  readonly buildings: readonly FootprintBuilding[]
  readonly location: SunLocation
}

export type RoofSolarResponse = {
  readonly values: readonly RoofSolarValue[]
}

if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.onmessage = (event: MessageEvent<RoofSolarRequest>) => {
    const response: RoofSolarResponse = {
      values: computeRoofSolar(event.data.buildings, event.data.location),
    }
    self.postMessage(response)
  }
}
