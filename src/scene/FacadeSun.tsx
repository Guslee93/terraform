import { useLayoutEffect, useRef } from 'react'
import { Color, DoubleSide, Object3D, Vector3, type InstancedMesh } from 'three'
import type { FacadeColourSample } from '../features/analysis/facadeSamples'
import { enuToThreeXyz } from '../lib/coordinates'

const noRaycast = () => null
const PLANE_NORMAL = new Vector3(0, 0, 1)

export type FacadeOverlay = {
  readonly values: readonly FacadeColourSample[]
}

/**
 * One instanced quad per façade sample, facing the wall's outward normal. The colour comes from the
 * active analysis (sun hours or VSC), so the scene owns no palette of its own.
 */
export function FacadeSun({
  overlay,
  heightAt,
}: {
  overlay: FacadeOverlay
  heightAt: (east: number, north: number) => number
}) {
  const mesh = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const target = mesh.current
    if (!target) return
    const dummy = new Object3D()
    const colour = new Color()
    const normal = new Vector3()
    overlay.values.forEach(({ sample, colour: hex }, index) => {
      const [x, y, z] = enuToThreeXyz([
        sample.p[0],
        sample.p[1],
        heightAt(sample.p[0], sample.p[1]) + sample.p[2],
      ])
      dummy.position.set(x, y, z)
      normal.set(sample.normal[0], 0, -sample.normal[1])
      dummy.quaternion.setFromUnitVectors(PLANE_NORMAL, normal)
      dummy.updateMatrix()
      target.setMatrixAt(index, dummy.matrix)
      target.setColorAt(index, colour.set(hex))
    })
    target.instanceMatrix.needsUpdate = true
    if (target.instanceColor) target.instanceColor.needsUpdate = true
  }, [overlay, heightAt])

  if (overlay.values.length === 0) return null
  return (
    <instancedMesh
      key={overlay.values.length}
      ref={mesh}
      args={[undefined, undefined, overlay.values.length]}
      raycast={noRaycast}
      renderOrder={2}
    >
      <planeGeometry args={[2.4, 2.6]} />
      <meshBasicMaterial
        transparent
        opacity={0.88}
        depthWrite={false}
        side={DoubleSide}
        polygonOffset
        polygonOffsetFactor={-2}
        toneMapped={false}
      />
    </instancedMesh>
  )
}
