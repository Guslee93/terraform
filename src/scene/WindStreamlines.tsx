import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import { Color } from 'three'
import type { FlowResult } from '../features/analysis/flowRunner'
import type { FootprintBuilding } from '../features/analysis/grid'
import { traceStreamlines, type WindCircle } from '../features/analysis/streamlines'
import { traceStreamlines3D } from '../features/analysis/streamlines3d'
import { enuToThreeXyz, type ThreeVec3 } from '../lib/coordinates'

const SLOW = new Color('#1E3A8A') // Forma-like: deep blue (slow) → violet (fast)
const FAST = new Color('#7B2FD1')
const colourFor = (ratio: number) => SLOW.clone().lerp(FAST, Math.min(1, Math.max(0, (ratio - 0.3) / 1.3)))

/**
 * Streamlines. `heightM: null` = 3D (rise over roofs / round towers, needs `flow.slices`);
 * a number = flat lines in that slice at that height. Falls back to the ground field at 1.5 m.
 */
export function WindStreamlines({ flow, circle, heightAt, heightM = null, opacity = 0.8, buildings = [] }: {
  flow: FlowResult
  circle: WindCircle
  heightAt: (east: number, north: number) => number
  heightM?: number | null
  opacity?: number
  buildings?: readonly FootprintBuilding[]
}) {
  const { centre, radius } = circle
  const segments = useMemo(() => {
    const points: ThreeVec3[] = []
    const colours: [number, number, number][] = []
    const push = (x: number, y: number, z: number, ratio: number) => {
      points.push(enuToThreeXyz([x, y, heightAt(x, y) + z]))
      const c = colourFor(ratio)
      colours.push([c.r, c.g, c.b])
    }
    if (heightM === null && flow.slices && flow.slices.length >= 2) {
      for (const line of traceStreamlines3D(flow.frame, flow.slices, buildings, radius)) {
        for (let i = 1; i < line.points.length; i++) for (const j of [i - 1, i]) {
          const [x, y, z] = line.points[j]!
          push(x, y, z, line.speeds[j]!)
        }
      }
    } else {
      const slice = heightM === null ? null : flow.slices?.find((s) => s.z === heightM)
      const field = slice ? { ...flow, velocity: slice.velocity, solid: slice.solid } : flow
      const lift = slice ? slice.z : 1.5
      for (const line of traceStreamlines(field, { centre, radius })) {
        for (let i = 1; i < line.points.length; i++) for (const j of [i - 1, i]) {
          const [x, y] = line.points[j]!
          push(x, y, lift, line.speeds[j]!)
        }
      }
    }
    return { points, colours }
  }, [flow, centre, radius, heightAt, heightM, buildings])

  if (segments.points.length < 2) return null
  return (
    <Line
      points={segments.points}
      vertexColors={segments.colours}
      segments
      lineWidth={1.2}
      transparent
      opacity={opacity}
      depthWrite={false}
      raycast={() => null}
      renderOrder={3}
    />
  )
}
