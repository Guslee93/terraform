/**
 * Inspector field parsing and display (design contract: 2 dp, unit as a suffix inside the
 * field). Range checks stay in validation; these only decide whether text is a number.
 * Metre parsing lives in `parseMetres` (src/lib/coordinates.ts).
 */

/** Digits only → integer; anything else (decimals, signs, units, exponents) → null. */
export function parseStoreys(text: string): number | null {
  const trimmed = text.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null
}

/** Two decimals with a `.` separator and no unit; never `-0.00`; non-finite → ''. */
export function formatInputValue(value: number): string {
  if (!Number.isFinite(value)) return ''
  const text = value.toFixed(2)
  return Number(text) === 0 ? '0.00' : text
}
