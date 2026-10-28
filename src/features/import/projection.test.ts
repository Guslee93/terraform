import { expect, it } from 'vitest'
import { metresPerDegree, project, unproject } from './projection'

// Recorded from scripts/build_site_packages.py using Python3, not the JS port.
it.each([
  { args: [59.924, 10.76, 59.9225, 10.7595], result: [27.965218442609647, 167.11638663076596] },
  { args: [59.905, 10.75, 59.9075, 10.753], result: [-167.86702448328674, -278.52667268611157] },
  { args: [59.317, 18.069, 59.316, 18.071], result: [-113.89555007768013, 111.40054034265255] },
])('matches the Python projection within 1e-9 m: $args', ({ args, result }) => {
  const [lat, lon, originLat, originLon] = args
  const actual = project(lat!, lon!, originLat!, originLon!)
  actual.forEach((value, i) => expect(Math.abs(value - result[i]!)).toBeLessThanOrEqual(1e-9))
  expect(unproject(actual[0], actual[1], originLat!, originLon!)).toEqual([lat, lon])
})
it('returns latitude metres then longitude metres', () => {
  expect(metresPerDegree(60)[0]).toBeGreaterThan(111000)
  expect(metresPerDegree(60)[1]).toBeGreaterThan(55000)
  expect(project(60, 10, 60, 10)).toEqual([0, 0])
})
