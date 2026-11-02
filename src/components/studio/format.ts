/** Stable display units, with thin-space grouping and no rounded negative zero. */
function number(value: number, decimals: number): string {
  const rounded = Number(value.toFixed(decimals))
  const [whole = '0', fraction] = rounded.toFixed(decimals).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009')
  return fraction === undefined ? grouped : `${grouped}.${fraction}`
}

export const formatArea = (value: number) => `${number(value, 0)} m²`
export const formatMetres = (value: number) => `${number(value, 1)} m`

/** Figure without its unit, for `Figure` (unit set separately). */
export const formatNumber = (value: number, decimals = 0) => number(value, decimals)
