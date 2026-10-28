import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape } from 'three'
import { enuToThreeXyz, type ThreeVec3 } from '../lib/coordinates'
import { ringCentroid } from '../lib/polygon'
import { tierHeight, tierTop } from '../features/massing/aggregate'
import type { MassTier } from '../features/massing/types'

export type TierShape = Pick<MassTier, 'footprint' | 'baseElevation' | 'storeys' | 'storeyHeight'>

/**
 * Scene adapter for massing tiers (ADR-0002). The footprint is a shape in the
 * (east, north) plane, extruded along +z by the tier height, then rotated so
 * (east, north, up) lands on the renderer frame (east, up, -north).
 */
export function createTierGeometry(tier: TierShape): BufferGeometry {
  const shape = new Shape()
  tier.footprint.vertices.forEach(([east, north], index) => {
    if (index === 0) shape.moveTo(east, north)
    else shape.lineTo(east, north)
  })
  shape.closePath()

  const geometry = new ExtrudeGeometry(shape, { depth: tierHeight(tier), bevelEnabled: false })
  // rotateX(−π/2) maps (x, y, z) → (x, z, −y), i.e. (east, north, up) → (east, up, −north).
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, tier.baseElevation, 0)
  geometry.computeVertexNormals()
  return geometry
}

/** Floor lines at every intermediate storey (k × storeyHeight above the base), as line-segment pairs. */
export function createStoreyLineGeometry(tier: TierShape): BufferGeometry {
  const positions: number[] = []
  const vertices = tier.footprint.vertices
  for (let storey = 1; storey < tier.storeys; storey += 1) {
    const up = tier.baseElevation + storey * tier.storeyHeight
    vertices.forEach(([east, north], index) => {
      const next = vertices[(index + 1) % vertices.length]
      if (!next) return
      positions.push(...enuToThreeXyz([east, north, up]), ...enuToThreeXyz([next[0], next[1], up]))
    })
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geometry
}

/** Roof handle sits on the top face at the footprint's vertex centroid. */
export function roofHandlePosition(tier: MassTier): ThreeVec3 {
  const [east, north] = ringCentroid(tier.footprint.vertices)
  return enuToThreeXyz([east, north, tierTop(tier)])
}
