import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { flowFrame, worldToGrid, type FlowFrame } from './lbm'
import type { FootprintBuilding } from './grid'
import {
  COMFORT_CRITERION,
  COMFORT_DISCLAIMER,
  DOWNWASH_MAX_BOOST,
  LAWSON_NORCONSULT,
  SAFETY,
  comfortFields,
  downwashBoost,
  downwashQualifies,
  exceedanceProbability,
  lawsonClass,
  localSpeed,
  localSpeedField,
} from './comfort'

const square = (x0: number, x1: number, y0: number, y1: number): Vec2[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
]

/** Value of a cell field at a world point. */
function at(frame: FlowFrame, field: Float32Array, p: Vec2): number {
  const [gx, gy] = worldToGrid(frame, p)
  return field[Math.floor(gy) * frame.nx + Math.floor(gx)]!
}

describe('criterion constants', () => {
  it('names the Lawson (Norconsult variant) thresholds, classes and safety limits', () => {
    expect(LAWSON_NORCONSULT.thresholds).toEqual([2, 4, 6, 8, 10])
    expect(LAWSON_NORCONSULT.classes).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(LAWSON_NORCONSULT.activities).toEqual(['sit', 'stand', 'stroll', 'walk', 'uncomfortable'])
    expect(LAWSON_NORCONSULT.exceedance).toBe(0.05)
    expect(SAFETY.thresholds).toEqual([15, 20])
    expect(SAFETY.unsafeExceedance).toBe(0.0003)
  })

  it('carries the criterion name and the disclaimer for the legend', () => {
    expect(COMFORT_CRITERION).toContain('Lawson')
    expect(COMFORT_CRITERION).toContain('Norconsult')
    expect(COMFORT_DISCLAIMER).toContain('not engineering')
  })
})

describe('local speed', () => {
  it('scales the 10 m reference wind speed by the local speed ratio', () => {
    expect(localSpeed(1.2, 5)).toBeCloseTo(6, 10)
    expect(localSpeed(0.4, 5)).toBeCloseTo(2, 10)
    expect(localSpeed(1, 7.5)).toBeCloseTo(7.5, 10)
  })

  it('scales every cell of a ratio field', () => {
    const field = localSpeedField(new Float32Array([0.5, 1, 1.5]), 4)
    expect(field[0]).toBeCloseTo(2, 6)
    expect(field[1]).toBeCloseTo(4, 6)
    expect(field[2]).toBeCloseTo(6, 6)
  })
})

describe('exceedance probability', () => {
  it('matches the Weibull formula for a single sector', () => {
    // P(> t) = exp(-(t / (ratio * c))^k) → t = 5, ratio = 1, c = 5, k = 2 → e^-1
    const rose = [{ fromDeg: 270, frequency: 1, weibullK: 2, weibullC: 5 }]
    const probability = exceedanceProbability([{ fromDeg: 270, ratio: new Float32Array([1, 2]) }], rose, 5)
    expect(probability[0]).toBeCloseTo(Math.exp(-1), 6)
    expect(probability[1]).toBeCloseTo(Math.exp(-0.25), 6)
  })

  it('weights the sectors by their frequency', () => {
    const rose = [
      { fromDeg: 0, frequency: 0.25, weibullK: 2, weibullC: 5 },
      { fromDeg: 90, frequency: 0.75, weibullK: 2, weibullC: 5 },
    ]
    const probability = exceedanceProbability(
      [
        { fromDeg: 0, ratio: new Float32Array([1]) },
        { fromDeg: 90, ratio: new Float32Array([2]) },
      ],
      rose,
      5,
    )
    expect(probability[0]).toBeCloseTo(0.25 * Math.exp(-1) + 0.75 * Math.exp(-0.25), 6)
  })

  it('ignores a sector with no wind at the cell', () => {
    const rose = [{ fromDeg: 270, frequency: 1, weibullK: 2, weibullC: 5 }]
    const probability = exceedanceProbability([{ fromDeg: 270, ratio: new Float32Array([0]) }], rose, 5)
    expect(probability[0]).toBe(0)
  })

  it('rejects a rose whose frequencies do not sum to one', () => {
    const rose = [{ fromDeg: 0, frequency: 0.5, weibullK: 2, weibullC: 5 }]
    expect(() => exceedanceProbability([], rose, 5)).toThrow(/frequencies sum/)
  })

  it('rejects a rose sector without a speed-ratio field', () => {
    const rose = [{ fromDeg: 0, frequency: 1, weibullK: 2, weibullC: 5 }]
    expect(() => exceedanceProbability([{ fromDeg: 90, ratio: new Float32Array([1]) }], rose, 5)).toThrow(
      /no speed-ratio field/,
    )
  })
})

