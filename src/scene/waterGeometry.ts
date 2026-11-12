import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2 } from 'three'
import type { WaterSurface } from '../features/sites/waterSurface'

/**
 * The water surfaces of a site, as one flat mesh.
 *
 * Each mapped body is triangulated in plan and lifted to its own water level, so the surface is
 * flat across the body and follows it along. The outline is the mapped one; nothing is widened
 * or moved.
 */

function signedArea(contour: readonly Vector2[]): number {
  let area = 0
  for (let index = 0; index < contour.length; index += 1) {
    const current = contour[index]
    const next = contour[(index + 1) % contour.length]
    if (!current || !next) continue
    area += current.x * next.y - next.x * current.y
  }
  return area / 2
}

/**
 * The outline and its levels without repeated vertices: the triangulator needs a ring without
 * zero-length edges, and a repeated vertex would shift the level that belongs to it.
 */
function outlineWithLevels(surface: WaterSurface): { contour: Vector2[]; levels: number[] } {
  const contour: Vector2[] = []
  const levels: number[] = []
  surface.ring.forEach(([east, north], index) => {
    const previous = contour[contour.length - 1]
    if (previous && previous.x === east && previous.y === north) return
    contour.push(new Vector2(east, north))
    levels.push(surface.levels[index] ?? 0)
  })
  while (contour.length > 1) {
    const first = contour[0]!
    const last = contour[contour.length - 1]!
    if (first.x === last.x && first.y === last.y) {
      contour.pop()
      levels.pop()
    } else break
  }
  return { contour, levels }
}

export function createWaterGeometry(surfaces: readonly WaterSurface[]): BufferGeometry {
  const positions: number[] = []

  for (const surface of surfaces) {
    const { contour, levels } = outlineWithLevels(surface)
    if (contour.length < 3) continue
    // Keep the outline counter-clockwise and the levels with it, so the faces point up.
    if (signedArea(contour) < 0) {
      contour.reverse()
      levels.reverse()
    }
    for (const face of ShapeUtils.triangulateShape(contour, [])) {
      const [indexA, indexB, indexC] = face
      if (indexA === undefined || indexB === undefined || indexC === undefined) continue
      const a = contour[indexA]
      const b = contour[indexB]
      const c = contour[indexC]
      if (!a || !b || !c) continue
      const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
      const second = cross < 0 ? c : b
      const third = cross < 0 ? b : c
      const secondIndex = cross < 0 ? indexC : indexB
      const thirdIndex = cross < 0 ? indexB : indexC
      positions.push(a.x, levels[indexA] ?? 0, -a.y)
      positions.push(second.x, levels[secondIndex] ?? 0, -second.y)
      positions.push(third.x, levels[thirdIndex] ?? 0, -third.y)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
