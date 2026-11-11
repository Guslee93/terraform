import {
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Quaternion,
  Vector3,
  type BufferGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { soften } from './palette'
import type { TreeShape } from './treeVariants'

export const FOLIAGE_VARIANTS = 6

const GREENS = ['#A9CBA0', '#8FBB8A', '#C3DAB5', '#7FAE7E'].map((green) => soften(green))
const RADII: Record<TreeShape, readonly [number, number, number]> = {
  round: [1, 0.8, 1],
  tall: [0.65, 1.45, 0.65],
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), state | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000
  }
}

function direction(random: () => number): Vector3 {
  const y = random() * 2 - 1
  const azimuth = random() * Math.PI * 2
  const radius = Math.sqrt(1 - y * y)
  return new Vector3(radius * Math.cos(azimuth), y, radius * Math.sin(azimuth))
}

function mergeAndDispose(parts: BufferGeometry[]): BufferGeometry {
  try {
    const geometry = mergeGeometries(parts)
    if (!geometry) throw new Error('Could not merge foliage geometry')
    geometry.computeVertexNormals()
    return geometry
  } finally {
    for (const part of parts) part.dispose()
  }
}

/** Illustrative leaf clumps, centred at the origin in canopy-radius units. */
export function createCanopyGeometry(shape: TreeShape, seed: number): BufferGeometry {
  const random = mulberry32(seed)
  const count = 18 + Math.floor(random() * 11)
  const radii = new Vector3(...RADII[shape])
  const paletteOffset = Math.floor(random() * GREENS.length)
  const parts: BufferGeometry[] = []

  for (let clump = 0; clump < count; clump += 1) {
    const radius = 0.28 + random() * 0.27
    const centre = direction(random).multiplyScalar(Math.cbrt(random()) ** 0.6).multiply(radii)
    // Detail zero is already non-indexed (20 triangular faces).
    const geometry = new IcosahedronGeometry(radius, 0)
    const positions = geometry.getAttribute('position')
    const jittered = new Map<string, Vector3>()
    for (let index = 0; index < positions.count; index += 1) {
      const vertex = new Vector3().fromBufferAttribute(positions, index)
      const key = `${vertex.x},${vertex.y},${vertex.z}`
      let displaced = jittered.get(key)
      if (!displaced) {
        // Share displacement at repeated corners so each clump stays closed.
        displaced = vertex.add(direction(random).multiplyScalar(random() * radius * 0.18))
        jittered.set(key, displaced)
      }
      positions.setXYZ(index, displaced.x, displaced.y, displaced.z)
    }
    geometry.rotateX(random() * Math.PI * 2)
    geometry.rotateY(random() * Math.PI * 2)
    geometry.rotateZ(random() * Math.PI * 2)
    geometry.translate(centre.x, centre.y, centre.z)

    // Guarantee the palette is represented, then choose freely for remaining clumps.
    const paletteIndex = clump < 4 ? (clump + paletteOffset) % 4 : Math.floor(random() * 4)
    const base = new Color(GREENS[paletteIndex] ?? GREENS[0]) // sRGB hex → linear RGB
    const colors: number[] = []
    for (let face = 0; face < positions.count / 3; face += 1) {
      const color = base.clone().multiplyScalar(0.94 + random() * 0.12)
      for (let corner = 0; corner < 3; corner += 1) colors.push(color.r, color.g, color.b)
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    parts.push(geometry)
  }
  return mergeAndDispose(parts)
}

/**
 * A single-lump canopy in the shape's proportions, for the Low render tier.
 *
 * The full canopy is 18–28 clumps per tree, which is a few hundred triangles each. A city block
 * with a thousand mapped trees turns that into hundreds of thousands of triangles, and a software
 * rasteriser cannot draw them. One icosahedron per tree reads the same at a distance.
 */
export function createSimpleCanopyGeometry(shape: TreeShape): BufferGeometry {
  const geometry = new IcosahedronGeometry(1, 0)
  const radii = RADII[shape]
  geometry.scale(radii[0], radii[1], radii[2])
  const positions = geometry.getAttribute('position')
  const base = new Color(GREENS[0] ?? GREENS[0]!) // sRGB hex → linear RGB
  const colors: number[] = []
  for (let face = 0; face < positions.count / 3; face += 1) {
    const color = base.clone().multiplyScalar(0.94 + ((face * 7) % 10) * 0.012)
    for (let corner = 0; corner < 3; corner += 1) colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

/** Unit-height trunk rooted at y=0 with tapered forks inside the illustrative canopy. */
export function createBranchGeometry(shape: TreeShape, seed: number): BufferGeometry {
  const random = mulberry32(seed)
  const parts: BufferGeometry[] = []
  const up = new Vector3(0, 1, 0)

  function cylinder(start: Vector3, end: Vector3, bottom: number, top: number) {
    const delta = end.clone().sub(start)
    const indexed = new CylinderGeometry(top, bottom, delta.length(), 5)
    const geometry = indexed.toNonIndexed()
    indexed.dispose()
    geometry.applyQuaternion(new Quaternion().setFromUnitVectors(up, delta.normalize()))
    const midpoint = start.clone().add(end).multiplyScalar(0.5)
    geometry.translate(midpoint.x, midpoint.y, midpoint.z)
    parts.push(geometry)
  }

  cylinder(new Vector3(), new Vector3(0, 1, 0), 0.24 / 2.8, 0.16 / 2.8)
  const count = 2 + Math.floor(random() * 2)
  const rotation = random() * Math.PI * 2
  for (let branch = 0; branch < count; branch += 1) {
    const start = new Vector3(0, 2 / 3 + random() * 0.23, 0)
    const angle = ((25 + random() * 20) * Math.PI) / 180
    const azimuth = rotation + (branch / count) * Math.PI * 2 + (random() - 0.5) * 0.4
    const length = (shape === 'tall' ? 0.6 : 0.5) + random() * 0.1
    const end = new Vector3(
      Math.sin(angle) * Math.cos(azimuth),
      Math.cos(angle),
      Math.sin(angle) * Math.sin(azimuth),
    ).multiplyScalar(length).add(start)
    cylinder(start, end, 0.035, 0.012)
  }
  return mergeAndDispose(parts)
}
