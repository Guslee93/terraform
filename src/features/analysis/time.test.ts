import { describe, expect, it } from 'vitest'
import fixtures from './__fixtures__/dst-oslo.json'
import {
  formatLocalLabel,
  localDayMinuteToInstant,
  minutesOfLocalDay,
  resolveLocalTime,
  toLocalWallClock,
  utcOffsetMinutes,
} from './time'

const OSLO = 'Europe/Oslo'

type GapCase = { local: string; utc_instant: string; displayed_post: string }
type OverlapCase = { local: string; fold: number; utc_instant: string; displayed_local: string }

const split = (local: string): [string, string] => {
  const [date, time] = local.split(' ')
  return [date ?? '', time ?? '']
}

describe('resolveLocalTime (fixtures: dst-oslo.json, tzdata ' + fixtures.tzdata_version + ')', () => {
  const gaps = fixtures.transitions.filter((t) => t.kind === 'gap')
  const overlaps = fixtures.transitions.filter((t) => t.kind === 'overlap')

  it('has both transition kinds for 2026–2028', () => {
    expect(gaps.length).toBeGreaterThanOrEqual(3)
    expect(overlaps.length).toBeGreaterThanOrEqual(3)
  })

  it.each(gaps.flatMap((t) => t.cases as GapCase[]))(
    'maps the spring gap $local with the pre-transition offset to $utc_instant',
    ({ local, utc_instant, displayed_post }) => {
      const [date, time] = split(local)
      const resolved = resolveLocalTime(date, time, OSLO)
      expect(resolved.kind).toBe('gap-shifted')
      expect(resolved.alternateInstant).toBeNull()
      expect(resolved.instant.toISOString()).toBe(utc_instant.replace('Z', '.000Z'))
      expect(formatLocalLabel(resolved.instant, OSLO)).toBe(displayed_post)
    },
  )

  it.each(overlaps.flatMap((t) => t.cases as OverlapCase[]))(
    'resolves the autumn overlap $local fold $fold to $utc_instant',
    ({ local, fold, utc_instant, displayed_local }) => {
      const [date, time] = split(local)
      const resolved = resolveLocalTime(date, time, OSLO, fold === 0 ? 'earlier' : 'later')
      expect(resolved.kind).toBe(fold === 0 ? 'overlap-earlier' : 'overlap-later')
      expect(resolved.instant.toISOString()).toBe(utc_instant.replace('Z', '.000Z'))
      expect(resolved.alternateInstant).not.toBeNull()
      expect(Math.abs(resolved.alternateInstant!.getTime() - resolved.instant.getTime())).toBe(3_600_000)
      expect(formatLocalLabel(resolved.instant, OSLO)).toBe(displayed_local)
    },
  )

  it('defaults an overlap to the earlier (CEST) occurrence', () => {
    const resolved = resolveLocalTime('2026-10-25', '02:30', OSLO)
    expect(resolved.kind).toBe('overlap-earlier')
    expect(resolved.instant.toISOString()).toBe('2026-10-25T00:30:00.000Z')
  })

  it('resolves normal-day controls from the fixture', () => {
    for (const control of fixtures.controls) {
      const [date, time] = split(control.local)
      const resolved = resolveLocalTime(date, time, OSLO)
      expect(resolved.kind).toBe('normal')
      expect(resolved.instant.toISOString()).toBe(control.utc_instant.replace('Z', '.000Z'))
    }
  })

  it('resolves CET and CEST on ordinary days', () => {
    expect(resolveLocalTime('2026-06-21', '15:00', OSLO).instant.toISOString()).toBe('2026-06-21T13:00:00.000Z')
    expect(resolveLocalTime('2026-12-21', '12:00', OSLO).instant.toISOString()).toBe('2026-12-21T11:00:00.000Z')
    expect(resolveLocalTime('2026-12-21', '00:00', OSLO).instant.toISOString()).toBe('2026-12-20T23:00:00.000Z')
    expect(resolveLocalTime('2026-12-21', '23:59', OSLO).instant.toISOString()).toBe('2026-12-21T22:59:00.000Z')
  })

  it('fixtures §4: 01:30Z on 2026-03-29 reads 03:30 local, not 02:30', () => {
    expect(toLocalWallClock(new Date('2026-03-29T01:30:00Z'), OSLO)).toMatchObject({
      date: '2026-03-29',
      time: '03:30',
      offsetMinutes: 120,
    })
  })

  it('works for other IANA zones, including negative and half-hour offsets', () => {
    expect(resolveLocalTime('2026-07-01', '12:00', 'America/New_York').instant.toISOString()).toBe('2026-07-01T16:00:00.000Z')
    expect(resolveLocalTime('2026-07-01', '12:00', 'Asia/Kolkata').instant.toISOString()).toBe('2026-07-01T06:30:00.000Z')
    expect(resolveLocalTime('2026-07-01', '12:00', 'UTC').instant.toISOString()).toBe('2026-07-01T12:00:00.000Z')
  })

  it('rejects malformed and rolled-over inputs', () => {
    expect(() => resolveLocalTime('2026-02-30', '12:00', OSLO)).toThrow()
    expect(() => resolveLocalTime('2026-06-21', '24:00', OSLO)).toThrow()
    expect(() => resolveLocalTime('21/06/2026', '12:00', OSLO)).toThrow()
    expect(() => resolveLocalTime('2026-06-21', '9:00', OSLO)).toThrow()
  })
})

describe('utcOffsetMinutes', () => {
  it('is 60 in winter and 120 in summer for Oslo', () => {
    expect(utcOffsetMinutes(new Date('2026-01-15T12:00:00Z'), OSLO)).toBe(60)
    expect(utcOffsetMinutes(new Date('2026-07-15T12:00:00Z'), OSLO)).toBe(120)
  })

  it('flips exactly at the transition instant', () => {
    expect(utcOffsetMinutes(new Date('2026-03-29T00:59:59Z'), OSLO)).toBe(60)
    expect(utcOffsetMinutes(new Date('2026-03-29T01:00:00Z'), OSLO)).toBe(120)
    expect(utcOffsetMinutes(new Date('2026-10-25T00:59:59Z'), OSLO)).toBe(120)
    expect(utcOffsetMinutes(new Date('2026-10-25T01:00:00Z'), OSLO)).toBe(60)
  })
})

describe('scrubber helpers', () => {
  it('round-trips a minute of the local day', () => {
    const resolved = localDayMinuteToInstant('2026-06-21', 15 * 60 + 7, OSLO)
    expect(minutesOfLocalDay(resolved.instant, OSLO)).toBe(15 * 60 + 7)
  })

  it('clamps the scrubber to 00:00–23:59', () => {
    expect(minutesOfLocalDay(localDayMinuteToInstant('2026-06-21', -5, OSLO).instant, OSLO)).toBe(0)
    expect(minutesOfLocalDay(localDayMinuteToInstant('2026-06-21', 5000, OSLO).instant, OSLO)).toBe(23 * 60 + 59)
  })

  it('a 23-hour spring day has no 02:xx minutes: they display as 03:xx', () => {
    const resolved = localDayMinuteToInstant('2026-03-29', 2 * 60 + 30, OSLO)
    expect(resolved.kind).toBe('gap-shifted')
    expect(minutesOfLocalDay(resolved.instant, OSLO)).toBe(3 * 60 + 30)
  })
})
