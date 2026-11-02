/** Stable display units, with thin-space grouping and no rounded negative zero. */
function number(value: number, decimals: number): string {
  const rounded = Number(value.toFixed(decimals))
  const [whole = '0', fraction] = rounded.toFixed(decimals).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009')
  return fraction === undefined ? grouped : `${grouped}.${fraction}`
}

export const formatArea = (value: number) => `${number(value, 0)} m²`
export const formatVolume = (value: number) => `${number(value, 0)} m³`
export const formatMetres = (value: number) => `${number(value, 1)} m`
export const formatPercent = (ratio: number) => `${number(ratio * 100, 1)} %`
export const formatRatio = (value: number) => number(value, 2)

/** Figure without its unit, for `Figure` (unit set separately). */
export const formatNumber = (value: number, decimals = 0) => number(value, decimals)

/** Short mass code used across the annotation, tiles and drawer: A, B, …, Z, AA, AB. */
export function massLetter(index: number): string {
  const letter = String.fromCharCode(65 + (index % 26))
  return index < 26 ? letter : massLetter(Math.floor(index / 26) - 1) + letter
}
