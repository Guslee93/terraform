import { useEffect, useMemo } from 'react'
import { BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { baselineMatches, windColour, type WindBaseline, type WindSettings } from '../features/analysis/climateView'
import type { FlowResult, FlowSlice } from '../features/analysis/flowRunner'
import type { FootprintBuilding } from '../features/analysis/grid'
import { sampleVelocity } from '../features/analysis/lbm'
import { enuToThreeXyz, type Vec2 } from '../lib/coordinates'
import { ringCentroid } from '../lib/polygon'
import { roofBase, roofLift, roofTriangles } from './roofGeometry'
import { WindSurface, type WindCircle } from './WindHeatmap'

export function roofSlice(slices: readonly FlowSlice[], height: number): FlowSlice | undefined {
  const sorted = [...slices].sort((a, b) => a.z - b.z)
  return sorted.find((slice) => slice.z >= height) ?? sorted.at(-1)
}

/** Clip a footprint triangle to one lattice square, retaining exact concave roof boundaries. */
function clipSquare(triangle: readonly Vec2[], x: number, y: number): Vec2[] {
  let polygon = [...triangle]
  for (const [axis, edge, sign] of [[0, x, 1], [0, x + 3, -1], [1, y, 1], [1, y + 3, -1]] as const) {
    const output: Vec2[] = []
    polygon.forEach((b, i) => {
      const a = polygon[(i + polygon.length - 1) % polygon.length]!
      const da = (a[axis] - edge) * sign, db = (b[axis] - edge) * sign
      if ((da >= 0) !== (db >= 0)) {
        const t = da / (da - db)
        output.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])
      }
      if (db >= 0) output.push(b)
    })
    polygon = output
  }
  return polygon
}

export function roofGeometry(buildings: readonly FootprintBuilding[], flow: FlowResult, circle: WindCircle, heightAt: (x: number, y: number) => number, wind: WindSettings, baseline: WindBaseline | null): BufferGeometry {
  const positions: number[] = [], colours: number[] = []
  const compatible = baseline && baselineMatches(baseline, circle, wind.from, wind.downwash)
  const colour = new Color()
  for (const building of buildings) {
    const centre = ringCentroid(building.footprint)
    if (Math.hypot(centre[0] - circle.centre[0], centre[1] - circle.centre[1]) > circle.radius) continue
    const slice = roofSlice(flow.slices ?? [], building.height)
    if (!slice) continue
    const beforeSlice = compatible ? roofSlice(baseline.flow.slices ?? [], building.height) : undefined
    const ground = roofBase(building, heightAt) + 0.3
    const lift = roofLift(building)
    const minX = Math.min(...building.footprint.map((p) => p[0])), minY = Math.min(...building.footprint.map((p) => p[1]))
    for (const points of roofTriangles(building.footprint, building.roof)) {
      const maxX = Math.max(...points.map((p) => p[0])), maxY = Math.max(...points.map((p) => p[1]))
      for (let y = minY + Math.floor((Math.min(...points.map((p) => p[1])) - minY) / 3) * 3; y < maxY; y += 3) {
        for (let x = minX + Math.floor((Math.min(...points.map((p) => p[0])) - minX) / 3) * 3; x < maxX; x += 3) {
          const polygon = clipSquare(points, x, y)
          for (let i = 1; i + 1 < polygon.length; i++) {
            const vertices = [polygon[0]!, polygon[i]!, polygon[i + 1]!]
            const samples = vertices.map((p) => {
              const v = sampleVelocity(flow.frame, slice.velocity, slice.solid, p)
              const before = beforeSlice && baseline ? sampleVelocity(baseline.flow.frame, beforeSlice.velocity, beforeSlice.solid, p) : null
              return v ? windColour(Math.hypot(...v), wind, before ? Math.hypot(...before) : undefined) : null
            })
            if (samples.some((c) => c === null)) continue
            vertices.forEach((p, j) => {
              positions.push(...enuToThreeXyz([p[0], p[1], ground + lift(p[0], p[1])]))
              colour.set(samples[j]!); colours.push(colour.r, colour.g, colour.b)
            })
          }
        }
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3))
  return geometry
}

export function RoofWind({ buildings, flow, circle, heightAt, wind, baseline }: { buildings: readonly FootprintBuilding[]; flow: FlowResult; circle: WindCircle; heightAt: (x: number, y: number) => number; wind: WindSettings; baseline: WindBaseline | null }) {
  const geometry = useMemo(() => roofGeometry(buildings, flow, circle, heightAt, wind, baseline), [buildings, flow, circle, heightAt, wind, baseline])
  useEffect(() => () => geometry.dispose(), [geometry])
  return flow.slices ? <WindSurface geometry={geometry} /> : null
}
