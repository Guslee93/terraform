import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import {
  ACTIVITY_BANDS,
  ACTIVITY_NOTE,
  ACTIVITY_VIEW_NAME,
  DELTA_BANDS,
  DELTA_NOTE,
  DIRECTION_BANDS,
  heightNote,
  LIFT_SLOPE_NOTE,
  SPEED_BANDS,
  windCaption,
  WORST_NOTE,
} from './climateView'
import { SUN_HOURS_DISCLAIMER, SUN_HOURS_DISCLAIMER_MEASURED, sunHoursDisclaimer } from './sunHours'
import { ROOF_SOLAR_BAND_LABEL, ROOF_SOLAR_DISCLAIMER } from './roofSolar'
import { VSC_BAND_LABEL, VSC_DISCLAIMER } from './vsc'
import { RUNOFF_COURTYARDS, RUNOFF_LEGEND, RUNOFF_LIMITS, RUNOFF_NOTE } from './runoff'
import { periodLabel, SNOW_LIMITS, SNOW_NOTE } from './snowClimate'
import { HAZARD_DISCLAIMER, hazardFacts, type Hazards, type HazardLayer } from './hazards'
import {
  bandLabel,
  NOISE_SENSITIVE_NOTE,
  NOISE_LIMITATION,
  NOISE_USE_LIMITATION,
  noiseSourceLine,
  NO_NOISE_MAP,
  OFFICIAL_NOISE_NOTE,
} from './officialNoise'
import { PARCEL_AREA_NOTE, PARCEL_NOTE } from './parcels'
import { SLOPE_BANDS, SLOPE_NOTE, TERRAIN_NOTE } from './terrainTools'
import { STREAMLINE_3D_NOTE } from './streamlines3d'
import { CONSTRAINT_DISCLAIMER } from './constraints'
import { FLOW_DISCLAIMER } from './lbm'

/** One forbidden term/claim. `allowNegated` lets the required disclaimers say "not … X". */
const BANNED: { name: string; re: RegExp; allowNegated?: boolean }[] = [
  { name: 'safe (whole word)', re: /\bsafe\b/i, allowNegated: true },
  { name: 'verified', re: /verified/i },
  { name: 'compliant/compliance', re: /complian[ct]e/i },
  { name: 'accurate', re: /accurate/i },
  { name: 'certified', re: /certified/i },
  { name: 'flood depth', re: /flood depth/i, allowNegated: true },
  { name: 'snow load', re: /snow load/i, allowNegated: true },
  { name: 'water depth', re: /water depth/i, allowNegated: true },
  { name: 'return period', re: /return period/i, allowNegated: true },
  { name: 'comfortable/uncomfortable', re: /comfortable|uncomfortable/i },
]

/** True when the first match of `re` sits in a clause the string negates ("not a snow load"). */
const negates = (text: string, re: RegExp): boolean => {
  re.lastIndex = 0
  const match = re.exec(text)
  if (!match) return false
  const clause = text.slice(0, match.index).split(/[.!?]/).at(-1) ?? ''
  return /\b(?:not|never|no)\b/i.test(clause)
}

/** The banned term a string trips, or null. */
const blocked = (text: string): string | null => {
  for (const { name, re, allowNegated } of BANNED) {
    if (!re.test(text)) continue
    if (name === 'comfortable/uncomfortable' && /screening/i.test(text)) continue
    if (allowNegated && negates(text, re)) continue
    return name
  }
  return null
}

const ring: readonly Vec2[] = [[0, 0], [1, 0], [1, 1], [0, 1]]
const farRing: readonly Vec2[] = [[100, 100], [101, 100], [101, 101], [100, 101]]
const hereLayer: HazardLayer = { kind: 'flood-zones', updated: '2026-01-02', polygons: [[ring]] }
const nearbyLayer: HazardLayer = { kind: 'flood-susceptibility', updated: null, polygons: [[farRing]] }
const emptyLayer: HazardLayer = { kind: 'quick-clay', updated: null, polygons: [] }
const hazards: Hazards = { retrieved: '2026-11-17', layers: [hereLayer, nearbyLayer, emptyLayer] }
const area: readonly Vec2[] = [[-5, -5], [5, -5], [5, 5], [-5, 5]]

