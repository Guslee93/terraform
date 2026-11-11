import { useEffect, useMemo, useRef } from 'react'
import { Color, Object3D, type BufferGeometry, type InstancedMesh } from 'three'
import { sampleTerrainHeight } from '../features/sites/geometry'
import type { SitePackage } from '../features/sites/package'
import { createBranchGeometry, createCanopyGeometry, createSimpleCanopyGeometry, FOLIAGE_VARIANTS } from './foliage'
import { TREE_TINTS, treeVariant, type TreeShape, type TreeVariant } from './treeVariants'
import { pointsOutsideRings } from '../lib/cullPoints'
import type { Vec2 } from '../lib/coordinates'

/** Illustrative sizes (m) before the per-tree scale; OSM gives positions only. */
const CANOPY_RADIUS = 2.3
const TRUNK_HEIGHT = 2.8
const SHAPES: readonly TreeShape[] = ['round', 'tall']

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
}: {
  geometry: GeometryPair
  trees: readonly Placed[]
  branches?: boolean
}) {
  const canopyRef = useRef<InstancedMesh>(null)
  const branchRef = useRef<InstancedMesh>(null)

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
        canopy.setColorAt(index, color.set(TREE_TINTS[tree.tint] ?? TREE_TINTS[0]))
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
      canopy.setColorAt(index, color.set(TREE_TINTS[tree.tint] ?? TREE_TINTS[0]))

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
  }, [trees])

  if (trees.length === 0) return null
  return (
    <group>
      <instancedMesh ref={canopyRef} args={[geometry.canopy, undefined, trees.length]} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          flatShading
          roughness={0.9}
          transparent
          opacity={0.9}
          depthWrite
        />
      </instancedMesh>
      {withBranches && (
        <instancedMesh ref={branchRef} args={[geometry.branches, undefined, trees.length]} castShadow>
          <meshStandardMaterial color="#A39A8C" roughness={1} metalness={0} />
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
}: {
  sitePackage: SitePackage
  exclude?: readonly (readonly Vec2[])[]
  detail?: TreeDetail
}) {
  const { trees, terrain } = sitePackage
  const geometries = useMemo(
    () => (detail === 'simple'
      ? SHAPES.map((shape) => ({
        shape,
        variant: 0,
        canopy: createSimpleCanopyGeometry(shape),
        branches: createBranchGeometry(shape, 0),
      }))
      : SHAPES.flatMap((shape) => Array.from({ length: FOLIAGE_VARIANTS }, (_, variant) => ({
        shape,
        variant,
        canopy: createCanopyGeometry(shape, variant),
        branches: createBranchGeometry(shape, variant),
      })))),
    [detail],
  )
  useEffect(() => () => {
    for (const geometry of geometries) {
      geometry.canopy.dispose()
      geometry.branches.dispose()
    }
  }, [geometries])

  const groups = useMemo(() => {
    const visible = exclude ? pointsOutsideRings(trees, exclude) : trees
    const placed: Placed[] = visible.map(([east, north]) => ({
      east,
      north,
      ground: sampleTerrainHeight(terrain, east, north),
      ...treeVariant(east, north),
    }))
    return geometries.map((geometry) => ({
      geometry,
      // The simple tier has one canopy per shape, so every tree of that shape joins it.
      trees: placed.filter((tree) =>
        tree.shape === geometry.shape && (detail === 'simple' || tree.variant === geometry.variant)),
    }))
  }, [trees, terrain, geometries, exclude, detail])

  if (trees.length === 0) return null
  return (
    <group>
      {groups.map(({ geometry, trees: group }) => (
        <TreeInstances
          key={`${geometry.shape}-${geometry.variant}`}
          geometry={geometry}
          trees={group}
          branches={detail === 'full'}
        />
      ))}
    </group>
  )
}
