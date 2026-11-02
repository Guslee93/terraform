import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createRectangleFootprint, createScenario, createTier, createVolume } from '../../features/massing/factories'
import { scenarioMetrics } from '../../features/massing/metrics'
import type { Vec2 } from '../../lib/coordinates'
import { MetricsNotes, MetricsPanel, SelectedFloors } from './MetricsPanel'

const studyArea: Vec2[] = [[-20, -25], [20, -25], [20, 25], [-20, 25]]
const lower = createTier({ footprint: createRectangleFootprint(20, 10), storeys: 3, storeyHeight: 3.2 })
const upper = createTier({ footprint: createRectangleFootprint(10, 8), storeys: 2, storeyHeight: 3.2, baseElevation: 9.6 })

describe('Metrics panel', () => {
  it('shows 760 m² and five floors for the stepped fixture', () => {
    const metrics = scenarioMetrics(createScenario({ siteId: 'fixture', volumes: [createVolume({ tiers: [lower, upper] })] }), studyArea)
    const selected = metrics.perVolume[0]
    if (!selected) throw new Error('Missing fixture volume')
    render(<><MetricsPanel metrics={metrics} /><SelectedFloors metrics={selected} /></>)
    const panel = screen.getByRole('region', { name: 'Scenario' })
    expect(within(panel).getByText('760')).toBeVisible()
    expect(within(panel).getByText(/10\.0 % of study area/)).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Selected mass metrics' })).getByText('760 m²')).toBeVisible()
    expect(within(screen.getByRole('list', { name: 'Floors' })).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('Floor 5 · 12.8 m')).toBeVisible()
    expect(screen.getByText('Above site origin')).toBeVisible()
  })

  it.each([0, 20])('shows outside area only when the footprint crosses the boundary (centre %s)', (east) => {
    const tier = createTier({ footprint: createRectangleFootprint(10, 10, [east, 0]), storeys: 1 })
    const metrics = scenarioMetrics(createScenario({ siteId: 'fixture', volumes: [createVolume({ tiers: [tier] })] }), studyArea)
    render(<MetricsPanel metrics={metrics} />)
    if (east === 20) {
      expect(screen.getByText('Outside study area')).toBeVisible()
      expect(screen.getByText('50 m² outside')).toBeVisible()
    } else expect(screen.queryByText('Outside study area')).not.toBeInTheDocument()
  })

  it('shows the empty state without metric cards', () => {
    render(<MetricsPanel metrics={scenarioMetrics(createScenario({ siteId: 'fixture' }), studyArea)} />)
    expect(screen.getByText('Draw a mass to see metrics.')).toBeVisible()
    expect(screen.queryByText('Concept GFA')).not.toBeInTheDocument()
  })

  it('explains interpenetrating floor levels', () => {
    const metrics = scenarioMetrics(createScenario({ siteId: 'fixture', volumes: [createVolume({ tiers: [lower] }), createVolume({ tiers: [lower] })] }), studyArea)
    render(<MetricsNotes metrics={metrics} />)
    expect(screen.getByText('Buildings overlap at some floor levels; overlap counted once.')).toBeVisible()
  })
})
