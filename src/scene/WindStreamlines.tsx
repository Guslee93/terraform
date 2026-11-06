import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, Color } from 'three'
import type { FlowResult } from '../features/analysis/flowRunner'
import { traceStreamlines, type WindCircle } from '../features/analysis/streamlines'
import { enuToThreeXyz } from '../lib/coordinates'

const noRaycast = () => null

export function WindStreamlines({ flow, circle, heightAt }: {
  flow: FlowResult
  circle: WindCircle
  heightAt: (east: number, north: number) => number
}) {
  const { centre, radius } = circle
  const geometry = useMemo(() => {
    const positions: number[] = []
    const colours: number[] = []
    const blue = new Color('#1E3A8A')
    for (const line of traceStreamlines(flow, { centre, radius })) {
      for (let i = 1; i < line.points.length; i++) {
        for (const j of [i - 1, i]) {
          const p = line.points[j]!
          positions.push(...enuToThreeXyz([p[0], p[1], heightAt(...p) + 1.5]))
          colours.push(blue.r, blue.g, blue.b, Math.min(0.9, 0.15 + line.speeds[j]! * 0.5))
        }
      }
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    g.setAttribute('color', new BufferAttribute(new Float32Array(colours), 4))
    return g
  }, [flow, centre, radius, heightAt])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <lineSegments geometry={geometry} raycast={noRaycast} renderOrder={3}>
    <lineBasicMaterial vertexColors transparent depthWrite={false} />
  </lineSegments>
}
