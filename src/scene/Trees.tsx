import { useEffect, useMemo, useRef } from 'react'
import {
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  Object3D,
  type BufferGeometry,
  type InstancedMesh,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { sampleTerrainHeight } from '../features/sites/geometry'
import type { SitePackage } from '../features/sites/package'
import { TREE_TINTS, treeVariant, type TreeShape } from './treeVariants'

const TRUNK_COLOR = '#B8B2A6'
/** Illustrative sizes (m) before the per-tree scale; OSM gives positions only. */
const CANOPY_RADIUS = 2.3
const TRUNK_HEIGHT = 2.8
/** Slightly see-through canopies read lighter and less blobby, as in the Hektar reference. */
const CANOPY_OPACITY = 0.82

/** Blob offsets (x, y, z) and radii, in canopy-radius units, for each canopy silhouette. */
const CANOPY_BLOBS: Record<TreeShape, readonly (readonly [number, number, number, number])[]> = {
  round: [
    [0, 0, 0, 1],
    [0.7, 0.25, 0.3, 0.72],
    [-0.62, 0.15, -0.35, 0.7],
    [0.1, 0.7, -0.2, 0.62],
  ],
  tall: [
    [0, 0, 0, 0.78],
    [0.15, 0.9, 0.05, 0.68],
    [-0.1, 1.65, -0.1, 0.5],
    [-0.3, 0.45, 0.3, 0.55],
  ],
}

function createCanopy(shape: TreeShape): BufferGeometry {
  const blobs = CANOPY_BLOBS[shape].map(([x, y, z, radius]) =>
    new IcosahedronGeometry(radius * CANOPY_RADIUS, 1).translate(
      x * CANOPY_RADIUS,
      y * CANOPY_RADIUS,
      z * CANOPY_RADIUS,
    ),
  )
  const merged = mergeGeometries(blobs)
  for (const blob of blobs) blob.dispose()
  return merged
}

type Placed = { east: number; north: number; ground: number; scale: number; rotation: number; tint: number }

function CanopyInstances({ shape, trees }: { shape: TreeShape; trees: readonly Placed[] }) {
  const ref = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => createCanopy(shape), [shape])
  useEffect(() => () => geometry.dispose(), [geometry])

  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const placer = new Object3D()
    const color = new Color()
    trees.forEach((tree, index) => {
      placer.position.set(
        tree.east,
        tree.ground + (TRUNK_HEIGHT + CANOPY_RADIUS * 0.75) * tree.scale,
        -tree.north,
      )
      placer.rotation.set(0, tree.rotation, 0)
      placer.scale.setScalar(tree.scale)
      placer.updateMatrix()
      mesh.setMatrixAt(index, placer.matrix)
      mesh.setColorAt(index, color.set(TREE_TINTS[tree.tint] ?? TREE_TINTS[0]))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [trees])

  if (trees.length === 0) return null
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, trees.length]} castShadow receiveShadow>
      <meshStandardMaterial
        roughness={0.95}
        metalness={0}
        flatShading
        transparent
        opacity={CANOPY_OPACITY}
      />
    </instancedMesh>
  )
}

/** OSM tree points as instanced low-poly trees with deterministic size, shape and tint variety. */
export function Trees({ sitePackage }: { sitePackage: SitePackage }) {
  const { trees, terrain } = sitePackage
  const trunkRef = useRef<InstancedMesh>(null)
  const trunk = useMemo(() => new CylinderGeometry(0.16, 0.24, TRUNK_HEIGHT, 6), [])
  useEffect(() => () => trunk.dispose(), [trunk])

  const placed = useMemo(
    () =>
      trees.map(([east, north]) => ({
        east,
        north,
        ground: sampleTerrainHeight(terrain, east, north),
        ...treeVariant(east, north),
      })),
    [trees, terrain],
  )
  const byShape = useMemo(
    () => ({
      round: placed.filter((tree) => tree.shape === 'round'),
      tall: placed.filter((tree) => tree.shape === 'tall'),
    }),
    [placed],
  )

  useEffect(() => {
    const mesh = trunkRef.current
    if (!mesh) return
    const placer = new Object3D()
    placed.forEach((tree, index) => {
      placer.position.set(tree.east, tree.ground + (TRUNK_HEIGHT / 2) * tree.scale, -tree.north)
      placer.scale.setScalar(tree.scale)
      placer.updateMatrix()
      mesh.setMatrixAt(index, placer.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [placed])

  if (placed.length === 0) return null
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunk, undefined, placed.length]} castShadow>
        <meshStandardMaterial color={TRUNK_COLOR} roughness={1} metalness={0} />
      </instancedMesh>
      <CanopyInstances shape="round" trees={byShape.round} />
      <CanopyInstances shape="tall" trees={byShape.tall} />
    </group>
  )
}
