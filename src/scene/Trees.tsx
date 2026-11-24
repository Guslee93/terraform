import { useEffect, useCallback, useMemo, useRef } from 'react'
import { Color, MeshStandardMaterial, Object3D, type BufferGeometry, type InstancedMesh } from 'three'
import { sampleTerrainHeight } from '../features/sites/geometry'
import type { SitePackage } from '../features/sites/package'
import { dropTreesOnWater } from '../features/sites/treePlacement'
import { createBranchGeometry, createCanopyGeometry, createSimpleCanopyGeometry, FOLIAGE_VARIANTS, type CanopyLook } from './foliage'
import { TREE_TINTS, treeVariant, type TreeShape, type TreeVariant } from './treeVariants'
import { pointsOutsideRings } from '../lib/cullPoints'
import { createSpeckleAlphaTexture } from './speckleTexture'
import { applySceneFades, type HazeInput } from './sceneFades'
import type { Vec2 } from '../lib/coordinates'

/** Illustrative sizes (m) before the per-tree scale; OSM gives positions only. */
const CANOPY_RADIUS = 2.3
const TRUNK_HEIGHT = 2.8
const SHAPES: readonly TreeShape[] = ['round', 'tall', 'birch']
/** The identity's mix (visuals plan V4): rounded deciduous, conifers and sparse birches. */
const SPECKLED_SHAPES: readonly TreeShape[] = ['round', 'conifer', 'birch']

/**
 * Identity crown colours (visuals plan V4, look spec §2–3), used directly — Run 9 multiplied the
 * pastel crowns by dark greens and they turned near-black. Muted mid greens, conifers darker,
 * birches lighter; ≈ 12 % of faces become lighter flecks. Provisional.
 */
const IDENTITY_LOOKS: Record<TreeShape, CanopyLook> = {
  round: { palette: ['#5B6852', '#4F5C48', '#66725C', '#47533F'], flecks: 0.12 },
  tall: { palette: ['#5B6852', '#4F5C48'], flecks: 0.12 },
  birch: { palette: ['#6E7A62', '#7A856C', '#646F5A'], flecks: 0.16 },
  conifer: { palette: ['#3F4B3C', '#465243', '#3A4538'], flecks: 0.06 },
}
/** Near-white per-tree variation on top of the identity colours. */
const SPECKLE_TINTS = ['#FFFFFF', '#F1F4EC', '#F8FAF3'] as const
/** Dark trunks (references), identity only. */
const IDENTITY_TRUNK = '#3C3E39'
/** Identity crowns are larger, closer to mature city trees in the references (illustrative; OSM gives positions only). Provisional. */
const IDENTITY_SIZE = 1.3

type Placed = TreeVariant & { east: number; north: number; ground: number }
type GeometryPair = {
  shape: TreeShape
  variant: number
  canopy: BufferGeometry
  branches: BufferGeometry
}

/** 'simple' is the Low render tier: one lump per canopy and no branch mesh. */
export type TreeDetail = 'full' | 'simple'

