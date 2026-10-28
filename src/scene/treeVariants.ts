import { FOLIAGE_VARIANTS } from './foliage'

/** Near-white multipliers preserve the canopy's per-face greens. */
export const TREE_TINTS = ['#FFFFFF', '#F2F7EE', '#FAFFF5', '#EAF2E6'] as const

export type TreeShape = 'round' | 'tall'

export type TreeVariant = {
  /** Multiplier on the illustrative tree size. */
  scale: number
  tint: number
  shape: TreeShape
  rotation: number
  variant: number
}

/** Small integer hash of a position (centimetre grid), so variety is stable across loads. */
function hash(east: number, north: number, salt: number): number {
  let value = Math.imul(Math.round(east * 100) ^ 0x9e3779b9, 0x85ebca6b)
  value = Math.imul(value ^ Math.round(north * 100) ^ salt, 0xc2b2ae35)
  value ^= value >>> 16
  return (value >>> 0) / 0x100000000
}

/**
 * Deterministic visual variety for an OSM tree point. OSM gives positions only, so size,
 * shape and tint are illustrative and only break up repetition.
 */
export function treeVariant(east: number, north: number): TreeVariant {
  return {
    scale: 0.75 + hash(east, north, 1) * 0.6,
    tint: Math.floor(hash(east, north, 2) * TREE_TINTS.length),
    shape: hash(east, north, 3) < 0.35 ? 'tall' : 'round',
    rotation: hash(east, north, 4) * Math.PI * 2,
    variant: Math.floor(hash(east, north, 5) * FOLIAGE_VARIANTS),
  }
}
