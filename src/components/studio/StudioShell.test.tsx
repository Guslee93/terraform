import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Canvas } from '@react-three/fiber'
import type * as Fiber from '@react-three/fiber'
import compactManifest from '../../../public/sites/compact-infill/manifest.json'
import compactTerrain from '../../../public/sites/compact-infill/terrain.json'
import compactBuildings from '../../../public/sites/compact-infill/buildings.json'
import compactStudyArea from '../../../public/sites/compact-infill/study-area.json'
import { parseSiteManifest } from '../../features/sites/manifest'
import { parseBuildings, parseStudyArea, parseTerrain } from '../../features/sites/package'
import { SITES } from '../../features/sites/siteCatalog'
import * as solar from '../../features/analysis/sun'
import * as webgl from '../../scene/webglSupport'
import { RENDER_QUALITY_KEY } from '../../scene/renderQuality'
import { StudioShell } from './StudioShell'

// Exercise the real shell/viewport/HUD wiring without needing a GPU in jsdom.
vi.mock('@react-three/fiber', async (importOriginal) => {
  const original = await importOriginal<typeof Fiber>()
  return { ...original, Canvas: vi.fn(() => <canvas data-testid="canvas" />) }
})

const sitePackage = {
  manifest: parseSiteManifest(compactManifest),
  terrain: parseTerrain(compactTerrain),
  buildings: parseBuildings(compactBuildings),
  studyArea: parseStudyArea(compactStudyArea),
  roads: [], trees: [], landcover: [],
}

function renderStudio() {
  const site = SITES.find((entry) => entry.id === 'compact-infill')
  if (!site) throw new Error('Missing compact infill fixture')
  return render(
    <MemoryRouter>
      <StudioShell site={site} sitePackage={sitePackage} packageStatus="ready" packageError={null} onRetry={() => {}} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })))
  vi.spyOn(webgl, 'detectWebGL').mockReturnValue('webgl2')
  vi.mocked(Canvas).mockClear()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('studio rendering states', () => {
  it('does not mount Canvas without WebGL and keeps site data and inspector controls working', async () => {
    vi.mocked(webgl.detectWebGL).mockReturnValue('none')
    renderStudio()
    expect(screen.getByRole('heading', { name: '3D view unavailable' })).toBeVisible()
    expect(screen.getByText(/WebGL isn't available in this browser/)).toBeInTheDocument()
    expect(Canvas).not.toHaveBeenCalled()
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument()
    expect(screen.getByText('137 simplified')).toBeVisible()
    const terrain = screen.getByRole('checkbox', { name: 'Terrain' })
    await userEvent.setup().click(terrain)
    expect(terrain).not.toBeChecked()
    expect(screen.getByRole('combobox', { name: 'Render quality' })).toBeEnabled()
  })

  it.each([-5, 20])('shows the below-horizon chip only at night (%s degrees)', (elevationDeg) => {
    vi.spyOn(solar, 'sunDirection').mockReturnValue({ azimuthDeg: 180, elevationDeg })
    renderStudio()
    if (elevationDeg <= 0) {
      expect(screen.getByRole('status')).toHaveTextContent('Sun below horizon')
    } else {
      expect(screen.queryByText('Sun below horizon')).not.toBeInTheDocument()
    }
    expect(screen.queryByText(/sunlit|sun.hours/i)).not.toBeInTheDocument()
  })

  it('applies and persists quality, including after remount', async () => {
    const user = userEvent.setup()
    const { unmount } = renderStudio()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Render quality' }), 'low')
    expect(vi.mocked(Canvas).mock.lastCall?.[0].shadows).toBe(false)
    expect(localStorage.getItem(RENDER_QUALITY_KEY)).toBe('low')
    unmount()
    renderStudio()
    expect(screen.getByRole('combobox', { name: 'Render quality' })).toHaveValue('low')
    expect(vi.mocked(Canvas).mock.lastCall?.[0].shadows).toBe(false)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Render quality' }), 'high')
    expect(vi.mocked(Canvas).mock.lastCall?.[0].shadows).toBe('percentage')
  })
})
