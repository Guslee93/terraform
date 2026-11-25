import { useCallback, useEffect, useMemo } from 'react'
import { LineBasicMaterial } from 'three'
import { useRasterContours } from '../features/sites/useRasterContours'
import { createRasterContourGeometry } from './rasterContourGeometry'
import { applySceneFades } from './sceneFades'
import { sampleTerrainHeight } from '../features/sites/geometry'
import { hornSlopeDeg } from '../features/analysis/terrainTools'
import { sampleGrid } from './rasterTerrain'
import type { HazeInput } from './sceneFades'
import type { TerrainRaster } from '../features/analysis/terrainTools'
import type { TerrainData } from '../features/sites/package'
import type { SceneStyle } from './style'

const INTERVAL_M = 1
const MAJOR_INTERVAL_M = 5
// Contours show only on slopes (look spec §3): hidden below, full above (provisional, tunable).
const SLOPE_MIN_DEG = 3
const SLOPE_MAX_DEG = 12

/**
 * The 1 m-tile contours, rendered lazily so the worker and loader stay out of production (Run 8 T3).
 * Replaces the 16 m grid contours when the style's contourSource is 'tile1m' and a 1 m tile exists.
 * Fades each line by local slope (hornSlopeDeg, Run 9 T3) so flat ground stays quiet.
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
  const slopes = useMemo(() => hornSlopeDeg(raster), [raster])
  const slopeAt = useCallback((east: number, north: number) => sampleGrid(slopes, raster, east, north) ?? 0, [slopes, raster])

  const minorGeometry = useMemo(() => (contours.minor ? createRasterContourGeometry(contours.minor, heightAt, slopeAt) : null), [contours.minor, heightAt, slopeAt])
  const majorGeometry = useMemo(() => (contours.major ? createRasterContourGeometry(contours.major, heightAt, slopeAt) : null), [contours.major, heightAt, slopeAt])

  const slopeFade = useMemo(() => ({ min: style.tuning?.contourSlopeMinDeg ?? SLOPE_MIN_DEG, max: style.tuning?.contourSlopeMaxDeg ?? SLOPE_MAX_DEG }), [style.tuning?.contourSlopeMinDeg, style.tuning?.contourSlopeMaxDeg])
  const minorMaterial = useMemo(
    () => applySceneFades(new LineBasicMaterial({ color: style.lines.contourMinor.color, transparent: true, opacity: style.lines.contourMinor.opacity, depthWrite: false }), { cameraFade: minorFade, haze, slopeFade }),
    [style.lines.contourMinor, minorFade, haze, slopeFade],
  )
  const majorMaterial = useMemo(
    () => applySceneFades(new LineBasicMaterial({ color: style.lines.contourMajor.color, transparent: true, opacity: style.lines.contourMajor.opacity, depthWrite: false }), { haze, slopeFade }),
    [style.lines.contourMajor, haze, slopeFade],
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
