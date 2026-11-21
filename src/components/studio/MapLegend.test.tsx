import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { legendFor } from '../../features/analysis/graphics'
import { windCaption } from '../../features/analysis/climateView'
import { sunHoursDisclaimer } from '../../features/analysis/sunHours'
import { RUNOFF_NOTE } from '../../features/analysis/runoff'
import { noiseSourceLine } from '../../features/analysis/officialNoise'
import { SLOPE_NOTE } from '../../features/analysis/terrainTools'
import { MapLegend } from './MapLegend'

describe('MapLegend (TF-VIS-040 part B)', () => {
  it('renders the sun-hours model: title, class, ramp unit, claim and sources', () => {
    const claim = sunHoursDisclaimer(false)
    render(<MapLegend model={legendFor('sun-hours', { claim, sources: ['Kartverket DTM1'] })} />)
    expect(screen.getByRole('region', { name: 'Sun hours legend' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sun hours' })).toBeInTheDocument()
    expect(screen.getByText('Calculated')).toBeInTheDocument()
    expect(screen.getByText('share of possible sun hours')).toBeInTheDocument()
    expect(screen.getByText(claim)).toBeInTheDocument()
    expect(screen.getByText('Kartverket DTM1')).toBeInTheDocument()
  })

  it('renders band boundaries for slope', () => {
    render(<MapLegend model={legendFor('slope', { claim: SLOPE_NOTE })} />)
    expect(screen.getByRole('heading', { name: 'Slope' })).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('∞')).toBeInTheDocument()
    expect(screen.getByText(SLOPE_NOTE)).toBeInTheDocument()
  })

  it('renders the mapped noise legend with a claim', () => {
    const claim = noiseSourceLine('Lden', 2021)
    render(<MapLegend model={legendFor('noise', { claim })} />)
    expect(screen.getByRole('heading', { name: 'Road noise' })).toBeInTheDocument()
    expect(screen.getByText('Mapped data')).toBeInTheDocument()
    expect(screen.getByText(claim)).toBeInTheDocument()
  })

  it('shows a computing state', () => {
    render(<MapLegend model={legendFor('runoff', { claim: 'Tracing where the water runs…', state: 'computing' })} />)
    expect(screen.getByRole('status')).toHaveTextContent('Computing')
  })

  it('never authors claim text — the model claim equals the caption functions', () => {
    expect(legendFor('wind-speed', { claim: windCaption(2, false) }).claim).toBe(windCaption(2, false))
    expect(legendFor('noise', { claim: noiseSourceLine('Lden', 2021) }).claim).toBe(noiseSourceLine('Lden', 2021))
    expect(legendFor('runoff', { claim: RUNOFF_NOTE }).claim).toBe(RUNOFF_NOTE)
  })
})
