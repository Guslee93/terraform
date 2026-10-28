/** Muted greens for canopy variety (Hektar-style); none is a species or health claim. */
export const TREE_TINTS = ['#9BBA94', '#AFC9A3', '#8AAD86', '#C0D4B2'] as const

export type TreeShape = 'round' | 'tall'

export type TreeVariant = {
  /** Multiplier on the illustrative tree size. */
  scale: number
  tint: number
  shape: TreeShape
  rotation: number
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
  }
}
