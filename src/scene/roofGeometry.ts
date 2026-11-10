import { ShapeUtils, Vector2 } from 'three'
import type { Vec2 } from '../lib/coordinates'
import { ringCentroid } from '../lib/polygon'
import { ringSideOfRidge, roofHeightAt, type Roof } from '../features/sites/roof'

/**
 * Plan triangles of a building's roof (ADR-0022). A gable is split along its ridge first, so every
 * triangle lies on one roof plane and can be lifted vertex by vertex with `roofLift`.
 */
export function roofTriangles(footprint: readonly Vec2[], roof?: Roof): [Vec2, Vec2, Vec2][] {
  const rings = roof ? [ringSideOfRidge(footprint, roof, 1), ringSideOfRidge(footprint, roof, -1)] : [footprint]
  return rings.flatMap((ring) => {
    if (ring.length < 3) return []
    return ShapeUtils.triangulateShape(ring.map((point) => new Vector2(point[0], point[1])), []).flatMap((face): [Vec2, Vec2, Vec2][] => {
      const [a, b, c] = [ring[face[0] ?? -1], ring[face[1] ?? -1], ring[face[2] ?? -1]]
      if (!a || !b || !c) return []
      // Zero-area faces (bridges along the ridge) have no normal and would draw stray edge lines.
      return Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) > 1e-4 ? [[a, b, c]] : []
    })
  })
}

/**
 * Elevation a building's `height` is measured from. On a slope the terrain at the centroid is metres
 * above a context building's base, so overlays must not assume it.
 */
export function roofBase(building: { readonly footprint: readonly Vec2[]; readonly baseElevation?: number }, heightAt: (x: number, y: number) => number): number {
  if (building.baseElevation !== undefined) return building.baseElevation
  const centre = ringCentroid(building.footprint)
  return heightAt(centre[0], centre[1])
}

/** Roof height above the building's base at a plan position: the gable surface, or the flat top. */
export function roofLift(building: { readonly height: number; readonly roof?: Roof }): (x: number, y: number) => number {
  const { roof, height } = building
  return roof ? (x, y) => roofHeightAt(roof, x, y) : () => height
}
