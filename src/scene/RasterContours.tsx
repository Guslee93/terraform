import { useCallback, useEffect, useMemo } from 'react'
import { LineBasicMaterial } from 'three'
import { useRasterContours } from '../features/sites/useRasterContours'
import { createRasterContourGeometry } from './rasterContourGeometry'
import { applySceneFades } from './sceneFades'
import { sampleTerrainHeight } from '../features/sites/geometry'
import type { HazeInput } from './sceneFades'
import type { TerrainRaster } from '../features/analysis/terrainTools'
import type { TerrainData } from '../features/sites/package'
import type { SceneStyle } from './style'

const INTERVAL_M = 1
const MAJOR_INTERVAL_M = 5

/**
 * The 1 m-tile contours, rendered lazily so the worker and loader stay out of production (Run 8 T3).
 * Replaces the 16 m grid contours when the style's contourSource is 'tile1m' and a 1 m tile exists.
 */
export function RasterContours({
  raster,
  terrain,
  style,
  minorFade,
  haze,
}: {
  raster: TerrainRaster
  terrain: TerrainData
  style: SceneStyle
  minorFade: { readonly start: number; readonly end: number } | null
  haze: HazeInput | null
}) {
  const contours = useRasterContours(raster, INTERVAL_M, MAJOR_INTERVAL_M, true)
  const heightAt = useCallback((east: number, north: number) => sampleTerrainHeight(terrain, east, north), [terrain])

  const minorGeometry = useMemo(() => (contours.minor ? createRasterContourGeometry(contours.minor, heightAt) : null), [contours.minor, heightAt])
  const majorGeometry = useMemo(() => (contours.major ? createRasterContourGeometry(contours.major, heightAt) : null), [contours.major, heightAt])

  const minorMaterial = useMemo(
    () => applySceneFades(new LineBasicMaterial({ color: style.lines.contourMinor.color, transparent: true, opacity: style.lines.contourMinor.opacity, depthWrite: false }), { cameraFade: minorFade, haze }),
    [style.lines.contourMinor, minorFade, haze],
  )
  const majorMaterial = useMemo(
    () => applySceneFades(new LineBasicMaterial({ color: style.lines.contourMajor.color, transparent: true, opacity: style.lines.contourMajor.opacity, depthWrite: false }), { haze }),
    [style.lines.contourMajor, haze],
  )

  useEffect(() => () => {
    minorGeometry?.dispose()
    majorGeometry?.dispose()
    minorMaterial.dispose()
    majorMaterial.dispose()
  }, [minorGeometry, majorGeometry, minorMaterial, majorMaterial])

  if (!minorGeometry || !majorGeometry) return null
  return (
    <group>
      <lineSegments geometry={minorGeometry} material={minorMaterial} />
      <lineSegments geometry={majorGeometry} material={majorMaterial} />
    </group>
  )
}

export default RasterContours
