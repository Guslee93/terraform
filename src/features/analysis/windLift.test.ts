import { describe, expect, it } from 'vitest'
import { liftHeights, readyLiftHeights, windFlowStyle, clampLift, fadedBuildings, footprintTouchesCircle, ghostHeights, heightText, liftAnchor, nearestHeight, stepHeight } from './windLift'

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
  it('shows 2 m and every 5 m among the ready heights while lifted or dragging (ADR-0029)', () => {
    const metres = Array.from({ length: 34 }, (_, i) => i + 2) // 2–35 m
    expect(ghostHeights(metres, 20, false)).toEqual([2, 5, 10, 15, 25, 30, 35])
    expect(ghostHeights(metres.slice(0, 11), 2, true)).toEqual([5, 10]) // ready to 12 m
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

describe('footprint and circle (code review 2026-11-13, finding 7)', () => {
  const centre: [number, number] = [0, 0]
  it('counts a long building crossing the rim with no corner inside', () => {
    // 300 m long, 4 m wide, passing 90 m from the centre of a 100 m circle: both ends outside.
    const bar: [number, number][] = [[-150, 88], [150, 88], [150, 92], [-150, 92]]
    expect(bar.some(([x, y]) => x * x + y * y <= 100 * 100)).toBe(false)
    expect(footprintTouchesCircle(bar, centre, 100)).toBe(true)
    expect(fadedBuildings([{ height: 6, footprint: bar }], { centre, radius: 100 }, 10).has(0)).toBe(true)
  })
  it('counts a footprint that contains the whole circle, and not one that misses it', () => {
    const big: [number, number][] = [[-500, -500], [500, -500], [500, 500], [-500, 500]]
    expect(footprintTouchesCircle(big, centre, 100)).toBe(true)
    expect(footprintTouchesCircle([[200, 200], [210, 200], [210, 210], [200, 210]], centre, 100)).toBe(false)
  })
})

describe('how the moving air is drawn', () => {
  it('is always the particle animation once the map is lifted (owner, 2026-11-13)', () => {
    expect(windFlowStyle({ lifted: true, streamlinesOn: true, reducedMotion: false })).toBe('particles')
    expect(windFlowStyle({ lifted: true, streamlinesOn: false, reducedMotion: true })).toBe('particles')
  })
  it('keeps the 2 m choice: streamlines when on or under reduced motion, otherwise particles', () => {
    expect(windFlowStyle({ lifted: false, streamlinesOn: false, reducedMotion: false })).toBe('particles')
    expect(windFlowStyle({ lifted: false, streamlinesOn: true, reducedMotion: false })).toBe('streamlines')
    expect(windFlowStyle({ lifted: false, streamlinesOn: false, reducedMotion: true })).toBe('streamlines')
  })
})

describe('every metre (ADR-0029)', () => {
  const velocity = new Float32Array(8), solid = new Uint8Array(4)
  const flow = (solved: number, sliceHeights = [2, 8, 13]) => ({
    id: 1, frame: { nx: 2, ny: 2, dx: 1, centre: [0, 0] as [number, number], flow: [1, 0] as [number, number] }, settled: true, velocity, solid,
    sliceHeights, liftTopM: 30, slicesComplete: solved === sliceHeights.length,
    slices: sliceHeights.slice(0, solved).map((z) => ({ z, velocity, solid })),
  })
  it('lifts to every whole metre up to the top', () => {
    expect(liftHeights(flow(3))).toEqual(Array.from({ length: 29 }, (_, i) => i + 2))
    expect(liftHeights(null)).toHaveLength(29) // 2–30 m before a flow reports its top
  })
  it('is ready up to the first unsolved roof height, from bottom to top', () => {
    expect(readyLiftHeights(flow(1))).toEqual([2, 3, 4, 5, 6, 7]) // the ground solve covers up to the 8 m roof
    expect(readyLiftHeights(flow(2)).at(-1)).toBe(12)
    expect(readyLiftHeights(flow(3)).at(-1)).toBe(30)
    expect(readyLiftHeights(null)).toEqual([2])
  })
})
