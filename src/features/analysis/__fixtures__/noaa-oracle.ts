/**
 * Independent sun-position oracle for tests only (fixtures §4: "SunCalc is not its own
 * reference"). Implements the NOAA Global Monitoring Laboratory "General Solar Position
 * Calculations" (the NOAA_Solar_Calculations spreadsheet, after Meeus), with NOAA's
 * atmospheric refraction correction. Nothing in src/ outside tests imports this file.
 *
 * Accuracy: NOAA states ±0.01° from 1800 to 2100 for the position; the refraction model is
 * the usual sea-level standard atmosphere, so values within a few degrees of the horizon
 * differ from other implementations by up to ~0.1°.
 */

const DEG = Math.PI / 180

function sinDeg(degrees: number): number {
  return Math.sin(degrees * DEG)
}
function cosDeg(degrees: number): number {
  return Math.cos(degrees * DEG)
}
function tanDeg(degrees: number): number {
  return Math.tan(degrees * DEG)
}

export type NoaaSun = {
  /** Degrees clockwise from north. */
  azimuthDeg: number
  /** Geometric elevation, degrees. */
  elevationDeg: number
  /** Elevation with NOAA's refraction correction, degrees. */
  apparentElevationDeg: number
  /** Equation of time, minutes. */
  equationOfTimeMin: number
  /** Solar declination, degrees. */
  declinationDeg: number
}

export function noaaSunPosition(instant: Date, latitude: number, longitude: number): NoaaSun {
  const julianDay = instant.getTime() / 86_400_000 + 2_440_587.5
  const jc = (julianDay - 2_451_545) / 36_525

  const meanLongitude = (((280.46646 + jc * (36_000.76983 + jc * 0.0003032)) % 360) + 360) % 360
  const meanAnomaly = 357.52911 + jc * (35_999.05029 - 0.0001537 * jc)
  const eccentricity = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc)
  const centre =
    sinDeg(meanAnomaly) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
    sinDeg(2 * meanAnomaly) * (0.019993 - 0.000101 * jc) +
    sinDeg(3 * meanAnomaly) * 0.000289
  const trueLongitude = meanLongitude + centre
  const omega = 125.04 - 1934.136 * jc
  const apparentLongitude = trueLongitude - 0.00569 - 0.00478 * sinDeg(omega)
  const meanObliquity =
    23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60
  const obliquity = meanObliquity + 0.00256 * cosDeg(omega)
  const declination = Math.asin(sinDeg(obliquity) * sinDeg(apparentLongitude)) / DEG

  const y = Math.tan((obliquity / 2) * DEG) ** 2
  const equationOfTime =
    (4 / DEG) *
    (y * sinDeg(2 * meanLongitude) -
      2 * eccentricity * sinDeg(meanAnomaly) +
      4 * eccentricity * y * sinDeg(meanAnomaly) * cosDeg(2 * meanLongitude) -
      0.5 * y * y * sinDeg(4 * meanLongitude) -
      1.25 * eccentricity * eccentricity * sinDeg(2 * meanAnomaly))

  const utcMinutes =
    instant.getUTCHours() * 60 +
    instant.getUTCMinutes() +
    instant.getUTCSeconds() / 60 +
    instant.getUTCMilliseconds() / 60_000
  const trueSolarTime = (((utcMinutes + equationOfTime + 4 * longitude) % 1440) + 1440) % 1440
  const hourAngle = trueSolarTime / 4 < 0 ? trueSolarTime / 4 + 180 : trueSolarTime / 4 - 180

  const cosZenith =
    sinDeg(latitude) * sinDeg(declination) + cosDeg(latitude) * cosDeg(declination) * cosDeg(hourAngle)
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZenith))) / DEG
  const elevation = 90 - zenith

  let refraction: number
  if (elevation > 85) {
    refraction = 0
  } else if (elevation > 5) {
    const t = tanDeg(elevation)
    refraction = 58.1 / t - 0.07 / t ** 3 + 0.000086 / t ** 5
  } else if (elevation > -0.575) {
    refraction = 1735 + elevation * (-518.2 + elevation * (103.4 + elevation * (-12.79 + elevation * 0.711)))
  } else {
    refraction = -20.772 / tanDeg(elevation)
  }
  refraction /= 3600

  const azimuthCos =
    (sinDeg(latitude) * cosDeg(zenith) - sinDeg(declination)) / (cosDeg(latitude) * sinDeg(zenith))
  const azimuthBase = Math.acos(Math.min(1, Math.max(-1, azimuthCos))) / DEG
  const azimuth = hourAngle > 0 ? (azimuthBase + 180) % 360 : (540 - azimuthBase) % 360

  return {
    azimuthDeg: azimuth,
    elevationDeg: elevation,
    apparentElevationDeg: elevation + refraction,
    equationOfTimeMin: equationOfTime,
    declinationDeg: declination,
  }
}

/** Smallest absolute difference between two bearings in degrees. */
export function bearingDelta(a: number, b: number): number {
  const delta = Math.abs(((a - b) % 360) + 360) % 360
  return Math.min(delta, 360 - delta)
}