describe('comfort classes', () => {
  it('takes the lowest class whose threshold is exceeded at most 5 % of the time', () => {
    // k = 2, c = 2, ratio = 1 → P(>2) = e^-1 = 0.368 (A fails), P(>4) = e^-4 = 0.018 (B holds)
    const rose = [{ fromDeg: 270, frequency: 1, weibullK: 2, weibullC: 2 }]
    const fields = comfortFields([{ fromDeg: 270, ratio: new Float32Array([1]) }], rose)
    expect(fields.byThreshold[0]![0]!).toBeCloseTo(Math.exp(-1), 6)
    expect(fields.byThreshold[1]![0]!).toBeCloseTo(Math.exp(-4), 6)
    expect(lawsonClass(fields)).toEqual(['B'])
  })

  it('holds class A when 2 m/s is exceeded for less than 5 % of the time', () => {
    // c = 2 / sqrt(3) → P(>2) = e^-3 = 0.0498
    const rose = [{ fromDeg: 270, frequency: 1, weibullK: 2, weibullC: 2 / Math.sqrt(3) }]
    const fields = comfortFields([{ fromDeg: 270, ratio: new Float32Array([1]) }], rose)
    expect(fields.byThreshold[0]![0]!).toBeCloseTo(Math.exp(-3), 6)
    expect(lawsonClass(fields)).toEqual(['A'])
  })

  it('steps through the class boundaries at exactly 5 % exceedance', () => {
    const one = (v: number) => new Float32Array([v])
    const classify = (byThreshold: number[]) =>
      lawsonClass({ byThreshold: byThreshold.map(one), aboveSafety: one(0) })
    expect(classify([0.05, 0.05, 0.05, 0.05, 0.05])).toEqual(['A'])
    expect(classify([0.0501, 0.05, 0.05, 0.05, 0.05])).toEqual(['B'])
    expect(classify([0.0501, 0.0501, 0.05, 0.05, 0.05])).toEqual(['C'])
    expect(classify([0.0501, 0.0501, 0.0501, 0.05, 0.05])).toEqual(['D'])
    expect(classify([0.0501, 0.0501, 0.0501, 0.0501, 0.05])).toEqual(['E'])
    expect(classify([0.9, 0.9, 0.9, 0.9, 0.9])).toEqual(['E'])
  })

  it('flags a cell unsafe above the safety exceedance but not at the limit', () => {
    const one = (v: number) => new Float32Array([v])
    const classify = (aboveSafety: number) =>
      lawsonClass({ byThreshold: [0.05, 0.05, 0.05, 0.05, 0.05].map(one), aboveSafety: one(aboveSafety) })
    expect(classify(0.0002)).toEqual(['A'])
    expect(classify(0.0003)).toEqual(['A'])
    expect(classify(0.0004)).toEqual(['unsafe'])
  })

  it('flags unsafe from the rose when 15 m/s is exceeded too often', () => {
    // k = 1, c = 10, ratio = 1 → P(>15) = e^-1.5 = 0.223, far above 0.0003
    const rose = [{ fromDeg: 270, frequency: 1, weibullK: 1, weibullC: 10 }]
    const fields = comfortFields([{ fromDeg: 270, ratio: new Float32Array([1]) }], rose)
    expect(fields.aboveSafety[0]!).toBeCloseTo(Math.exp(-1.5), 6)
    expect(lawsonClass(fields)).toEqual(['unsafe'])
  })
})

describe('downwash rule', () => {
  // Wind from the west, blowing east: the upwind side of a building is its west face.
  const frame = flowFrame(square(-100, 100, -100, 100), 270, 96, 64)
  const tower: FootprintBuilding = { height: 40, footprint: square(-10, 10, -10, 10) }
  const lowNorth: FootprintBuilding = { height: 10, footprint: square(-10, 10, 20, 30) }
  const lowSouth: FootprintBuilding = { height: 10, footprint: square(-10, 10, -30, -20) }

  it('qualifies a tower among low blocks, but not the low blocks themselves', () => {
    const blocks = [tower, lowNorth, lowSouth]
    expect(downwashQualifies(tower, blocks)).toBe(true)
    expect(downwashQualifies(lowNorth, blocks)).toBe(false)
    expect(downwashQualifies(lowSouth, blocks)).toBe(false)
  })

  it('does not qualify a lone low block', () => {
    const lone: FootprintBuilding = { height: 10, footprint: square(-10, 10, -10, 10) }
    expect(downwashQualifies(lone, [lone])).toBe(false)
  })

  it('boosts a ring in front of the tower and leaves the lee untouched', () => {
    const field = downwashBoost([tower, lowNorth, lowSouth], frame)
    expect(at(frame, field, [-12, 0])).toBeGreaterThan(1) // upwind face
    expect(at(frame, field, [-12, 0])).toBeGreaterThan(1.25)
    expect(at(frame, field, [-11, 11])).toBeGreaterThan(1.2) // upwind corner
    expect(at(frame, field, [12, 0])).toBe(1) // lee
  })

  it('falls off with the ring width of half the building height', () => {
    const field = downwashBoost([tower, lowNorth, lowSouth], frame)
    expect(at(frame, field, [-24, 0])).toBeGreaterThan(1) // still inside the 20 m ring
    expect(at(frame, field, [-31, 0])).toBe(1) // outside the 20 m ring
  })

  it('never boosts more than 1.3', () => {
    const field = downwashBoost([tower, lowNorth, lowSouth], frame)
    let max = 0
    for (const value of field) if (value > max) max = value
    expect(max).toBeGreaterThan(1.25)
    expect(max).toBeLessThanOrEqual(DOWNWASH_MAX_BOOST)
  })

  it('leaves a lone low block completely unboosted', () => {
    const lone: FootprintBuilding = { height: 10, footprint: square(-10, 10, -10, 10) }
    const field = downwashBoost([lone], frame)
    for (const value of field) expect(value).toBe(1)
  })
})
