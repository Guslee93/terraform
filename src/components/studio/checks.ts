import type { EnvelopeResult, EnvelopeReason } from '../../features/analysis/constraints'
import type { ClearanceIssue } from '../../features/massing/clearance'
import type { SiteManifest } from '../../features/sites/manifest'
import { formatMetres } from './format'

export type CheckSummary = {
  readonly id: 'height' | 'setback' | 'boundary' | 'ground'
  readonly label: string
  /** Masses that fail this check. */
  readonly failing: number
  readonly evaluated: number
}

/**
 * Groups the envelope result and clearance warnings the studio already computes into one row
 * per check (spec §7.7.5). Adds no new analysis: every row counts existing per-mass results.
 * Empty when nothing was evaluated.
 */
export function summarizeChecks(
  envelope: EnvelopeResult | null,
  clearance: ReadonlyMap<string, readonly ClearanceIssue[]>,
  limits: SiteManifest['constraints'] | null,
): CheckSummary[] {
  if (!envelope || envelope.status === 'not-evaluated' || envelope.perVolume.length === 0) return []
  const evaluated = envelope.perVolume.length
  const failing = (reason: EnvelopeReason) => envelope.perVolume.filter((volume) => volume.reasons.includes(reason)).length
  const ground = envelope.perVolume.filter((volume) =>
    clearance.get(volume.volumeId)?.some((issue) => issue.kind === 'floating' || issue.kind === 'cut'),
  ).length
  const rows: CheckSummary[] = []
  if (limits) {
    rows.push({ id: 'height', label: `Height ≤ ${formatMetres(limits.maxHeightMeters)} above ${envelope.heightReference}`, failing: failing('too-tall'), evaluated })
    rows.push({ id: 'setback', label: `Inside the ${formatMetres(limits.setbackMeters)} setback`, failing: failing('outside-setback'), evaluated })
    rows.push({ id: 'boundary', label: 'Inside the study area', failing: failing('outside-boundary'), evaluated })
  }
  rows.push({ id: 'ground', label: 'Sits on the terrain', failing: ground, evaluated })
  return rows
}
