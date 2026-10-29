/**
 * Wall-clock ↔ instant conversion for any IANA zone using `Intl` only (FR-060).
 *
 * A local date and time name zero, one or two instants. The spring transition removes an
 * hour (the gap: 02:00–03:00 never happens); the autumn transition repeats one (the overlap:
 * 02:00–03:00 happens twice). Rules follow `src/features/analysis/__fixtures__/dst-oslo.json`:
 * a gap time is mapped with the pre-transition offset (02:30 CET → 01:30Z, shown as 03:30 CEST)
 * and an overlap time resolves to the earlier occurrence unless the caller asks for the later.
 */

export type LocalDate = `${number}-${number}-${number}`
export type LocalTime = `${number}:${number}`

export type LocalWallClock = {
  readonly date: LocalDate
  readonly time: LocalTime
  /** Minutes east of UTC in force at this instant. */
  readonly offsetMinutes: number
  /** Zone abbreviation from Intl, e.g. `CET`, `CEST`; falls back to `GMT+1` style on some ICUs. */
  readonly zoneName: string
}

export type ResolvedLocalTime = {
  readonly instant: Date
  /**
   * `normal`: unique. `gap-shifted`: the wall-clock never occurred; the instant is one offset
   * step later than written. `overlap-earlier` / `overlap-later`: the wall-clock occurred twice.
   */
  readonly kind: 'normal' | 'gap-shifted' | 'overlap-earlier' | 'overlap-later'
  /** The other occurrence during an overlap, otherwise null. */
  readonly alternateInstant: Date | null
}

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string): Intl.DateTimeFormat {
  let cached = formatters.get(timeZone)
  if (!cached) {
    // en-GB yields CET/CEST for Europe/Oslo where en-US yields GMT+1/GMT+2.
    cached = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    })
    formatters.set(timeZone, cached)
  }
  return cached
}

type Parts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  zoneName: string
}

function partsAt(instant: Date, timeZone: string): Parts {
  const parts: Partial<Parts> = {}
  for (const part of formatter(timeZone).formatToParts(instant)) {
    switch (part.type) {
      case 'year':
      case 'month':
      case 'day':
      case 'hour':
      case 'minute':
      case 'second':
        parts[part.type] = Number(part.value)
        break
      case 'timeZoneName':
        parts.zoneName = part.value
        break
      default:
        break
    }
  }
  return {
    year: parts.year ?? 0,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
    second: parts.second ?? 0,
    zoneName: parts.zoneName ?? 'UTC',
  }
}

/** Wall-clock of `instant` read as if it were UTC, in epoch milliseconds. */
function wallClockMs(instant: Date, timeZone: string): number {
  const p = partsAt(instant, timeZone)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
}

/** UTC offset of `timeZone` at `instant`, in minutes east of UTC. */
export function utcOffsetMinutes(instant: Date, timeZone: string): number {
  const truncated = Math.floor(instant.getTime() / 1000) * 1000
  return Math.round((wallClockMs(instant, timeZone) - truncated) / MINUTE_MS)
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^(\d{2}):(\d{2})$/

function parseWallClock(date: string, time: string): number {
  const dateMatch = DATE_PATTERN.exec(date)
  const timeMatch = TIME_PATTERN.exec(time)
  if (!dateMatch || !timeMatch) throw new Error(`Invalid local time ${date} ${time}`)
  const [, year, month, day] = dateMatch
  const [, hour, minute] = timeMatch
  const ms = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  if (!Number.isFinite(ms)) throw new Error(`Invalid local time ${date} ${time}`)
  // Reject 2026-02-30 and 24:00 style inputs that Date.UTC would silently roll over.
  const check = new Date(ms)
  if (
    check.getUTCMonth() !== Number(month) - 1 ||
    check.getUTCDate() !== Number(day) ||
    check.getUTCHours() !== Number(hour) ||
    check.getUTCMinutes() !== Number(minute)
  ) {
    throw new Error(`Invalid local time ${date} ${time}`)
  }
  return ms
}

/**
 * Resolve a local date and time in `timeZone` to an instant. `prefer` picks the occurrence
 * during an overlap; it is ignored otherwise.
 */
export function resolveLocalTime(
  date: string,
  time: string,
  timeZone: string,
  prefer: 'earlier' | 'later' = 'earlier',
): ResolvedLocalTime {
  const wanted = parseWallClock(date, time)

  // Offsets a day either side bracket any single transition; each gives a candidate instant.
  const offsets = new Set<number>()
  for (const probe of [wanted - DAY_MS, wanted, wanted + DAY_MS]) {
    offsets.add(utcOffsetMinutes(new Date(probe), timeZone))
  }
  const valid = [...offsets]
    .map((offset) => wanted - offset * MINUTE_MS)
    .filter((candidate) => wallClockMs(new Date(candidate), timeZone) === wanted)
    .sort((a, b) => a - b)

  const [earlier, later] = valid
  if (earlier !== undefined && later !== undefined) {
    const pick = prefer === 'later' ? later : earlier
    return {
      instant: new Date(pick),
      kind: prefer === 'later' ? 'overlap-later' : 'overlap-earlier',
      alternateInstant: new Date(pick === earlier ? later : earlier),
    }
  }
  if (earlier !== undefined) {
    return { instant: new Date(earlier), kind: 'normal', alternateInstant: null }
  }
  // Gap: no offset reproduces the wall-clock. Use the offset in force before the transition,
  // which is the one at the start of that day.
  const before = utcOffsetMinutes(new Date(wanted - DAY_MS), timeZone)
  return {
    instant: new Date(wanted - before * MINUTE_MS),
    kind: 'gap-shifted',
    alternateInstant: null,
  }
}

const pad = (value: number): string => String(value).padStart(2, '0')

/** Local wall-clock of `instant` in `timeZone`. */
export function toLocalWallClock(instant: Date, timeZone: string): LocalWallClock {
  const p = partsAt(instant, timeZone)
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}` as LocalDate,
    time: `${pad(p.hour)}:${pad(p.minute)}` as LocalTime,
    offsetMinutes: utcOffsetMinutes(instant, timeZone),
    zoneName: p.zoneName,
  }
}

/** `2026-03-29 03:30 CEST` style label for the readout. */
export function formatLocalLabel(instant: Date, timeZone: string): string {
  const local = toLocalWallClock(instant, timeZone)
  return `${local.date} ${local.time} ${local.zoneName}`
}

/** Minutes after local midnight of the wall-clock, for a 00:00–23:59 scrubber. */
export function minutesOfLocalDay(instant: Date, timeZone: string): number {
  const { time } = toLocalWallClock(instant, timeZone)
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

/** Inverse of `minutesOfLocalDay`; the scrubber's instant for a minute of a local date. */
export function localDayMinuteToInstant(
  date: string,
  minuteOfDay: number,
  timeZone: string,
): ResolvedLocalTime {
  const clamped = Math.min(Math.max(Math.round(minuteOfDay), 0), 23 * 60 + 59)
  return resolveLocalTime(date, `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`, timeZone)
}
