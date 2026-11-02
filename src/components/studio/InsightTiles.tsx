import { useMemo } from 'react'
import { DATE_PRESETS, sunDirection, type SunState } from '../../features/analysis/sun'
import { localDayMinuteToInstant } from '../../features/analysis/time'
import type { SiteManifest } from '../../features/sites/manifest'
import { cn } from '../../lib/cn'
import { Card, CardHeader } from '../ui/Card'
import { CheckRow, Figure } from '../ui/Metric'
import { checkValue, type CheckSummary } from './checks'
import { CheckSummaryBar } from './ConstraintsPanel'
import { formatNumber } from './format'
import { shortDate } from './SunPanel'

/** One proposal mass as the tiles see it; every number comes from the scenario metrics/envelope. */
export type TileMass = {
  readonly id: string
  readonly letter: string
  readonly name: string
  readonly gfaM2: number
  readonly floors: number
  /** Height above the envelope reference (grade or datum), metres. */
  readonly heightM: number
}

const NOT_AVAILABLE = 'Not available for this site'

function Unavailable({ text = NOT_AVAILABLE }: { text?: string }) {
  return (
    <div className="mt-auto">
      <p className="text-figure-l text-ink-secondary">—</p>
      <p className="mt-2 text-label text-ink-secondary">{text}</p>
    </div>
  )
}

/** Selection drives colour: accent for the selected mass, ink for the next, grey for the rest. */
export function seriesColours(masses: readonly TileMass[], selectedId: string | null): Map<string, string> {
  const colours = new Map<string, string>()
  let rank = 0
  for (const mass of masses) {
    if (mass.id === selectedId) colours.set(mass.id, 'var(--accent)')
    else colours.set(mass.id, rank++ === 0 ? 'var(--series-2)' : 'var(--series-3)')
  }
  return colours
}

