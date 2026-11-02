import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { constraintsFromManifest } from '../../features/analysis/constraints'
import { createRectangleFootprint, createScenario, createTier, createVolume } from '../../features/massing/factories'
import type { Vec2 } from '../../lib/coordinates'
import { ComparePanel } from './ComparePanel'

const studyArea: Vec2[] = [[-20,-25],[20,-25],[20,25],[-20,25]]
const site = { studyArea, heightAt: () => 0, constraints: constraintsFromManifest({ maxHeightMeters: 18, setbackMeters: 4 }, 'grade') }
const scenario = (id: string, storeys: number) => createScenario({ id, siteId: 's', name: `Concept ${id.toUpperCase()}`, notes: id, volumes: [createVolume({ id, tiers: [createTier({ footprint: createRectangleFootprint(20,10), storeys, storeyHeight: 3 })] })] })
const a = scenario('a', 3), b = scenario('b', 7)
describe('ComparePanel', () => {
  it('shows QA-12 numbers, neutral deltas, notes, disclaimer and fallback; activates B', async () => {
    const onEdit = vi.fn()
    render(<ComparePanel scenarios={[a,b]} a={a} b={b} site={site} thumbnails="failed" cameraLabel="top" disabled={false} onEdit={onEdit} onPairChange={vi.fn()} onClose={vi.fn()} />)
    const row = screen.getByRole('rowheader', { name: /Concept GFA/ }).closest('tr')!
    expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['600','1\u2009400','+800 m²'])
    expect(screen.getByText('+12.0 m')).toBeInTheDocument()
    expect(screen.getByText('Illustrative constraint — not planning advice')).toBeInTheDocument()
    expect(screen.getAllByText('Thumbnail unavailable in this browser')).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Edit B' }))
    expect(onEdit).toHaveBeenCalledWith('b')
  })

  it('says "Updating" while a capture is pending, never "unavailable"', () => {
    render(<ComparePanel scenarios={[a,b]} a={a} b={b} site={site} thumbnails="pending" cameraLabel="top" disabled={false} onEdit={vi.fn()} onPairChange={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getAllByText('Updating thumbnails…')).toHaveLength(2)
    expect(screen.queryByText('Thumbnail unavailable in this browser')).not.toBeInTheDocument()
  })
  it('labels matched snapshots and changes the selected pair', async () => {
    const onPairChange = vi.fn()
    render(<ComparePanel scenarios={[a,b]} a={a} b={b} site={site} thumbnails={['data:image/png;base64,a','data:image/png;base64,b']} cameraLabel="top" disabled={false} onEdit={vi.fn()} onPairChange={onPairChange} onClose={vi.fn()} />)
    expect(screen.getByRole('img', { name: 'Concept A, top camera view' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Scenario A'), 'b')
    expect(onPairChange).toHaveBeenCalledWith('b', 'b')
  })
})
