import { describe, expect, it } from 'vitest'
import type { EnvelopeResult, VolumeEnvelope } from '../../features/analysis/constraints'
import { CONSTRAINT_DISCLAIMER } from '../../features/analysis/constraints'
import type { ClearanceIssue } from '../../features/massing/clearance'
import { checkValue, summarizeChecks } from './checks'
import { massLetter } from './format'

const volume = (volumeId: string, reasons: VolumeEnvelope['reasons']): VolumeEnvelope => ({
  volumeId, status: reasons.length ? 'exceeds' : 'within', reasons,
  outsideBoundaryRings: [], outsideSetbackRings: [], heightM: 10, referenceElevationM: 0, heightExcessM: 0,
})
const envelope = (perVolume: VolumeEnvelope[]): EnvelopeResult => ({
  status: perVolume.some((entry) => entry.status === 'exceeds') ? 'exceeds' : 'within',
  heightReference: 'grade', setbackPolygon: null, perVolume, disclaimer: CONSTRAINT_DISCLAIMER,
})
const limits = { maxHeightMeters: 18, setbackMeters: 4, label: 'Illustrative design constraint' }

describe('summarizeChecks', () => {
  it('counts each existing per-mass result once per check', () => {
    const clearance = new Map<string, ClearanceIssue[]>([['b', [{ kind: 'floating', message: 'Floats', amount: 1 }]]])
    const rows = summarizeChecks(envelope([volume('a', ['too-tall']), volume('b', ['outside-setback', 'outside-boundary']), volume('c', [])]), clearance, limits)
    expect(rows.map((row) => [row.id, row.failing, row.evaluated])).toEqual([
      ['height', 1, 3], ['setback', 1, 3], ['boundary', 1, 3], ['ground', 1, 3],
    ])
    expect(rows[0]?.label).toBe('Height ≤ 18.0 m above grade')
    expect(checkValue(rows[0]!)).toBe('1 MASS')
    expect(checkValue({ id: 'ground', label: '', failing: 0, evaluated: 3 })).toBe('3 / 3 OK')
  })
  it('returns nothing when there is nothing to evaluate', () => {
    expect(summarizeChecks(null, new Map(), limits)).toEqual([])
    expect(summarizeChecks(envelope([]), new Map(), limits)).toEqual([])
  })
  it('ignores boundary clearance issues, which the envelope already counts', () => {
    const clearance = new Map<string, ClearanceIssue[]>([['a', [{ kind: 'boundary-crossing', message: 'Crosses' }]]])
    expect(summarizeChecks(envelope([volume('a', [])]), clearance, limits).at(-1)?.failing).toBe(0)
  })
})

describe('massLetter', () => {
  it('runs A–Z then AA', () => {
    expect([0, 1, 25, 26, 27].map(massLetter)).toEqual(['A', 'B', 'Z', 'AA', 'AB'])
  })
})