/** Tile 03 (spec §7.7.1). Up to four columns; beyond that the top three and "Other". */
export function GrossAreaTile({ masses, selectedId }: { masses: readonly TileMass[]; selectedId: string | null }) {
  const colours = seriesColours(masses, selectedId)
  const columns = useMemo(() => {
    if (masses.length <= 4) return masses.map((mass) => ({ key: mass.id, label: mass.letter, name: mass.name, value: mass.gfaM2, colour: colours.get(mass.id) ?? 'var(--series-3)' }))
    const sorted = [...masses].sort((a, b) => b.gfaM2 - a.gfaM2)
    const top = sorted.slice(0, 3)
    const rest = sorted.slice(3)
    return [
      ...top.map((mass) => ({ key: mass.id, label: mass.letter, name: mass.name, value: mass.gfaM2, colour: colours.get(mass.id) ?? 'var(--series-3)' })),
      { key: 'other', label: 'Other', name: `${rest.length} other masses`, value: rest.reduce((sum, mass) => sum + mass.gfaM2, 0), colour: rest.some((mass) => mass.id === selectedId) ? 'var(--accent)' : 'var(--series-3)' },
    ]
  }, [masses, selectedId, colours])
  const max = Math.max(...columns.map((column) => column.value), 0)

  return (
    <Card aria-labelledby="gross-area-heading" className="flex h-full flex-col px-[22px] pt-5">
      <CardHeader id="gross-area-heading" code="03" title="Gross area" icon="area" meta="Concept GFA" />
      {columns.length === 0 ? (
        <div className="pb-5"><Unavailable text="No masses yet" /></div>
      ) : (
        <ul aria-label="Concept GFA by mass" className="mt-4 flex flex-1 divide-x divide-line">
          {columns.map((column) => (
            <li key={column.key} className="flex min-w-0 flex-1 flex-col px-2 first:pl-0 last:pr-0">
              <p aria-hidden="true" className="truncate text-figure-s text-ink">{formatNumber(column.value)}</p>
              <p aria-hidden="true" className="mt-1 text-label text-ink-secondary">{column.label}</p>
              <span className="sr-only">{column.name}, {formatNumber(column.value)} square metres</span>
              <span
                aria-hidden="true"
                className="mt-auto block w-full transition-[height] duration-300"
                style={{
                  height: max > 0 ? (196 * column.value) / max : 0,
                  backgroundImage: `repeating-linear-gradient(90deg, ${column.colour} 0 1.5px, transparent 1.5px 5px)`,
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

const PATH = { size: 260, c: 130, r: 88 }

function project(elevationDeg: number, azimuthDeg: number): [number, number] {
  const radius = PATH.r * (1 - elevationDeg / 90)
  const azimuth = (azimuthDeg * Math.PI) / 180
  return [PATH.c + radius * Math.sin(azimuth), PATH.c - radius * Math.cos(azimuth)]
}

/** Above-horizon sun positions every 6 minutes of a local date, as SVG path data. */
export function sunPathData(date: string, latitude: number, longitude: number, timeZone: string): { d: string; hours: Array<[number, number]> } {
  let d = ''
  let drawing = false
  const hours: Array<[number, number]> = []
  for (let minute = 0; minute <= 1440; minute += 6) {
    const { instant } = localDayMinuteToInstant(date, Math.min(minute, 1439), timeZone)
    const { azimuthDeg, elevationDeg } = sunDirection(instant, latitude, longitude)
    if (elevationDeg < 0) { drawing = false; continue }
    const [x, y] = project(elevationDeg, azimuthDeg)
    d += `${drawing ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    drawing = true
    if (minute % 60 === 0) hours.push([x, y])
  }
  return { d, hours }
}

const JUNE = DATE_PRESETS.find((preset) => preset.id === 'summer-solstice')?.date ?? '2026-06-21'
const EQUINOX = DATE_PRESETS.find((preset) => preset.id === 'spring-equinox')?.date ?? '2026-03-20'
const DECEMBER = DATE_PRESETS.find((preset) => preset.id === 'winter-solstice')?.date ?? '2026-12-21'

/** Tile 05 (spec §7.7.3): stereographic-style sun path, north up, azimuth clockwise. */
export function SunPathTile({ date, state, location }: { date: string; state: SunState; location: SiteManifest['location'] }) {
  const { latitude, longitude, timeZone } = location
  const paths = useMemo(() => ({
    june: sunPathData(JUNE, latitude, longitude, timeZone),
    equinox: sunPathData(EQUINOX, latitude, longitude, timeZone),
    december: sunPathData(DECEMBER, latitude, longitude, timeZone),
  }), [latitude, longitude, timeZone])
  const selected = useMemo(() => sunPathData(date, latitude, longitude, timeZone), [date, latitude, longitude, timeZone])
  const sun = state.belowHorizon ? null : project(state.elevationDeg, state.azimuthDeg)
  const { c, r } = PATH
  const label = `Sun path for ${shortDate(date)} at latitude ${Math.abs(latitude).toFixed(1)}° ${latitude >= 0 ? 'north' : 'south'}; ${
    state.belowHorizon ? 'sun below the horizon now' : `sun now at azimuth ${Math.round(state.azimuthDeg)}°, altitude ${Math.round(state.elevationDeg)}°`}`

  return (
    <Card aria-labelledby="sun-path-heading" className="flex h-full flex-col px-[22px] pb-5 pt-5">
      <CardHeader id="sun-path-heading" code="05" title="Sun path" icon="compass" iconClassName="text-sun-high" meta={`${Math.abs(latitude).toFixed(1)}° ${latitude >= 0 ? 'N' : 'S'}`} />
      <svg role="img" aria-label={label} viewBox={`0 0 ${PATH.size} ${PATH.size}`} className="mx-auto mt-1 block min-h-0 w-full max-w-[260px] flex-1">
        {Array.from({ length: 72 }, (_, index) => (
          <line key={index} x1={c} y1={c - r - 8} x2={c} y2={c - r - 14} stroke="var(--ink-primary)" strokeOpacity={0.45} strokeWidth={0.6} transform={`rotate(${index * 5} ${c} ${c})`} />
        ))}
        {[30, 60].map((altitude) => (
          <g key={altitude}>
            <circle cx={c} cy={c} r={r * (1 - altitude / 90)} fill="none" stroke="var(--border)" strokeWidth={0.8} />
            <text x={c + 3} y={c - r * (1 - altitude / 90) - 2} fontFamily="var(--typeface-mono)" fontSize={8.5} fill="var(--ink-secondary)">{altitude}°</text>
          </g>
        ))}
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--ink-primary)" strokeWidth={0.8} />
        <path d={`M${c} ${c - r}V${c + r}M${c - r} ${c}H${c + r}`} stroke="var(--border)" strokeWidth={0.8} />
        {([['N', 0], ['E', 90], ['S', 180], ['W', 270]] as const).map(([letter, azimuth]) => {
          const angle = (azimuth * Math.PI) / 180
          return <text key={letter} x={c + (r + 27) * Math.sin(angle)} y={c - (r + 27) * Math.cos(angle) + 4} textAnchor="middle" fontFamily="var(--typeface-sans)" fontSize={11} fontWeight={500} fill="var(--ink-primary)">{letter}</text>
        })}
        <path d={`${paths.june.d}Z`} fill="var(--sun-glow)" fillOpacity={0.18} stroke="none" />
        <path d={paths.december.d} fill="none" stroke="var(--sun-winter)" strokeWidth={1.2} strokeDasharray="1 3" strokeLinecap="round" />
        <path d={paths.equinox.d} fill="none" stroke="var(--sun-mid)" strokeWidth={1} strokeDasharray="4 3" />
        <path d={selected.d} fill="none" stroke="var(--sun-high)" strokeWidth={1.8} strokeLinejoin="round" />
        {selected.hours.map(([x, y], index) => <circle key={index} cx={x} cy={y} r={1.8} fill="var(--sun-high)" />)}
        {sun && (
          <g>
            <line x1={c} y1={c} x2={sun[0]} y2={sun[1]} stroke="var(--sun-high)" strokeWidth={0.8} strokeDasharray="2 2" />
            <circle cx={sun[0]} cy={sun[1]} r={14} fill="var(--sun-glow)" fillOpacity={0.35} />
            <circle cx={sun[0]} cy={sun[1]} r={9} fill="none" stroke="var(--sun-mid)" strokeWidth={1.2} className="tf-ping [transform-box:fill-box] [transform-origin:center]" />
            <circle cx={sun[0]} cy={sun[1]} r={6} fill="var(--sun-dot)" stroke="var(--sun-high)" strokeWidth={1.2} />
          </g>
        )}
      </svg>
      <p aria-hidden="true" className="mt-2 flex flex-wrap justify-center gap-x-4 text-label text-ink-secondary">
        <span className="inline-flex items-center gap-1.5"><span className="w-3.5 border-t-[1.5px] border-sun-high" />{shortDate(date)}</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3.5 border-t border-dashed border-sun-mid" />Mar/Sep</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3.5 border-t-[1.5px] border-dotted border-sun-winter" />Dec</span>
      </p>
    </Card>
  )
}

/** Tile 06 (spec §7.7.4): tallest height, floor stack and a ruler against the height limit. */
export function HeightTile({ masses, selectedId, limitM, reference }: {
  masses: readonly TileMass[]
  selectedId: string | null
  limitM: number | null
  reference: string
}) {
  const colours = seriesColours(masses, selectedId)
  const tallest = masses.reduce((max, mass) => Math.max(max, mass.heightM), 0)
  const top = Math.max(limitM === null ? 0 : Math.ceil(limitM / 5) * 5 + 5, Math.ceil(tallest / 5) * 5 + 5, 10)
  const minor = top > 60 ? 5 : 1
  const maxFloors = Math.max(...masses.map((mass) => mass.floors), 1)
  const bar = Math.min(14, Math.max(2, 120 / maxFloors - 3))
  const marks = [
    ...(limitM === null ? [] : [{ key: 'limit', label: `Lim ${formatNumber(limitM, 0)}`, at: limitM, className: 'text-warning-ink' }]),
    ...masses.slice(0, 4).map((mass) => ({ key: mass.id, label: `${mass.letter} ${formatNumber(mass.heightM, 0)}`, at: mass.heightM, className: mass.id === selectedId ? 'text-accent' : 'text-ink' })),
  ]

  return (
    <Card aria-labelledby="height-heading" className="grid h-full grid-cols-[1fr_96px]">
      <div className="flex min-w-0 flex-col pb-5 pl-[22px] pr-3 pt-5">
        <CardHeader id="height-heading" code="06" title="Height" icon="height" />
        {masses.length === 0 ? <Unavailable text="No masses yet" /> : (
          <>
            <p className="mt-4 text-figure-l text-ink"><Figure value={formatNumber(tallest, 1)} unit="m" /></p>
            <p className="mt-2 text-label text-ink-secondary">Tallest block · above {reference}</p>
            <div aria-label="Floors per mass" role="img" className="mt-auto flex items-end gap-2">
              {masses.slice(0, 4).map((mass) => (
                <div key={mass.id} className="flex min-w-0 flex-col items-stretch" style={{ flex: mass.floors }}>
                  <div className="flex flex-col-reverse gap-[3px]">
                    {Array.from({ length: mass.floors }, (_, floor) => (
                      <span key={floor} className="block w-full" style={{ height: bar, background: colours.get(mass.id) }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 flex flex-wrap gap-x-3 text-label text-ink-secondary">
              {masses.slice(0, 4).map((mass) => <span key={mass.id}>{mass.letter}·{mass.floors}</span>)}
            </p>
          </>
        )}
      </div>
      <div aria-hidden="true" className="relative border-l border-line bg-surface-paper">
        <div className="absolute inset-x-0 bottom-5 top-12">
          {Array.from({ length: Math.floor(top / minor) + 1 }, (_, index) => {
            const metres = index * minor
            const major = metres % (minor * 5) === 0
            return (
              <span
                key={metres}
                className={cn('absolute right-0', limitM !== null && metres === Math.round(limitM) ? 'bg-warning' : 'bg-ink')}
                style={{ bottom: `${(metres / top) * 100}%`, width: major ? 40 : 20, height: major ? 2 : 1 }}
              />
            )
          })}
          {marks.map((mark) => (
            <span key={mark.key} className={cn('absolute left-2 -translate-y-1/2 whitespace-nowrap font-mono text-label', mark.className)} style={{ bottom: `${(Math.min(mark.at, top) / top) * 100}%` }}>
              {mark.label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  )
}

/** Tile 07 (spec §7.7.5): one row per check the constraints module already evaluates. */
export function ChecksTile({ checks, onOpenCheck }: { checks: readonly CheckSummary[]; onOpenCheck: () => void }) {
  const attention = checks.filter((check) => check.failing > 0).length
  const sorted = [...checks].sort((a, b) => Number(b.failing > 0) - Number(a.failing > 0))
  return (
    <Card aria-labelledby="checks-heading" className="flex h-full flex-col px-[22px] pb-5 pt-5">
      <CardHeader
        id="checks-heading"
        code="07"
        title="Checks"
        icon="shield"
        meta={checks.length === 0 ? '—' : attention === 0 ? <span className="text-ink">All clear</span> : <span className="text-warning-ink">{attention} / {checks.length}</span>}
      />
      {checks.length === 0 ? <Unavailable text="No masses to check" /> : (
        <>
          <CheckSummaryBar checks={checks} className="mt-4" />
          <ul aria-label="Checks" className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {sorted.map((check) => (
              <li key={check.id}>
                <CheckRow status={check.failing > 0 ? 'attention' : 'pass'} label={check.label} value={checkValue(check)} onClick={onOpenCheck} title="Open in Constraints" />
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 text-label text-ink-secondary">Indicative · not a planning decision</p>
    </Card>
  )
}
