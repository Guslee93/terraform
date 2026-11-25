import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { bandShares, NOISE_SENSITIVE_NOTE, type OfficialNoise } from '../../features/analysis/officialNoise'
import type { Vec2 } from '../../lib/coordinates'
import { noiseBandPaths } from '../../scene/NoiseBands'
import type { TerrainData } from '../../features/sites/package'
import { NoisePanel } from './NoisePanel'

const area: Vec2[] = [[0, 0], [100, 0], [100, 100], [0, 100]]
const strip = (bandLow: number, y0: number, y1: number) => ({ metric: 'Lden' as const, bandLow, rings: [[[0, y0], [100, y0], [100, y1], [0, y1]] as Vec2[]] })
const noise: OfficialNoise = { dataYear: 2021, polygons: [strip(55, 0, 50), strip(65, 0, 20)] }

describe('Noise card body (ADR-0034)', () => {
  it('lists the mapped bands with their shares, the unmapped ground, the source, the year and the limitation', () => {
    render(<NoisePanel noise={noise} metric="Lden" onMetricChange={() => {}} shares={bandShares(noise, 'Lden', area, [], 10)} blockInBand={false} />)
    const rows = within(screen.getByRole('list', { name: 'Noise bands legend' })).getAllByRole('listitem').map((row) => row.textContent)
    expect(rows).toEqual(['55–60 dB30%', '65–70 dB20%', 'No mapped band50%'])
    expect(screen.getByText('Road noise, Lden 2021 (Statens vegvesen strategic noise map, CNOSSOS-EU). 5 dB bands. Not for assessing individual buildings.')).toBeVisible()
    expect(screen.getByText(/not a statement that it is quiet/)).toBeVisible()
    expect(screen.getByText(/It does not change when you add a block/)).toBeVisible()
    expect(screen.queryByText(NOISE_SENSITIVE_NOTE)).not.toBeInTheDocument()
  })

  it('says the publisher’s sentence for a drawn block in a band of 55 or more, and no level', () => {
    render(<NoisePanel noise={noise} metric="Lden" onMetricChange={() => {}} shares={bandShares(noise, 'Lden', area, [], 10)} blockInBand />)
    const note = screen.getByRole('status')
    expect(note).toHaveTextContent(NOISE_SENSITIVE_NOTE)
    expect(note.textContent).not.toMatch(/\d\s*dB/)
  })

  it('says there is no map instead of implying quiet, for a metric or a site without one', () => {
    const { rerender } = render(<NoisePanel noise={noise} metric="Lnight" onMetricChange={() => {}} shares={bandShares(noise, 'Lnight', area, [], 10)} blockInBand={false} />)
    expect(screen.getByText(/No strategic noise map here for Lnight/)).toBeVisible()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    rerender(<NoisePanel noise={null} metric="Lden" onMetricChange={() => {}} shares={bandShares(null, 'Lden', area, [], 10)} blockInBand={false} />)
    expect(screen.getByText(/No strategic noise map here\./)).toBeVisible()
    expect(screen.getByText(/not a statement that it is quiet/)).toBeVisible()
  })

  it('switches between Lden and Lnight', () => {
    const onMetric = vi.fn()
    render(<NoisePanel noise={noise} metric="Lden" onMetricChange={onMetric} shares={bandShares(noise, 'Lden', area, [], 10)} blockInBand={false} />)
    expect(screen.getByRole('button', { name: 'Lden' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Lnight' }))
    expect(onMetric).toHaveBeenCalledWith('Lnight')
  })
})

describe('band texture paths', () => {
  const terrain = { minX: -100, maxX: 100, minY: -100, maxY: 100 } as TerrainData
  it('maps ENU to texture pixels with north at the top, low bands first, holes kept', () => {
    const polygons = [
      { metric: 'Lden' as const, bandLow: 65, rings: [[[0, 0], [100, 0], [100, 100]] as Vec2[]] },
      { metric: 'Lden' as const, bandLow: 55, rings: [[[-100, -100], [100, -100], [100, 100], [-100, 100]] as Vec2[], [[-10, -10], [10, -10], [10, 10], [-10, 10]] as Vec2[]] },
      { metric: 'Lnight' as const, bandLow: 50, rings: [[[0, 0], [1, 0], [1, 1]] as Vec2[]] },
    ]
    const paths = noiseBandPaths(polygons, 'Lden', terrain, 200)
    expect(paths.map((path) => path.bandLow)).toEqual([55, 65])
    expect(paths[0]!.rings).toHaveLength(2)
    // South-west corner is bottom-left of the texture; north-east is top-right.
    expect(paths[0]!.rings[0]![0]).toEqual([0, 200])
    expect(paths[0]!.rings[0]![2]).toEqual([200, 0])
  })
})