const hazardFactsText = hazardFacts(hazards, area).flatMap((fact) => [fact.label, fact.statement, fact.source, fact.note])

// Every caption, note, disclaimer and legend label the analyses produce. The wind activity labels
// ("Uncomfortable…") are NOT here: they are an open owner decision, exercised below as `it.todo`.
const texts: readonly string[] = [
  // Wind
  FLOW_DISCLAIMER,
  windCaption(2, false),
  windCaption(20, false),
  windCaption(20, true),
  heightNote(2),
  heightNote(20),
  LIFT_SLOPE_NOTE,
  ACTIVITY_NOTE,
  ACTIVITY_VIEW_NAME,
  DELTA_NOTE,
  WORST_NOTE,
  ...DELTA_BANDS.map((b) => b.label),
  ...DIRECTION_BANDS.map((b) => b.label),
  ...SPEED_BANDS.map((b) => b.label),
  // Sun
  SUN_HOURS_DISCLAIMER,
  SUN_HOURS_DISCLAIMER_MEASURED,
  sunHoursDisclaimer(false),
  sunHoursDisclaimer(true),
  ROOF_SOLAR_DISCLAIMER,
  ...Object.values(ROOF_SOLAR_BAND_LABEL),
  VSC_DISCLAIMER,
  ...Object.values(VSC_BAND_LABEL),
  // Water / runoff
  RUNOFF_NOTE,
  RUNOFF_LIMITS,
  RUNOFF_COURTYARDS,
  ...RUNOFF_LEGEND.map((b) => b.label),
  // Snow
  SNOW_NOTE,
  SNOW_LIMITS,
  periodLabel({ winters: [{ winter: '1990/91', snowDays: 40, maxDepthCm: 60 }, { winter: '2020/21', snowDays: 30, maxDepthCm: 45 }] }),
  // Noise
  NOISE_USE_LIMITATION,
  NOISE_LIMITATION,
  NOISE_SENSITIVE_NOTE,
  NO_NOISE_MAP,
  OFFICIAL_NOISE_NOTE,
  noiseSourceLine('Lden', 2021),
  noiseSourceLine('Lnight', 2021),
  bandLabel(45),
  bandLabel(55),
  bandLabel(75),
  bandLabel(80),
  // Hazards
  HAZARD_DISCLAIMER,
  ...hazardFactsText,
  // Parcels, terrain, streamlines, constraints
  PARCEL_NOTE,
  PARCEL_AREA_NOTE,
  TERRAIN_NOTE,
  SLOPE_NOTE,
  ...SLOPE_BANDS.map((b) => b.label),
  STREAMLINE_3D_NOTE,
  CONSTRAINT_DISCLAIMER,
]

describe('claims guardrail (TF-VIS-054)', () => {
  it('no caption, note, disclaimer or legend label makes a forbidden claim', () => {
    const failures = texts
      .map((text, index) => ({ text, index, term: blocked(text) }))
      .filter((entry) => entry.term !== null)
    expect(failures).toEqual([])
  })

  it('the required disclaimers negate, not assert, the forbidden readings', () => {
    expect(HAZARD_DISCLAIMER).toMatch(/not\b[^.!?]*\bsafe\b/i)
    expect(SNOW_LIMITS).toMatch(/not\b[^.!?]*\bsnow load\b/i)
  })

  it('documents the Lawson wind-activity labels held out of the guardrail (owner decision)', () => {
    // These are the labels that still read "Uncomfortable". Held out of the guardrail because the
    // run book leaves whether to keep the Lawson names to the owner; if they are relabelled, fold
    // ACTIVITY_BANDS labels back into `texts`.
    expect(ACTIVITY_BANDS.filter((b) => /uncomfortable/i.test(b.label)).length).toBeGreaterThan(0)
  })

  // Owner decision (run book §7 T2): keep the Lawson "Uncomfortable" names or relabel. Not a
  // guardrail failure to fix here.
  it.todo('wind activity legend: "Uncomfortable" Lawson labels are an open owner decision')
})

