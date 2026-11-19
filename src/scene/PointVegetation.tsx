import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, CanvasTexture, Float32BufferAttribute, PointsMaterial, SRGBColorSpace } from 'three'
import { sampleTerrainHeight } from '../features/sites/geometry'
import { dropTreesOnWater } from '../features/sites/treePlacement'
import { pointsOutsideRings } from '../lib/cullPoints'
import type { Vec2 } from '../lib/coordinates'
import type { SitePackage } from '../features/sites/package'
import { treeVariant } from './treeVariants'
import { buildVegetationPoints, VEGETATION_COLOUR, type VegetationShape } from './vegetationPoints'

/** Fixed seed: the same trees always give the same points (TF-VIS-029 determinism). */
const SEED = 0x51f1c3
/** Point size in world metres, attenuated with distance. */
const POINT_SIZE_M = 0.9

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

/** One LOD band, keyed on horizontal camera distance from the site origin. */
function lodBand(distance: number): 0 | 1 | 2 {
  if (distance > 800) return 2
  if (distance > 480) return 1
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
}: {
  sitePackage: SitePackage
  exclude?: readonly (readonly Vec2[])[]
  colour?: string
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
    return buildVegetationPoints(placed, SEED, colour)
  }, [trees, terrain, landcover, exclude, colour])

  const material = useMemo(() => {
    const pointsMaterial = new PointsMaterial({
      size: POINT_SIZE_M,
      sizeAttenuation: true,
      map: sprite,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.05,
      depthWrite: false,
    })
    // Clamp the attenuated point size so it never vanishes or bloats (DPR-stable: the drawing
    // buffer scales with the device pixel ratio, so the CSS size is constant).
    pointsMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        'gl_PointSize *= ( scale / - mvPosition.z );',
        'gl_PointSize = clamp( gl_PointSize * ( scale / - mvPosition.z ), 1.0, 24.0 );',
      )
    }
    return pointsMaterial
  }, [sprite])
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
