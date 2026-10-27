import type { Vec2 } from '../../lib/coordinates'

/**
 * Pure grid-snapping maths for the M2 editing tools (ADR-0004 deliverable 8,
 * P0 grid snapping). This module is deliberately not wired into commands or
 * the UI yet; the tool state machine consumes it after review.
 *
 * Inputs and outputs are local ENU metres. No React or Three.js types.
 */

/** Default conceptual grid spacing in metres (v1 snapping grid). */
export const DEFAULT_GRID_STEP_M = 1

/** Number of decimal places encoded in a step's shortest decimal representation. */
function decimalPlaces(value: number): number {
  const text = String(value).toLowerCase()
  const exponentIndex = text.indexOf('e')
  if (exponentIndex !== -1) {
    const mantissa = text.slice(0, exponentIndex)
    const dot = mantissa.indexOf('.')
    const mantissaDecimals = dot === -1 ? 0 : mantissa.length - dot - 1
    const exponent = Number(text.slice(exponentIndex + 1))
    return Math.max(0, mantissaDecimals - exponent)
  }
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}

/** Round half away from zero: 2.5 → 3, -2.5 → -3. */
function roundHalfAway(value: number): number {
  if (value === 0) return 0
  return (value > 0 ? 1 : -1) * Math.round(Math.abs(value))
}

/**
 * Snap a value to the nearest multiple of `step`.
 *
 * Ties round away from zero (`snapValue(2.5, 1) === 3`, `snapValue(-2.5, 1) === -3`).
 * Non-finite or non-positive inputs are returned unchanged. Results never
 * produce `-0`, and decimal steps come back clean (`snapValue(0.29, 0.1) === 0.3`).
 */
export function snapValue(value: number, step: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value
  const snapped = roundHalfAway(value / step) * step
  const factor = 10 ** decimalPlaces(step)
  const normalized = Math.round((snapped + Number.EPSILON) * factor) / factor
  return normalized === 0 ? 0 : normalized
}

/**
 * Snap a point to the nearest `step` on the grid aligned to `origin`.
 *
 * `snapPoint([3.4, 7.6], 2, [1, 1])` → `[3, 7]`. Non-finite components pass
 * through unchanged via `snapValue`.
 */
export function snapPoint(point: Vec2, step: number, origin: Vec2 = [0, 0]): Vec2 {
  return [
    snapValue(point[0] - origin[0], step) + origin[0],
    snapValue(point[1] - origin[1], step) + origin[1],
  ]
}