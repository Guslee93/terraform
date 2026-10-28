/** Exact local tangent-plane formula/argument order from build_site_packages.py. */
export function metresPerDegree(latitude: number): [number, number] {
  const phi = latitude * Math.PI / 180
  return [
    111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi),
    111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi) + 0.118 * Math.cos(5 * phi),
  ]
}
export function project(lat: number, lon: number, originLat: number, originLon: number): [number, number] {
  const [latM, lonM] = metresPerDegree(originLat)
  return [(lon - originLon) * lonM, (lat - originLat) * latM]
}
/** Returns [latitude, longitude], matching the Python builder (not GeoJSON order). */
export function unproject(x: number, y: number, lat: number, lon: number): [number, number] {
  const [latM, lonM] = metresPerDegree(lat)
  return [lat + y / latM, lon + x / lonM]
}
