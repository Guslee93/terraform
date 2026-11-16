import { useMemo } from 'react'
import { hornSlopeDeg, profileRange, SLOPE_BANDS, SLOPE_NOTE, slopeShares, TERRAIN_NOTE, type ProfilePoint, type TerrainRaster } from '../../features/analysis/terrainTools'
import { cn } from '../../lib/cn'
import { checkboxClass, pillButtonClass } from '../ui/controls'
import { formatNumber } from './format'

export type TerrainToolsState = 'idle' | 'loading' | 'ready' | 'error'

const CHART = { width: 300, height: 110, left: 4, right: 4, top: 8, bottom: 6 }

/** The profile as an SVG path: distance along x, elevation along y, both scaled to the chart. */
export function profilePath(profile: readonly ProfilePoint[]): string {
  const range = profileRange(profile)
  const length = profile.at(-1)?.distance ?? 0
  if (!range || length <= 0) return ''
  const span = Math.max(0.5, range.max - range.min)
  const x = (distance: number) => CHART.left + (distance / length) * (CHART.width - CHART.left - CHART.right)
  const y = (elevation: number) => CHART.top + (1 - (elevation - range.min) / span) * (CHART.height - CHART.top - CHART.bottom)
  let path = ''
  let pen = false
  for (const point of profile) {
    // A gap in the data lifts the pen: no line is drawn across ground the tile does not have.
    if (point.elevation === null) { pen = false; continue }
    path += `${pen ? 'L' : 'M'}${x(point.distance).toFixed(1)} ${y(point.elevation).toFixed(1)}`
    pen = true
  }
  return path
}

/**
 * Tools on the 1 m terrain (ADR-0037): a slope overlay in four bands and a section along a line the
 * user draws with two clicks. Elevations are metres above sea level (NN2000), from Kartverket DTM1.
 */
export function TerrainTools({ state, raster, slopeOn, onSlopeChange, picking, onPick, profile, onClear }: {
  state: TerrainToolsState
  raster: TerrainRaster | null
  slopeOn: boolean
  onSlopeChange: (on: boolean) => void
  /** The section tool is waiting for ground clicks. */
  picking: boolean
  onPick: (picking: boolean) => void
  /** The drawn section, or null before two points are placed. */
  profile: readonly ProfilePoint[] | null
  onClear: () => void
}) {
  const shares = useMemo(() => (raster && slopeOn ? slopeShares(hornSlopeDeg(raster)) : null), [raster, slopeOn])
  const range = profile ? profileRange(profile) : null
  const length = profile?.at(-1)?.distance ?? 0
  const sea = (relative: number) => formatNumber(relative + (raster?.originElevation ?? 0), 1)
  return (
    <section aria-label="Terrain tools" className="mt-3 border-t border-card-line pt-3">
      <p className="text-body-sm text-ink-secondary">Terrain tools · 1 m terrain</p>
      <label className="mt-1 flex min-h-8 cursor-pointer items-center justify-between gap-3 text-body-sm text-ink">
        <span>Slope</span>
        <input type="checkbox" checked={slopeOn} onChange={(event) => onSlopeChange(event.currentTarget.checked)} className={checkboxClass} />
      </label>
      {slopeOn && shares && (
        <>
          <ul aria-label="Slope legend" className="mt-1">
            {SLOPE_BANDS.map((band, index) => (
              <li key={band.label} className="flex min-h-6 items-center justify-between gap-3 text-body-sm text-ink">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="inline-block size-2.5 rounded-full border border-card-line" style={{ backgroundColor: band.colour }} />
                  {band.label}
                </span>
                <span className="tabular-nums text-ink-secondary">{Math.round(shares[index]! * 100)}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-caption text-ink-secondary">Share of the terrain tile. {SLOPE_NOTE}</p>
        </>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" aria-pressed={picking} onClick={() => onPick(!picking)} className={pillButtonClass}>
          {picking ? 'Click two points on the ground · Esc to cancel' : profile ? 'Draw another section' : 'Draw a section'}
        </button>
        {profile && !picking && <button type="button" onClick={onClear} className={pillButtonClass}>Clear section</button>}
      </div>
      {state === 'loading' && <p role="status" className="mt-2 text-caption text-ink-secondary">Loading the 1 m terrain…</p>}
      {state === 'error' && <p role="status" className="mt-2 text-caption text-ink">The 1 m terrain could not be loaded.</p>}
      {profile && range && (
        <figure className="mt-2">
          <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" className={cn('w-full rounded-chip border border-card-line bg-canvas')}
            aria-label={`Terrain section, ${formatNumber(length)} m long, from ${sea(range.min)} m to ${sea(range.max)} m above sea level`}>
            <path d={profilePath(profile)} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
          <figcaption className="mt-1 flex justify-between gap-3 text-caption tabular-nums text-ink-secondary">
            <span>0 m</span>
            <span className="text-ink">{sea(range.min)}–{sea(range.max)} m above sea level</span>
            <span>{formatNumber(length)} m</span>
          </figcaption>
        </figure>
      )}
      {profile && !range && <p className="mt-2 text-caption text-ink-secondary">The section lies outside the 1 m terrain tile.</p>}
      <p className="mt-2 text-caption text-ink-secondary">{TERRAIN_NOTE}. Elevations are NN2000. The chart’s height is exaggerated to fit.</p>
    </section>
  )
}
