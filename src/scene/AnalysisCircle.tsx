import { useEffect, useMemo } from 'react'
import { BufferGeometry, Vector3 } from 'three'
import type { Vec2 } from '../lib/coordinates'
import { enuToThreeXyz } from '../lib/coordinates'

const SEGMENTS = 96
const LIFT_M = 0.8
const noRaycast = () => null

/** Thin ring on the terrain marking the wind analysis circle, plus a centre tick. Never picks. */
export function AnalysisCircle({ centre, radius, heightAt }: { centre: Vec2; radius: number; heightAt: (east: number, north: number) => number }) {
  const ring = useMemo(() => {
    const points = Array.from({ length: SEGMENTS }, (_, i) => {
      const a = (2 * Math.PI * i) / SEGMENTS
      const x = centre[0] + radius * Math.cos(a)
      const y = centre[1] + radius * Math.sin(a)
      return new Vector3(...enuToThreeXyz([x, y, heightAt(x, y) + LIFT_M]))
    })
    return new BufferGeometry().setFromPoints(points)
  }, [centre, radius, heightAt])
  const tick = useMemo(() => {
    const z = heightAt(centre[0], centre[1])
    return new BufferGeometry().setFromPoints([
      new Vector3(...enuToThreeXyz([centre[0], centre[1], z])),
      new Vector3(...enuToThreeXyz([centre[0], centre[1], z + 12])),
    ])
  }, [centre, heightAt])
  useEffect(() => () => ring.dispose(), [ring])
  useEffect(() => () => tick.dispose(), [tick])

  return (
    <group>
      <lineLoop geometry={ring} raycast={noRaycast} renderOrder={4}>
        <lineBasicMaterial color="#1F2328" transparent opacity={0.85} depthWrite={false} />
      </lineLoop>
      <lineSegments geometry={tick} raycast={noRaycast} renderOrder={4}>
        <lineBasicMaterial color="#1F2328" transparent opacity={0.85} depthWrite={false} />
      </lineSegments>
    </group>
  )
}
