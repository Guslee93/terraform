import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import type { Vec2, ThreeVec3 } from '../lib/coordinates'
import { enuToThreeXyz } from '../lib/coordinates'

const SEGMENTS = 96
const LIFT_M = 0.8
const INK = '#1F2328'
const noRaycast = () => null

/**
 * Ring on the terrain marking the wind analysis circle, plus a centre tick. Never picks.
 * Drawn on top (no depth test) as a dashed dark line over a white halo, so it reads over
 * buildings, the dark heatmap and particles alike.
 */
export function AnalysisCircle({ centre, radius, heightAt }: { centre: Vec2; radius: number; heightAt: (east: number, north: number) => number }) {
  const ring = useMemo<ThreeVec3[]>(() => Array.from({ length: SEGMENTS + 1 }, (_, i) => {
    const a = (2 * Math.PI * i) / SEGMENTS
    const x = centre[0] + radius * Math.cos(a)
    const y = centre[1] + radius * Math.sin(a)
    return enuToThreeXyz([x, y, heightAt(x, y) + LIFT_M])
  }), [centre, radius, heightAt])
  const tick = useMemo<ThreeVec3[]>(() => {
    const z = heightAt(centre[0], centre[1])
    return [enuToThreeXyz([centre[0], centre[1], z]), enuToThreeXyz([centre[0], centre[1], z + 12])]
  }, [centre, heightAt])

  return (
    <group>
      <Line points={ring} color="#FFFFFF" lineWidth={5} transparent opacity={0.75} depthTest={false} renderOrder={5} raycast={noRaycast} />
      <Line points={ring} color={INK} lineWidth={2} dashed dashSize={4} gapSize={2.5} depthTest={false} renderOrder={6} raycast={noRaycast} />
      <Line points={tick} color={INK} lineWidth={2} depthTest={false} renderOrder={6} raycast={noRaycast} />
    </group>
  )
}
