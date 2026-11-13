// @vitest-environment node
import { expect, it } from 'vitest'
import { parseOsmXml } from './osm'
import { grunerlokka } from './testFixtures'
import { parseOsmWater, stitchRings, waterAreas } from './water'
import { readFileSync } from 'node:fs'

const xml = readFileSync(new URL('./__fixtures__/osm/frame.xml', import.meta.url), 'utf8')
const data = parseOsmXml(xml)

/** The area of a ring in local metres. */
function areaOf(ring: readonly (readonly [number, number])[]): number {
  let sum = 0
  for (let index = 0; index < ring.length; index += 1) {
    const a = ring[index]!
    const b = ring[(index + 1) % ring.length]!
    sum += a[0] * b[1] - b[0] * a[1]
  }
  return Math.abs(sum) / 2
}

it('reads a closed water surface, a centre line and a canal from the answer', () => {
  const geometry = parseOsmWater(data)
  const areas = geometry.filter((item) => item.kind === 'area')
  const lines = geometry.filter((item) => item.kind === 'line')
  expect(areas.map((item) => item.id)).toEqual(['way/100', 'relation/200'])
  expect(lines.map((item) => item.id)).toEqual(['way/101', 'way/106'])
  const canal = lines.find((item) => item.id === 'way/106')
  expect(canal && canal.kind === 'line' ? canal.width : 0).toBe(4.5)
  const river = lines.find((item) => item.id === 'way/101')
  expect(river && river.kind === 'line' ? river.width : 0).toBe(10)
})

it('ignores the buildings of the answer', () => {
  expect(parseOsmWater(data).some((item) => item.id.includes('105'))).toBe(false)
})

it('stitches the member ways of a relation into one ring', () => {
  expect(stitchRings([[[0, 0], [1, 0], [1, 1]], [[1, 1], [0, 1], [0, 0]]])).toEqual([[[0, 0], [1, 0], [1, 1], [0, 1]]])
  expect(stitchRings([[[0, 0], [1, 0]]])).toEqual([])
})

it('draws the mapped water in local metres, clipped to the frame', () => {
  const areas = waterAreas(parseOsmWater(data), grunerlokka)
  const river = areas.find((area) => area.id === 'way/100')!
  expect(river.kind).toBe('water')
  const xs = river.ring.map((point) => point[0]), ys = river.ring.map((point) => point[1])
  // The fixture's river is 120 m wide and runs north to south through the middle.
  expect(Math.min(...xs)).toBeCloseTo(-60, 0)
  expect(Math.max(...xs)).toBeCloseTo(60, 0)
  expect(Math.min(...ys)).toBeCloseTo(-100, 0)
  expect(Math.max(...ys)).toBeCloseTo(100, 0)
  expect(areaOf(river.ring)).toBeCloseTo(120 * 200, -2)
})

it('does not draw the centre line of a river that already has an area', () => {
  const areas = waterAreas(parseOsmWater(data), grunerlokka)
  expect(areas.some((area) => area.id === 'way/101')).toBe(false)
  // The canal has no area of its own, so it is drawn as a ribbon of its mapped width.
  const canal = areas.find((area) => area.id === 'way/106')!
  expect(canal).toBeDefined()
  expect(areaOf(canal.ring)).toBeGreaterThan(50)
  expect(areaOf(canal.ring)).toBeLessThan(200)
})

it('draws the lake of a relation as one ring', () => {
  const lake = waterAreas(parseOsmWater(data), grunerlokka).find((area) => area.id === 'relation/200')!
  expect(areaOf(lake.ring)).toBeCloseTo(60 * 60, -1)
})
