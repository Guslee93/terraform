import { useEffect, useMemo } from 'react'
import { DoubleSide } from 'three'
import type { ClimateOverlay } from '../features/analysis/climateView'
import { footprintTester, type FootprintBuilding } from '../features/analysis/grid'
import { heatmapGeometry } from './WindHeatmap'

const noRaycast = () => null

/**
 * Ground colours for the noise and sun-hours screening layers: one draped, continuous surface.
 * Cells inside buildings have no value; one ring of them is filled from their neighbours so the
 * colour reaches every wall instead of stopping a cell short. Silent areas stay empty.
 */
export function ClimateLayer({ overlay, heightAt, buildings = [] }: { overlay: ClimateOverlay; heightAt: (east: number, north: number) => number; buildings?: readonly FootprintBuilding[] }) {
  const inside = useMemo(() => footprintTester(buildings), [buildings])
  const geometry = useMemo(() => heatmapGeometry(overlay, heightAt, { rings: 1, allow: inside }), [overlay, heightAt, inside])
  useEffect(() => () => geometry.dispose(), [geometry])

  if (overlay.cells.length === 0) return null
  return (
    <mesh geometry={geometry} raycast={noRaycast} renderOrder={2}>
      <meshBasicMaterial vertexColors transparent opacity={0.55} depthWrite={false} side={DoubleSide} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  )
}