function TreeInstances({
  geometry,
  trees,
  branches: withBranches = true,
  speckled = false,
  haze = null,
}: {
  geometry: GeometryPair
  trees: readonly Placed[]
  branches?: boolean
  speckled?: boolean
  haze?: HazeInput | null
}) {
  const canopyRef = useRef<InstancedMesh>(null)
  const branchRef = useRef<InstancedMesh>(null)
  const speckleMap = useMemo(() => (speckled ? createSpeckleAlphaTexture() : null), [speckled])
  useEffect(() => () => { speckleMap?.dispose() }, [speckleMap])
  const tintHex = useCallback((tint: number) => speckled ? (SPECKLE_TINTS[tint % SPECKLE_TINTS.length] ?? SPECKLE_TINTS[0]) : (TREE_TINTS[tint] ?? TREE_TINTS[0]), [speckled])
  const canopyMaterial = useMemo(() => {
    const material = new MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.9,
      transparent: true,
      opacity: speckled ? 1 : 0.9,
      alphaHash: speckled,
      depthWrite: !speckled,
    })
    if (speckleMap) material.alphaMap = speckleMap
    // Haze the crowns with the shared function (Run 10 T3): onBeforeCompile + alphaHash coexist.
    return applySceneFades(material, { haze })
  }, [speckled, speckleMap, haze])
  useEffect(() => () => { canopyMaterial.dispose() }, [canopyMaterial])

  useEffect(() => {
    const canopy = canopyRef.current
    const branches = branchRef.current
    if (!canopy) return
    if (!branches) {
      const placer = new Object3D()
      const color = new Color()
      trees.forEach((tree, index) => {
        placer.position.set(tree.east, tree.ground + (TRUNK_HEIGHT + CANOPY_RADIUS * 0.75) * tree.scale, -tree.north)
        placer.rotation.set(0, tree.rotation, 0)
        placer.scale.setScalar(CANOPY_RADIUS * tree.scale)
        placer.updateMatrix()
        canopy.setMatrixAt(index, placer.matrix)
        canopy.setColorAt(index, color.set(tintHex(tree.tint)))
      })
      canopy.instanceMatrix.needsUpdate = true
      if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true
      canopy.computeBoundingSphere()
      return
    }
    const placer = new Object3D()
    const color = new Color()
    trees.forEach((tree, index) => {
      placer.position.set(
        tree.east,
        tree.ground + (TRUNK_HEIGHT + CANOPY_RADIUS * 0.75) * tree.scale,
        -tree.north,
      )
      placer.rotation.set(0, tree.rotation, 0)
      placer.scale.setScalar(CANOPY_RADIUS * tree.scale)
      placer.updateMatrix()
      canopy.setMatrixAt(index, placer.matrix)
      canopy.setColorAt(index, color.set(tintHex(tree.tint)))

      placer.position.set(tree.east, tree.ground, -tree.north)
      placer.scale.setScalar(TRUNK_HEIGHT * tree.scale)
      placer.updateMatrix()
      branches.setMatrixAt(index, placer.matrix)
    })
    canopy.instanceMatrix.needsUpdate = true
    if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true
    branches.instanceMatrix.needsUpdate = true
    canopy.computeBoundingSphere()
    branches.computeBoundingSphere()
  }, [trees, tintHex])

  if (trees.length === 0) return null
  return (
    <group>
      <instancedMesh ref={canopyRef} args={[geometry.canopy, undefined, trees.length]} castShadow receiveShadow material={canopyMaterial} />
      {withBranches && (
        <instancedMesh ref={branchRef} args={[geometry.branches, undefined, trees.length]} castShadow>
          <meshStandardMaterial color={speckled ? IDENTITY_TRUNK : '#A39A8C'} roughness={1} metalness={0} />
        </instancedMesh>
      )}
    </group>
  )
}

/** OSM tree points as instanced leaf clusters; size and form are illustrative only. */
export function Trees({
  sitePackage,
  exclude,
  detail = 'full',
  speckled = false,
  haze = null,
}: {
  sitePackage: SitePackage
  exclude?: readonly (readonly Vec2[])[]
  detail?: TreeDetail
  /** Run 9 T5: see-through muted-green crowns via alphaHash + a speckle alpha map. */
  speckled?: boolean
  /** Run 10 T3: aerial-perspective haze, identity only. */
  haze?: HazeInput | null
}) {
  const { trees, terrain, landcover } = sitePackage
  const geometries = useMemo(
    () => (detail === 'simple'
      ? (speckled ? SPECKLED_SHAPES : SHAPES).map((shape) => ({
        shape,
        variant: 0,
        canopy: createSimpleCanopyGeometry(shape),
        branches: createBranchGeometry(shape, 0),
      }))
      : (speckled ? SPECKLED_SHAPES : SHAPES).flatMap((shape) => Array.from({ length: FOLIAGE_VARIANTS }, (_, variant) => ({
        shape,
        variant,
        canopy: createCanopyGeometry(shape, variant, speckled ? IDENTITY_LOOKS[shape] : undefined),
        branches: createBranchGeometry(shape, variant),
      })))),
    [detail, speckled],
  )
  useEffect(() => () => {
    for (const geometry of geometries) {
      geometry.canopy.dispose()
      geometry.branches.dispose()
    }
  }, [geometries])

  const groups = useMemo(() => {
    // A tree stands on ground: one may not stand where the studio paints water (ADR-0024).
    // The package holds the rule for new imports; this also covers a package imported before
    // the rule existed and still saved in the browser.
    const onGround = dropTreesOnWater(trees, landcover)
    const visible = exclude ? pointsOutsideRings(onGround, exclude) : onGround
    const placed: Placed[] = visible.map(([east, north]) => {
      const variant = treeVariant(east, north, speckled)
      return {
        east,
        north,
        ground: sampleTerrainHeight(terrain, east, north),
        ...variant,
        scale: speckled ? variant.scale * IDENTITY_SIZE : variant.scale,
      }
    })
    return geometries.map((geometry) => ({
      geometry,
      // The simple tier has one canopy per shape, so every tree of that shape joins it.
      trees: placed.filter((tree) =>
        tree.shape === geometry.shape && (detail === 'simple' || tree.variant === geometry.variant)),
    }))
  }, [trees, terrain, landcover, geometries, exclude, detail, speckled])

  if (trees.length === 0) return null
  return (
    <group>
      {groups.map(({ geometry, trees: group }) => (
        <TreeInstances
          key={`${geometry.shape}-${geometry.variant}`}
          geometry={geometry}
          trees={group}
          branches={detail === 'full'}
          speckled={speckled}
          haze={haze}
        />
      ))}
    </group>
  )
}
