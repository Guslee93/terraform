import { describe, expect, it } from 'vitest'
import { clampLift, fadedBuildings, ghostHeights, heightText, liftAnchor, nearestHeight, stepHeight } from './windLift'

const HEIGHTS = [2, 5, 10, 15, 20, 25, 30]

describe('snapping to solved heights', () => {
  it('rests on the nearest solved height, ties going down', () => {
    expect(nearestHeight(11, HEIGHTS)).toBe(10)
    expect(nearestHeight(12.5, HEIGHTS)).toBe(10)
    expect(nearestHeight(13, HEIGHTS)).toBe(15)
    expect(nearestHeight(-4, HEIGHTS)).toBe(2)
    expect(nearestHeight(80, HEIGHTS)).toBe(30)
    // Only the heights solved so far count: 20 m is not ready yet.
    expect(nearestHeight(19, [2, 5, 10])).toBe(10)
    expect(nearestHeight(7, [])).toBe(2)
  })
  it('keeps a drag between the lowest and highest solved height', () => {
    expect(clampLift(-10, HEIGHTS)).toBe(2)
    expect(clampLift(17.3, HEIGHTS)).toBe(17.3)
    expect(clampLift(99, HEIGHTS)).toBe(30)
    expect(clampLift(99, [2, 5])).toBe(5)
  })
  it('steps one solved height at a time and stops at the ends', () => {
    expect(stepHeight(10, HEIGHTS, 1)).toBe(15)
    expect(stepHeight(10, HEIGHTS, -1)).toBe(5)
    expect(stepHeight(30, HEIGHTS, 1)).toBe(30)
    expect(stepHeight(2, HEIGHTS, -1)).toBe(2)
    expect(stepHeight(5, [2, 5, 10, 40], 1)).toBe(10)
  })
  it('speaks a stop as metres above terrain', () => {
    expect(heightText(20)).toBe('20 metres above terrain')
  })
})

describe('the handle', () => {
  it('sits on the edge nearest the viewer', () => {
    expect(liftAnchor([0, 0], 100, [0, -500])).toEqual([0, -100])
    const [x, y] = liftAnchor([10, 10], 50, [110, 110])
    expect(Math.hypot(x - 10, y - 10)).toBeCloseTo(50, 9)
    expect(x).toBeCloseTo(y, 9)
  })
  it('falls back to the south edge when the viewer is straight above', () => {
    expect(liftAnchor([5, 5], 60, [5, 5])).toEqual([5, -55])
  })
})

describe('dashed rings at the other heights', () => {
  it('shows none while the disc rests at 2 m', () => {
    expect(ghostHeights(HEIGHTS, 2, false)).toEqual([])
  })
  it('shows every other solved height while lifted or dragging', () => {
    expect(ghostHeights(HEIGHTS, 20, false)).toEqual([2, 5, 10, 15, 25, 30])
    expect(ghostHeights([2, 5, 10], 2, true)).toEqual([5, 10])
  })
})

describe('buildings that fade below the disc', () => {
  const square = (x: number, y: number, s = 4): [number, number][] => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]]
  const buildings = [
    { height: 8, footprint: square(0, 0) }, //   inside, low → fades at 10 m
    { height: 12, footprint: square(10, 0) }, // inside, taller than 10 m → stays
    { height: 6, footprint: square(200, 0) }, // low but outside the circle → stays
    { height: 10, footprint: square(98, 0) }, // straddles the edge, exactly 10 m → fades
  ]
  const circle = { centre: [0, 0] as [number, number], radius: 100 }
  it('fades buildings in the circle no taller than the slice', () => {
    expect([...fadedBuildings(buildings, circle, 10)]).toEqual([0, 3])
    expect([...fadedBuildings(buildings, circle, 15)]).toEqual([0, 1, 3])
  })
  it('fades nothing at pedestrian height', () => {
    expect(fadedBuildings(buildings, circle, 2).size).toBe(0)
  })
})
