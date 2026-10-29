import { fireEvent, render, screen, type RenderResult } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CONSTRAINT_DISCLAIMER,
  constraintsFromManifest,
  ENVELOPE_STATUS_LABEL,
  evaluateEnvelope,
  type EnvelopeResult,
  type EnvelopeStatus,
} from '../../features/analysis/constraints'
import { sunState } from '../../features/analysis/sun'
import { localDayMinuteToInstant } from '../../features/analysis/time'
import { createRectangleFootprint, createScenario, createTier, createVolume } from '../../features/massing/factories'
import { scenarioMetrics } from '../../features/massing/metrics'
import type { Vec2 } from '../../lib/coordinates'
import { ConstraintsPanel } from './ConstraintsPanel'
import { MetricsPanel, SelectedFloors } from './MetricsPanel'
import { SunPanel, type SunTime } from './SunPanel'

// D34 — claim and disclaimer audit (docs/plans/M3-fable-plan.md §10, AGENTS.md §7).
// Every rendered constraint status keeps the disclaimer adjacent; the metrics disclosure and the
// sun method note carry their required wording; and no rendered UI string contains a forbidden
// claim ("sun hours", "compliant", "verified", "BIM-ready", "official parcel").

const FORBIDDEN_CLAIMS = ['sun hours', 'compliant', 'verified', 'bim-ready', 'bim ready', 'official parcel'] as const

/** Text of the render plus every title and aria-label, lower-cased, for the claim sweep. */
function claimText(result: RenderResult): string {
  const parts = [result.container.textContent ?? '']
  for (const node of result.container.querySelectorAll<HTMLElement>('[title], [aria-label]')) {
    parts.push(node.getAttribute('title') ?? '', node.getAttribute('aria-label') ?? '')
  }
  return parts.join('\n').toLowerCase()
}

const studyArea: Vec2[] = [[-20, -25], [20, -25], [20, 25], [-20, 25]]
const limits = { maxHeightMeters: 12, setbackMeters: 4, label: 'Illustrative design constraint' }
const withinTier = createTier({ footprint: createRectangleFootprint(10, 10), storeys: 3, storeyHeight: 3.2 })
const crossingTier = createTier({ footprint: createRectangleFootprint(10, 10, [20, 0]), storeys: 6, storeyHeight: 3.2 })
const steppedLower = createTier({ footprint: createRectangleFootprint(20, 10), storeys: 3, storeyHeight: 3.2 })
const steppedUpper = createTier({ footprint: createRectangleFootprint(10, 8), storeys: 2, storeyHeight: 3.2, baseElevation: 9.6 })

function envelopeFor(status: EnvelopeStatus): EnvelopeResult {
  const volume = createVolume({ id: 'volume', name: 'East wing', tiers: [status === 'within' ? withinTier : crossingTier] })
  const document = createScenario({ siteId: 'fixture', volumes: [volume] })
  const before = { studyArea, heightAt: () => 0 }
  if (status === 'not-evaluated') return evaluateEnvelope(document, { ...before, constraints: null })
  return evaluateEnvelope(document, { ...before, constraints: constraintsFromManifest(limits, 'grade') })
}

function SunPanelHarness({ latitude = 59.91, initial = { date: '2026-06-21', minuteOfDay: 900 } }: { latitude?: number; initial?: SunTime }) {
  const [time, setTime] = useState(initial)
  const location = { latitude, longitude: 10.75, timeZone: 'Europe/Oslo' }
  const resolved = localDayMinuteToInstant(time.date, time.minuteOfDay, location.timeZone)
  return <SunPanel time={time} onChange={setTime} location={location} resolved={resolved} state={sunState(resolved.instant, latitude, location.longitude, location.timeZone)} />
}

beforeEach(() => vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))))
afterEach(() => { vi.unstubAllGlobals() })

describe('D34 claim and disclaimer audit', () => {
  it('keeps "Illustrative constraint — not planning advice" adjacent to every Constraints-tab status', () => {
    for (const status of ['within', 'exceeds', 'not-evaluated'] as const) {
      const envelope = envelopeFor(status)
      const { container } = render(<ConstraintsPanel envelope={envelope} limits={limits} heightReference="grade" onHeightReferenceChange={() => {}} masses={[{ id: 'volume', name: 'East wing', hidden: false, warning: status === 'exceeds', detail: '' }]} onSelectMass={() => {}} />)
      const headline = screen.getByRole('heading', { name: ENVELOPE_STATUS_LABEL[status] })
      expect(headline.nextElementSibling).toHaveTextContent(CONSTRAINT_DISCLAIMER)
      expect(container.textContent).toContain(CONSTRAINT_DISCLAIMER)
      container.remove()
    }
  })

  it('lists the offending reasons on exceed and hands the click to the volume', () => {
    const onSelect = vi.fn()
    const envelope = envelopeFor('exceeds')
    render(<ConstraintsPanel envelope={envelope} limits={limits} heightReference="grade" onHeightReferenceChange={() => {}} masses={[{ id: 'volume', name: 'East wing', hidden: false, warning: true, detail: '' }]} onSelectMass={onSelect} />)
    const warning = screen.getByRole('button', { name: /East wing.*outside the setback/ })
    expect(warning).toHaveTextContent('outside the study area')
    fireEvent.click(warning)
    expect(onSelect).toHaveBeenCalledWith('volume')
  })

  it('discloses the units rule in the metrics "About these numbers" and the selected floors note', () => {
    const metrics = scenarioMetrics(createScenario({ siteId: 'fixture', volumes: [createVolume({ tiers: [steppedLower, steppedUpper] })] }), studyArea)
    const selected = metrics.perVolume[0]
    if (!selected) throw new Error('Missing fixture volume')
    render(<><MetricsPanel metrics={metrics} /><SelectedFloors metrics={selected} /></>)
    fireEvent.click(screen.getByText('About these numbers'))
    const braNotes = screen.getAllByText(/Concept GFA is not BRA, BYA or %-BRA/)
    expect(braNotes).toHaveLength(2)
    for (const note of braNotes) expect(note).toBeVisible()
  })

  it('states in the Sun method note that it is not a daylight or sun-hours assessment', () => {
    render(<SunPanelHarness />)
    expect(screen.getByText('Geometric sun direction for this site (suncalc). Not a daylight or sun-hours assessment.')).toBeVisible()
  })

  it('renders no forbidden claims in any of the analysed panels', () => {
    const metrics = scenarioMetrics(createScenario({ siteId: 'fixture', volumes: [createVolume({ tiers: [crossingTier] })] }), studyArea)
    const selected = metrics.perVolume[0]
    if (!selected) throw new Error('Missing fixture volume')
    const envelope = envelopeFor('exceeds')
    const result = render(<>
      <ConstraintsPanel envelope={envelope} limits={limits} heightReference="grade" onHeightReferenceChange={() => {}} masses={[{ id: 'volume', name: 'East wing', hidden: false, warning: true, detail: '' }]} onSelectMass={() => {}} />
      <MetricsPanel metrics={metrics} />
      <SelectedFloors metrics={selected} />
      <SunPanelHarness />
    </>)
    const haystack = claimText(result)
    for (const claim of FORBIDDEN_CLAIMS) {
      expect(haystack, `forbidden claim "${claim}" in rendered panels`).not.toContain(claim)
    }
    // The allowed, hyphenated negation must be present, but the spaced claim never is.
    expect(screen.getByText(/Not a daylight or sun-hours assessment\./)).toBeVisible()
    expect(haystack).not.toContain('sun hours')
  })
})