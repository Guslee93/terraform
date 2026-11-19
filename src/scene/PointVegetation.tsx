import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BufferGeometry, CanvasTexture, Float32BufferAttribute, PointsMaterial, SRGBColorSpace } from 'three'
import { sampleTerrainHeight } from '../features/sites/geometry'
import { dropTreesOnWater } from '../features/sites/treePlacement'
import { pointsOutsideRings } from '../lib/cullPoints'
import type { Vec2 } from '../lib/coordinates'
import type { SitePackage } from '../features/sites/package'
import { treeVariant } from './treeVariants'
import { buildVegetationPoints, VEGETATION_COLOUR, type VegetationShape } from './vegetationPoints'
import { applySceneFades } from './sceneFades'
import type { DissolveParams } from './dissolve'

/** Fixed seed: the same trees always give the same points (TF-VIS-029 determinism). */
const SEED = 0x51f1c3
/** Point size in CSS pixels (screen-stable, provisional), clamped to this range. */
const POINT_SIZE_PX = 2.5
const POINT_SIZE_MIN_PX = 1.5
const POINT_SIZE_MAX_PX = 4

/** A soft round dot sprite, generated in code (no asset). */
function makeRoundSprite(): CanvasTexture {
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.85)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** One LOD band, keyed on horizontal camera distance from the site origin. The isometric preset
 *  sits at ~516 m, so it stays in the full band. */
function lodBand(distance: number): 0 | 1 | 2 {
  if (distance > 1200) return 2
  if (distance > 600) return 1
  return 0
}

/**
 * The airy point-cloud vegetation (TF-VIS-029), replacing the instanced mesh trees in the identity
 * style. Static (never animated), excluded from raycasting so it never blocks picking or orbiting.
 */
export function PointVegetation({
  sitePackage,
  exclude,
  colour = VEGETATION_COLOUR,
  dissolve = null,
  pointSizeMinPx = POINT_SIZE_MIN_PX,
  pointSizeMaxPx = POINT_SIZE_MAX_PX,
  density = 1,
}: {
  sitePackage: SitePackage
  exclude?: readonly (readonly Vec2[])[]
  colour?: string
  dissolve?: DissolveParams | null
  pointSizeMinPx?: number
  pointSizeMaxPx?: number
  density?: number
}) {
  const { trees, terrain, landcover } = sitePackage
  const sprite = useMemo(makeRoundSprite, [])
  useEffect(() => () => sprite.dispose(), [sprite])

  const lods = useMemo(() => {
    // Same water filter and illustrative variants as the mesh trees (ADR-0024, Trees.tsx).
    const onGround = dropTreesOnWater(trees, landcover)
    const visible = exclude ? pointsOutsideRings(onGround, exclude) : onGround
    const placed = visible.map(([east, north]) => {
      const variant = treeVariant(east, north)
      return {
        east,
        north,
        ground: sampleTerrainHeight(terrain, east, north),
        scale: variant.scale,
        shape: variant.shape as VegetationShape,
      }
    })
    return buildVegetationPoints(placed, SEED, colour, density)
  }, [trees, terrain, landcover, exclude, colour, density])

  const gl = useThree((state) => state.gl)
  const dpr = gl.getPixelRatio()
  const material = useMemo(() => {
    const pointsMaterial = new PointsMaterial({
      // Screen-stable: a constant size in device pixels (CSS px × DPR), no distance attenuation.
      size: Math.min(pointSizeMaxPx, Math.max(pointSizeMinPx, POINT_SIZE_PX)) * dpr,
      sizeAttenuation: false,
      map: sprite,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.05,
      depthWrite: false,
    })
    // Dissolve the points toward the tile edge (TF-VIS-02A Run 8).
    applySceneFades(pointsMaterial, { dissolve })
    return pointsMaterial
  }, [sprite, dissolve, dpr, pointSizeMinPx, pointSizeMaxPx])
  useEffect(() => () => material.dispose(), [material])

  const geometry = useMemo(() => {
    const buffer = new BufferGeometry()
    buffer.setAttribute('position', new Float32BufferAttribute(lods.full.positions, 3))
    buffer.setAttribute('color', new Float32BufferAttribute(lods.full.colors, 3))
    return buffer
  }, [lods])
  useEffect(() => () => geometry.dispose(), [geometry])

  const bandRef = useRef<0 | 1 | 2>(0)
  useFrame(({ camera }) => {
    const band = lodBand(Math.hypot(camera.position.x, camera.position.z))
    if (band === bandRef.current) return
    bandRef.current = band
    const lod = band === 2 ? lods.far : band === 1 ? lods.mid : lods.full
    geometry.setAttribute('position', new Float32BufferAttribute(lod.positions, 3))
    geometry.setAttribute('color', new Float32BufferAttribute(lod.colors, 3))
  })

  if (lods.full.positions.length === 0) return null
  return <points geometry={geometry} material={material} raycast={() => null} frustumCulled={false} />
}
