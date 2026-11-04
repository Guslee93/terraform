import { useLayoutEffect, useRef } from 'react'
import { Color, DoubleSide, Object3D, type InstancedMesh } from 'three'
import type { ClimateOverlay } from '../features/analysis/climateView'
import { enuToThreeXyz } from '../lib/coordinates'

const LIFT_M = 0.5
const noRaycast = () => null

/** Ground-level colour cells for the wind/noise screening layers. One draw call, no picking. */
export function ClimateLayer({ overlay, heightAt }: { overlay: ClimateOverlay; heightAt: (east: number, north: number) => number }) {
  const mesh = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const target = mesh.current
    if (!target) return
    const dummy = new Object3D()
    const colour = new Color()
    overlay.cells.forEach((cell, index) => {
      const [x, y, z] = enuToThreeXyz([cell.x, cell.y, heightAt(cell.x, cell.y) + LIFT_M])
      dummy.position.set(x, y, z)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.updateMatrix()
      target.setMatrixAt(index, dummy.matrix)
      target.setColorAt(index, colour.set(cell.colour))
    })
    target.instanceMatrix.needsUpdate = true
    if (target.instanceColor) target.instanceColor.needsUpdate = true
  }, [overlay, heightAt])

  if (overlay.cells.length === 0) return null
  return (
    <instancedMesh key={overlay.cells.length} ref={mesh} args={[undefined, undefined, overlay.cells.length]} raycast={noRaycast} renderOrder={2}>
      <planeGeometry args={[overlay.cellM, overlay.cellM]} />
      <meshBasicMaterial transparent opacity={0.55} depthWrite={false} side={DoubleSide} polygonOffset polygonOffsetFactor={-2} />
    </instancedMesh>
  )
}
