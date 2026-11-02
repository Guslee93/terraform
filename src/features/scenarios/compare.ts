import { evaluateEnvelope, type EnvelopeSite, type EnvelopeStatus } from '../analysis/constraints'
import { scenarioMetrics } from '../massing/metrics'
import type { ScenarioDocument } from '../massing/types'
import { massSummary } from '../analysis/massSummary'

/**
 * Side-by-side comparison of two scenarios (FR-080, FR-081; ADR-0011 §8). Numbers only: the UI
 * formats them and words deltas neutrally ("+1 200 m² in B"), never as better or worse.
 */

export type CompareKey = 'gfa' | 'footprint' | 'coverage' | 'tallest' | 'volume' | 'buildings'

export type CompareRow = {
  readonly key: CompareKey
  readonly label: string
  readonly unit: 'm²' | 'm' | 'm³' | '%' | ''
  readonly decimals: number
  readonly a: number
  readonly b: number
  /** b − a, rounded to `decimals` so the shown delta equals the shown values' difference. */
  readonly delta: number
}

export type Comparison = {
  readonly rows: readonly CompareRow[]
  readonly envelope: { readonly a: EnvelopeStatus; readonly b: EnvelopeStatus }
  readonly notes: { readonly a: string; readonly b: string }
}

const round = (value: number, decimals: number) => Number(value.toFixed(decimals))

/** Visible masses only, like every other studio figure. */
function measure(document: ScenarioDocument, site: EnvelopeSite) {
  const shown = { ...document, volumes: document.volumes.filter((volume) => volume.visible) }
  const metrics = scenarioMetrics(shown, site.studyArea)
  const reference = site.constraints?.heightReference ?? 'grade'
  const tallest = Math.max(0, ...shown.volumes.map((volume) => massSummary(volume, site, reference).heightM))
  return { metrics, tallest, envelope: evaluateEnvelope(shown, site).status }
}

export function compareScenarios(a: ScenarioDocument, b: ScenarioDocument, site: EnvelopeSite): Comparison {
  const left = measure(a, site)
  const right = measure(b, site)
  const rows: CompareRow[] = []
  const add = (key: CompareKey, label: string, unit: CompareRow['unit'], decimals: number, pick: (side: typeof left) => number) => {
    const valueA = round(pick(left), decimals)
    const valueB = round(pick(right), decimals)
    rows.push({ key, label, unit, decimals, a: valueA, b: valueB, delta: round(valueB - valueA, decimals) })
  }
  add('gfa', 'Concept GFA', 'm²', 0, (side) => side.metrics.gfaM2)
  add('footprint', 'Footprint', 'm²', 0, (side) => side.metrics.groundFootprintM2)
  add('coverage', 'Coverage of study area', '%', 1, (side) => side.metrics.coverageWithinParcel * 100)
  add('tallest', `Tallest above ${site.constraints?.heightReference ?? 'grade'}`, 'm', 1, (side) => side.tallest)
  add('volume', 'Volume', 'm³', 0, (side) => side.metrics.volumeM3)
  add('buildings', 'Buildings', '', 0, (side) => side.metrics.buildingCount)
  return { rows, envelope: { a: left.envelope, b: right.envelope }, notes: { a: a.notes, b: b.notes } }
}
