import { bandColour, bandLabel, NOISE_METRIC_NAME, NOISE_METRICS, NOISE_SENSITIVE_NOTE, NO_NOISE_MAP, noiseSourceLine, type NoiseMetric, type NoiseShares, type OfficialNoise } from '../../features/analysis/officialNoise'
import { segmentClass, segmentGroupClass } from '../ui/controls'
import { ShareBar } from './DirectionRose'

/** Legend colour for ground in no mapped band: neutral, so it never reads as a "quiet" class. */
const UNMAPPED_COLOUR = '#E5E7EB'

/**
 * The Noise card's body (ADR-0034): the official strategic road-noise map as mapped bands. A
 * static authority map shown as published: the metric switch, the bands with their share of the
 * open ground, the source and year, and the publisher's limitation. Never a level for a building.
 */
export function NoisePanel({ noise, metric, onMetricChange, shares, blockInBand }: {
  noise: OfficialNoise | null
  metric: NoiseMetric
  onMetricChange: (metric: NoiseMetric) => void
  shares: NoiseShares
  /** A drawn block touches a mapped Lden band at or above 55 dB. */
  blockInBand: boolean
}) {
  const entries = [
    ...shares.bands.map((band) => ({ label: bandLabel(band.bandLow), colour: bandColour(band.bandLow), count: band.count, share: band.share })),
    { label: 'No mapped band', colour: UNMAPPED_COLOUR, count: shares.unmapped.count, share: shares.unmapped.share },
  ]
  return (
    <div className="space-y-3">
      <div role="group" aria-label="Noise metric" className={segmentGroupClass}>
        {NOISE_METRICS.map((option) => (
          <button key={option} type="button" aria-pressed={metric === option} title={NOISE_METRIC_NAME[option]} onClick={() => onMetricChange(option)} className={segmentClass}>
            {option}
          </button>
        ))}
      </div>
      {!noise || !shares.mapped ? (
        <p className="text-body-sm text-ink-secondary">
          {NO_NOISE_MAP}{noise ? ` for ${metric}` : ''}. Statens vegvesen maps the large urban areas and the busiest roads elsewhere; nothing is mapped in this area. That is not a statement that it is quiet.
        </p>
      ) : (
        <>
          <div>
            <ShareBar entries={entries} label="Share of open ground in the study area by mapped band" />
            <ul className="mt-2" aria-label="Noise bands legend">
              {entries.map((entry) => (
                <li key={entry.label} className="flex min-h-7 items-center justify-between gap-3 text-body-sm text-ink">
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className="inline-block size-2.5 rounded-full" style={{ backgroundColor: entry.colour }} />
                    {entry.label}
                  </span>
                  <span className="tabular-nums text-ink-secondary">{Math.round(entry.share * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-caption text-ink-secondary">
            Shares are of the open ground in the study area. Ground in no band is below the map’s lowest band or not mapped; it is not a statement that it is quiet.
          </p>
          <p className="text-caption text-ink-secondary">{noiseSourceLine(metric, noise.dataYear)}</p>
          <p className="text-caption text-ink-secondary">A published map of {noise.dataYear} traffic around the existing buildings. It does not change when you add a block.</p>
          {blockInBand && <p role="status" className="text-caption text-ink">{NOISE_SENSITIVE_NOTE}</p>}
        </>
      )}
    </div>
  )
}
