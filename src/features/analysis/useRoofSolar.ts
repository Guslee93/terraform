import { useEffect, useRef, useState } from 'react'
import type { FootprintBuilding } from './grid'
import type { RoofSolarValue } from './roofSolar'
import type { RoofSolarRequest, RoofSolarResponse } from './roofSolarWorker'
import type { SunLocation } from './shadowRay'

/**
 * Annual roof irradiation from the worker (ADR-0021). The exact ray test over 2 m roof samples takes
 * seconds on the real site, so it never runs on the main thread. A result is reused while the same
 * building array and location are selected (the studio memoises `buildings` between edits).
 */
export function useRoofSolar(
  buildings: readonly FootprintBuilding[],
  location: SunLocation | null,
  enabled: boolean,
  focus?: readonly number[],
): readonly RoofSolarValue[] | null {
  const [values, setValues] = useState<readonly RoofSolarValue[] | null>(null)
  const cache = useRef<{
    buildings: readonly FootprintBuilding[]
    location: SunLocation
    focus?: readonly number[]
    values: readonly RoofSolarValue[]
  } | null>(null)
  const worker = useRef<Worker | null>(null)

  useEffect(() => {
    if (!enabled || !location) return
    if (
      cache.current
      && cache.current.buildings === buildings
      && cache.current.location === location
      && cache.current.focus === focus
    ) {
      setValues(cache.current.values)
      return
    }
    if (typeof Worker === 'undefined') return
    // Never show the previous buildings' values against a new mass: clear, compute, then colour.
    setValues(null)
    let cancelled = false
    const timer = setTimeout(() => {
      const active = new Worker(new URL('./roofSolarWorker.ts', import.meta.url), { type: 'module' })
      worker.current = active
      active.onmessage = (event: MessageEvent<RoofSolarResponse>) => {
        if (cancelled) return
        cache.current = { buildings, location, focus, values: event.data.values }
        setValues(event.data.values)
        active.terminate()
        if (worker.current === active) worker.current = null
      }
      const request: RoofSolarRequest = { buildings, location, focus }
      active.postMessage(request)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
      worker.current?.terminate()
      worker.current = null
    }
  }, [enabled, buildings, location, focus])

  return enabled ? values : null
}
