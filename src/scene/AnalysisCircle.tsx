import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import type { Vec2, ThreeVec3 } from '../lib/coordinates'
import { enuToThreeXyz } from '../lib/coordinates'

const SEGMENTS = 96
const LIFT_M = 0.8
const INK = '#1F2328'
const noRaycast = () => null

/**
 * Ring on the terrain marking the analysis circle, plus a centre tick where nothing else marks the
 * centre (the wind lift handle does). Never picks. Drawn on top (no depth test) as a solid dark line
 * over a white halo, so it reads over buildings, the heatmap and particles alike — solid, not dashed,
 * since the owner asked for no dashed lines on the map (2026-11-15).
 */
export function AnalysisCircle({ centre, radius, heightAt, tick: showTick = true }: { centre: Vec2; radius: number; heightAt: (east: number, north: number) => number; tick?: boolean }) {
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
      <Line points={ring} color={INK} lineWidth={1.5} transparent opacity={0.7} depthTest={false} renderOrder={6} raycast={noRaycast} />
      {showTick && <Line points={tick} color={INK} lineWidth={2} depthTest={false} renderOrder={6} raycast={noRaycast} />}
    </group>
  )
}
