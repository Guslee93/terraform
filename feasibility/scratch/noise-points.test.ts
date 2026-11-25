/**
 * Throwaway: the app's road-noise heuristic (src/features/analysis/noise.ts, unchanged) at a 7 x 7
 * lattice over the Compact Infill study area, for comparison with the official strategic Lden map.
 * Run: npx vitest run --config feasibility/scratch/vitest.config.ts noise-points
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { indexBuildings, insideAnyBuilding } from '../../src/features/analysis/grid'
import { noiseAt, type NoiseRoad } from '../../src/features/analysis/noise'
import type { Vec2 } from '../../src/lib/coordinates'

const read = (f: string) => JSON.parse(readFileSync(new URL(`../../public/sites/compact-infill/${f}`, import.meta.url), 'utf8'))

it('app noise heuristic on a lattice', () => {
  const roads: NoiseRoad[] = read('roads.json').roads
  const buildings = (read('buildings.json').buildings as { footprint: Vec2[]; height: number }[]).map((b) => ({ footprint: b.footprint, height: b.height }))
  const index = indexBuildings(buildings)
  const points = []
  for (let i = 0; i < 7; i++)
    for (let j = 0; j < 7; j++) {
      const x = -90 + i * 30
      const y = -114 + j * 38
      if (insideAnyBuilding(x, y, buildings, index)) continue
      points.push({ e: x, n: y, appDb: noiseAt(x, y, roads, buildings, index) })
    }
  writeFileSync(new URL('./evidence/noise-app-points.json', import.meta.url), JSON.stringify(points, null, 1))
  console.info(points.length, 'open-ground points')
})
