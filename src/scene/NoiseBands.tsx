import { useEffect, useMemo } from 'react'
import { CanvasTexture, DoubleSide, SRGBColorSpace } from 'three'
import { bandColour, type NoiseMetric, type NoisePolygon } from '../features/analysis/officialNoise'
import type { TerrainData } from '../features/sites/package'
import { planToPixel } from './landCoverTexture'
import { createTerrainGeometry } from './siteGeometry'

const noRaycast = () => null

/** One 2D path per polygon, outline and holes together, in canvas pixels. Exported for the test. */
export function noiseBandPaths(polygons: readonly NoisePolygon[], metric: NoiseMetric, terrain: TerrainData, size: number): { bandLow: number; rings: [number, number][][] }[] {
  return polygons
    .filter((polygon) => polygon.metric === metric)
    // Low bands first, so a higher band paints over a lower one where they are nested.
    .sort((a, b) => a.bandLow - b.bandLow)
    .map((polygon) => ({ bandLow: polygon.bandLow, rings: polygon.rings.map((ring) => ring.map(([east, north]) => planToPixel(terrain, size, east, north))) }))
}

/**
 * The mapped bands as one plan texture: every polygon filled even-odd, so the holes the map leaves
 * at buildings stay open. Null without a 2D canvas (tests) or without polygons for the metric.
 */
export function createNoiseTexture(polygons: readonly NoisePolygon[], metric: NoiseMetric, terrain: TerrainData, size = 2048): CanvasTexture | null {
  const paths = noiseBandPaths(polygons, metric, terrain, size)
  if (paths.length === 0) return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return null
  for (const { bandLow, rings } of paths) {
    context.fillStyle = bandColour(bandLow)
    context.beginPath()
    for (const ring of rings) {
      ring.forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)))
      context.closePath()
    }
    context.fill('evenodd')
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/**
 * A plan texture draped on a copy of the terrain mesh by its planar ENU UVs (ADR-0034): one mesh,
 * one texture. Shared by the noise bands and the slope overlay.
 */
export function DrapedTexture({ texture, terrain, opacity = 0.6 }: { texture: CanvasTexture | null; terrain: TerrainData; opacity?: number }) {
  const geometry = useMemo(() => createTerrainGeometry(terrain), [terrain])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => texture?.dispose(), [texture])
  if (!texture) return null
  return (
    <mesh geometry={geometry} raycast={noRaycast} renderOrder={2}>
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} side={DoubleSide} toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  )
}

/**
 * The official road-noise bands draped on the terrain (ADR-0034). No mesh per feature. The map is
 * static context: it is drawn as published and never reacts to the design.
 */
export function NoiseBands({ polygons, metric, terrain }: { polygons: readonly NoisePolygon[]; metric: NoiseMetric; terrain: TerrainData }) {
  const texture = useMemo(() => createNoiseTexture(polygons, metric, terrain), [polygons, metric, terrain])
  return <DrapedTexture texture={texture} terrain={terrain} />
}
