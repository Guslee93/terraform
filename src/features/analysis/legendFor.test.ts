import { describe, expect, it } from 'vitest'
import { CLASS_LABELS, GRAPHICS, legendFor, LEGEND_TITLES, type AnalysisGraphicId, type LegendState } from './graphics'
import { windCaption } from './climateView'
import { sunHoursDisclaimer } from './sunHours'
import { RUNOFF_NOTE } from './runoff'
import { noiseSourceLine } from './officialNoise'
import { ROOF_SOLAR_DISCLAIMER } from './roofSolar'
import { VSC_DISCLAIMER } from './vsc'
import { SLOPE_NOTE } from './terrainTools'

const IDS: readonly AnalysisGraphicId[] = [
  'sun-hours',
  'roof-solar',
  'vsc',
  'wind-speed',
  'wind-comfort',
  'wind-delta',
  'noise',
  'slope',
  'runoff',
]
const STATES: readonly LegendState[] = ['ready', 'computing', 'not-mapped', 'unavailable-on-import']

describe('legendFor (TF-VIS-040 part A)', () => {
  it('builds a model for every analysis id in every state', () => {
    for (const id of IDS) {
      for (const state of STATES) {
        const model = legendFor(id, { claim: 'claim', state })
        expect(model.id).toBe(id)
        expect(model.title).toBe(LEGEND_TITLES[id])
        expect(model.outputClass).toBe(GRAPHICS[id]!.outputClass)
        expect(model.classLabel).toBe(CLASS_LABELS[GRAPHICS[id]!.outputClass])
        expect(model.scale).toEqual(GRAPHICS[id]!.scale)
        expect(model.claim).toBe('claim')
        expect(model.state).toBe(state)
      }
    }
  })

  it('labels every output class with a plain word', () => {
    expect(CLASS_LABELS).toEqual({
      mapped: 'Mapped data',
      calculated: 'Calculated',
      screening: 'Screening',
      illustrative: 'Illustrative',
    })
  })

  it('carries the claim the map shows today, never authoring new text', () => {
    expect(legendFor('sun-hours', { claim: sunHoursDisclaimer(false), state: 'ready' }).claim).toBe(sunHoursDisclaimer(false))
    expect(legendFor('sun-hours', { claim: 'Computing hours of direct sun…', state: 'computing' }).claim).toBe('Computing hours of direct sun…')
    expect(legendFor('wind-speed', { claim: windCaption(20, false), state: 'ready' }).claim).toBe(windCaption(20, false))
    expect(legendFor('wind-comfort', { claim: windCaption(20, true), state: 'computing' }).claim).toBe(windCaption(20, true))
    expect(legendFor('noise', { claim: noiseSourceLine('Lden', 2021), state: 'ready' }).claim).toBe(noiseSourceLine('Lden', 2021))
    expect(legendFor('runoff', { claim: RUNOFF_NOTE, state: 'ready' }).claim).toBe(RUNOFF_NOTE)
    expect(legendFor('runoff', { claim: 'Tracing where the water runs…', state: 'computing' }).claim).toBe('Tracing where the water runs…')
    expect(legendFor('roof-solar', { claim: ROOF_SOLAR_DISCLAIMER, state: 'ready' }).claim).toBe(ROOF_SOLAR_DISCLAIMER)
    expect(legendFor('vsc', { claim: VSC_DISCLAIMER, state: 'ready' }).claim).toBe(VSC_DISCLAIMER)
    expect(legendFor('slope', { claim: SLOPE_NOTE, state: 'ready' }).claim).toBe(SLOPE_NOTE)
  })

  it('keeps sources and defaults the state to ready', () => {
    expect(legendFor('noise', { claim: 'x', sources: ['Statens vegvesen'] }).sources).toEqual(['Statens vegvesen'])
    expect(legendFor('runoff', { claim: 'x' }).sources).toEqual([])
    expect(legendFor('runoff', { claim: 'x' }).state).toBe('ready')
  })
})
