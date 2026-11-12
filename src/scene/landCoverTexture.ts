import { CanvasTexture, SRGBColorSpace } from 'three'
import type { LandCoverArea, LandCoverKind, TerrainData } from '../features/sites/package'
import { soften } from './palette'

/**
 * Plan colours, multiplied with the near-white terrain vertex colours, so the rendered result
 * lands on the muted Hektar-like swatches (green space ≈ #D3DCCB, water ≈ #C6DCE8).
 */
const LANDCOVER_PAINT: Record<LandCoverKind, string> = {
  grass: soften('#E4EADD'),
  park: soften('#DCE5D5'),
  wood: soften('#D2DECC'),
  scrub: soften('#D7E0CA'),
  wetland: soften('#D3DED3'),
  field: soften('#E2E6D3'),
  pitch: soften('#DFE3D1'),
  cemetery: soften('#E1E5D9'),
  bare: soften('#E7E4DD'),
  nature: soften('#D8E1D0'),
  plaza: soften('#D9D6CF'),
  water: soften('#CBE1EE'),
}

/**
 * The colour of the water surface (ADR-0025). Water is no longer a tint on the terrain, but it
 * keeps the colour it had, so the studio looks the same where the ground is not modelled.
 */
export const WATER_COLOR = LANDCOVER_PAINT.water

/**
 * Draw order: broad ground first, then the more specific green kinds over it, then paved areas.
 * Water is not painted: it is a surface of its own, so it cannot take the relief of the ground
 * it covers (ADR-0025).
 */
const PAINT_ORDER: readonly LandCoverKind[] = [
  'bare', 'grass', 'field', 'wetland', 'pitch', 'cemetery', 'park', 'nature', 'wood', 'scrub', 'plaza',
]

/**
 * Canvas pixel for an ENU point. Matches the terrain mesh UVs (u = east, v = north) with the
 * texture's default flipY, so north is the top row of the canvas.
 */
export function planToPixel(
  terrain: TerrainData,
  size: number,
  east: number,
  north: number,
): [number, number] {
  return [
    ((east - terrain.minX) / (terrain.maxX - terrain.minX)) * size,
    ((terrain.maxY - north) / (terrain.maxY - terrain.minY)) * size,
  ]
}

/**
 * Plan-view texture of land cover, laid over the terrain mesh (its vertex colours multiply it,
 * so white is neutral). Returns null without a 2D canvas (tests, very old browsers).
 */
export function createLandCoverTexture(
  areas: readonly LandCoverArea[],
  terrain: TerrainData,
  size = 2048,
): CanvasTexture | null {
  if (areas.length === 0) return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return null

  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, size, size)
  for (const kind of PAINT_ORDER) {
    context.fillStyle = LANDCOVER_PAINT[kind]
    for (const area of areas) {
      if (area.kind !== kind) continue
      context.beginPath()
      area.ring.forEach(([east, north], index) => {
        const [x, y] = planToPixel(terrain, size, east, north)
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
      context.closePath()
      context.fill()
    }
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}
