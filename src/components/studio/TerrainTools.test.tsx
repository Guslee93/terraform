import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { terrainProfile, type TerrainRaster } from '../../features/analysis/terrainTools'
import { loadTerrainRaster } from '../../features/sites/terrain1m'
import { slopePixels } from '../../scene/SlopeOverlay'
import { profilePath, TerrainTools } from './TerrainTools'

/** 40 × 40 cells of 1 m: flat in the west half, a 45° ramp in the east half. Origin at 20 m. */
const raster: TerrainRaster = (() => {
  const size = 40
  const heights = new Float32Array(size * size)
  for (let row = 0; row < size; row += 1) for (let col = 0; col < size; col += 1) heights[row * size + col] = Math.max(0, col + 0.5 - 20)
  return { cols: size, rows: size, minX: 0, minY: 0, maxX: size, maxY: size, originElevation: 20, heights }
})()
const props = { state: 'ready' as const, raster, slopeOn: false, onSlopeChange: () => {}, picking: false, onPick: () => {}, profile: null, onClear: () => {} }

describe('Terrain tools (ADR-0037)', () => {
  it('shows the slope legend with shares only while the overlay is on', () => {
    const { rerender } = render(<TerrainTools {...props} />)
    expect(screen.queryByRole('list', { name: 'Slope legend' })).not.toBeInTheDocument()
    rerender(<TerrainTools {...props} slopeOn />)
    const rows = within(screen.getByRole('list', { name: 'Slope legend' })).getAllByRole('listitem').map((row) => row.textContent)
    // Horn's 3 × 3 window: columns 0–18 are flat (47.5 %), column 19 beside the ramp reads 14°,
    // columns 20–38 are steep (47.5 %), and the edge column 39 repeats its neighbour (26.6°).
    expect(rows).toEqual(['Under 5°48%', '5–15°3%', '15–30°3%', 'Over 30°48%'])
    expect(screen.getByText(/Kerbs, walls and embankments read as steep/)).toBeVisible()
  })

  it('draws a section: the button asks for two points, then the chart names its length and elevations above sea level', () => {
    const onPick = vi.fn()
    const { rerender } = render(<TerrainTools {...props} onPick={onPick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Draw a section' }))
    expect(onPick).toHaveBeenCalledWith(true)
    rerender(<TerrainTools {...props} picking />)
    expect(screen.getByRole('button', { name: /Click two points on the ground/ })).toHaveAttribute('aria-pressed', 'true')
    const profile = terrainProfile(raster, [[10, 20], [30, 20]], 1)
    rerender(<TerrainTools {...props} profile={profile} />)
    // From flat ground at the origin level (20 m) up the ramp to 10 m above it.
    expect(screen.getByRole('img', { name: 'Terrain section, 20 m long, from 20.0 m to 30.0 m above sea level' })).toBeVisible()
    expect(screen.getByText('20.0–30.0 m above sea level')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Clear section' })).toBeVisible()
    expect(screen.getByText(/Kartverket DTM1 .* not a survey\. Elevations are NN2000/)).toBeVisible()
  })

  it('says when the tile is loading, failed, or does not reach the section', () => {
    const { rerender } = render(<TerrainTools {...props} state="loading" raster={null} />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading the 1 m terrain…')
    rerender(<TerrainTools {...props} state="error" raster={null} />)
    expect(screen.getByRole('status')).toHaveTextContent('could not be loaded')
    rerender(<TerrainTools {...props} profile={terrainProfile(raster, [[-90, -90], [-80, -90]], 1)} />)
    expect(screen.getByText('The section lies outside the 1 m terrain tile.')).toBeVisible()
  })

  it('the chart path starts at the left, rises with the ground and lifts the pen over a gap', () => {
    const path = profilePath(terrainProfile(raster, [[10, 20], [30, 20]], 1))
    expect(path.startsWith('M4.0 104.0')).toBe(true)
    expect(path.endsWith('L296.0 8.0')).toBe(true)
    const gapped = terrainProfile(raster, [[10, 20], [30, 20]], 1).map((point, index) => (index === 5 ? { ...point, elevation: null } : point))
    expect(profilePath(gapped).match(/M/g)).toHaveLength(2)
    expect(profilePath([])).toBe('')
  })
})

describe('slope overlay pixels', () => {
  it('leaves gentle ground clear and colours the steep cells', () => {
    const pixels = slopePixels(raster)
    const alpha = (row: number, col: number) => pixels[(row * 40 + col) * 4 + 3]
    expect(alpha(20, 5)).toBe(0)
    expect(alpha(20, 30)).toBe(255)
    // Over 30°: the darkest band colour (#962838).
    expect(Array.from(pixels.slice((20 * 40 + 30) * 4, (20 * 40 + 30) * 4 + 3))).toEqual([0x96, 0x28, 0x38])
  })
})

describe('loading the 1 m terrain tile', () => {
  afterEach(() => vi.unstubAllGlobals())
  const header = { schemaVersion: 1, siteId: 'demo', cols: 2, rows: 2, minX: 0, minY: 0, maxX: 2, maxY: 2, originElevation: 5, verticalDatum: 'NN2000' }
  const data = new Int16Array([100, 200, 300, 400]).buffer
  const serve = (body: unknown, bin: ArrayBuffer = data) => vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) =>
    Promise.resolve(String(input).endsWith('.bin') ? new Response(bin) : new Response(JSON.stringify(body)))))

  it('fetches the header and its .bin beside it', async () => {
    serve(header)
    const loaded = await loadTerrainRaster('demo', 'terrain1m.json')
    expect(Array.from(loaded.heights)).toEqual([1, 2, 3, 4])
    expect(vi.mocked(fetch).mock.calls.map(([input]) => String(input))).toEqual(['/sites/demo/terrain1m.json', '/sites/demo/terrain1m.bin'])
  })
  it('refuses another site’s tile, a file of the wrong size and an unsafe path', async () => {
    serve({ ...header, siteId: 'other' })
    await expect(loadTerrainRaster('demo', 'terrain1m.json')).rejects.toThrow(/site id/)
    serve(header, new ArrayBuffer(4))
    await expect(loadTerrainRaster('demo', 'terrain1m.json')).rejects.toThrow(/file size/)
    await expect(loadTerrainRaster('demo', '../secrets.json')).rejects.toThrow(/unsafe asset path/)
  })
})
