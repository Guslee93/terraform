/**
 * Coordinate policy (ADR-0002, PRD §4.1).
 *
 * Authored geometry lives in a local metric frame:
 *   east  (+x) — metres from the site origin
 *   north (+y) — metres from the site origin
 *   up    (+z) — metres above the site origin elevation
 *
 * Three.js is Y-up with a right-handed frame, so the renderer consumes
 * (east, up, -north). Never feed latitude/longitude into mesh vertices.
 */
export type Vec2 = readonly [east: number, north: number]
export type Vec3 = readonly [east: number, north: number, up: number]
export type ThreeVec3 = readonly [x: number, y: number, z: number]

export function enuToThreeXyz([east, north, up]: Vec3): ThreeVec3 {
  return [east, up, -north]
}

export function threeXyzToEnu([x, y, z]: ThreeVec3): Vec3 {
  return [x, -z, y]
}

export function horizontalDistance(a: Vec2, b: Vec2): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

export function isFiniteVec2(value: readonly number[]): value is Vec2 {
  return value.length === 2 && value.every(Number.isFinite)
}

export function isFiniteVec3(value: readonly number[]): value is Vec3 {
  return value.length === 3 && value.every(Number.isFinite)
}

/** Parse a user-entered metre value without accepting an empty or partial number. */
export function parseMetres(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.')
  if (trimmed === '') return null

  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}
