/**
 * WGS84 latitude/longitude to ETRS89 / UTM zone 33N (EPSG:25833), Krüger series to n³. Used only to
 * address services that take UTM33 coordinates (NVE's grid time series); nothing in the app is
 * placed with it. Accurate to well under a millimetre inside the zone's neighbourhood.
 */
export function toUtm33(latitude: number, longitude: number): [east: number, north: number] {
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9996, lon0 = (15 * Math.PI) / 180
  const n = f / (2 - f)
  const A = (a / (1 + n)) * (1 + n ** 2 / 4 + n ** 4 / 64)
  const alpha = [n / 2 - (2 * n ** 2) / 3 + (5 * n ** 3) / 16, (13 * n ** 2) / 48 - (3 * n ** 3) / 5, (61 * n ** 3) / 240]
  const phi = (latitude * Math.PI) / 180, lambda = (longitude * Math.PI) / 180 - lon0
  const e = Math.sqrt(f * (2 - f))
  const t = Math.sinh(Math.atanh(Math.sin(phi)) - e * Math.atanh(e * Math.sin(phi)))
  const xi = Math.atan2(t, Math.cos(lambda))
  const eta = Math.atanh(Math.sin(lambda) / Math.sqrt(1 + t * t))
  let north = xi, east = eta
  alpha.forEach((coefficient, index) => {
    const j = 2 * (index + 1)
    north += coefficient * Math.sin(j * xi) * Math.cosh(j * eta)
    east += coefficient * Math.cos(j * xi) * Math.sinh(j * eta)
  })
  return [500000 + k0 * A * east, k0 * A * north]
}
