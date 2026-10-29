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
