import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Children, isValidElement, type ComponentProps } from 'react'
import { moveGesture } from '../../features/editor/interaction'
import { MassLayer } from '../../scene/MassLayer'
import { ConstraintLayer } from '../../scene/ConstraintLayer'
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
import * as factories from '../../features/massing/factories'
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

function renderStudio(packageOverride = sitePackage) {
  const site = SITES.find((entry) => entry.id === 'compact-infill')
  if (!site) throw new Error('Missing compact infill fixture')
  return render(
    <MemoryRouter>
      <StudioShell site={site} sitePackage={packageOverride} packageStatus="ready" packageError={null} onRetry={() => {}} />
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
  it('updates coverage, envelope and amber tint during a live drag, then restores them on Escape', () => {
    const tier = factories.createTier({ id: 'ground', footprint: factories.createRectangleFootprint(10, 10), storeys: 1 })
    const volume = factories.createVolume({ id: 'moving', name: 'Moving wing', tiers: [tier] })
    const document = factories.createScenario({ siteId: 'compact-infill', volumes: [volume] })
    vi.spyOn(factories, 'createScenario').mockReturnValue(document)
    renderStudio({ ...sitePackage,
      terrain: { ...sitePackage.terrain, heights: sitePackage.terrain.heights.map((row) => row.map(() => 0)) },
      studyArea: { ...sitePackage.studyArea, polygon: [[-20, -25], [20, -25], [20, 25], [-20, 25], [-20, -25]] },
    })
    const sceneChildren = () => Children.toArray(vi.mocked(Canvas).mock.lastCall?.[0].children)
    const massLayer = sceneChildren().find((child) => isValidElement<ComponentProps<typeof MassLayer>>(child) && child.type === MassLayer)
    if (!isValidElement<ComponentProps<typeof MassLayer>>(massLayer)) throw new Error('Missing mass adapter')
    const dispatch = massLayer.props.dispatch
    expect(screen.queryByText('Outside study area')).not.toBeInTheDocument()
    act(() => dispatch({ type: 'pointerDown', point: [0, 0], gesture: moveGesture('moving') }))
    act(() => dispatch({ type: 'pointerMove', point: [20, 0] }))
    expect(screen.getByText('50 m² outside')).toBeVisible()
    const movedLayer = sceneChildren().find((child) => isValidElement<ComponentProps<typeof MassLayer>>(child) && child.type === MassLayer)
    if (!isValidElement<ComponentProps<typeof MassLayer>>(movedLayer)) throw new Error('Missing mass adapter')
    expect(movedLayer.props.warnedVolumes.has('moving')).toBe(true)
    const constraintLayer = sceneChildren().find((child) => isValidElement<ComponentProps<typeof ConstraintLayer>>(child) && child.type === ConstraintLayer)
    if (!isValidElement<ComponentProps<typeof ConstraintLayer>>(constraintLayer)) throw new Error('Missing constraint adapter')
    expect(constraintLayer.props.envelope?.status).toBe('exceeds')
    act(() => dispatch({ type: 'key', key: 'Escape' }))
    expect(screen.queryByText('Outside study area')).not.toBeInTheDocument()
    const restored = sceneChildren().find((child) => isValidElement<ComponentProps<typeof ConstraintLayer>>(child) && child.type === ConstraintLayer)
    if (!isValidElement<ComponentProps<typeof ConstraintLayer>>(restored)) throw new Error('Missing constraint adapter')
    expect(restored.props.envelope?.status).toBe('within')
  })

  it('excludes hidden masses from metrics and warnings and selects the warned ground tier without leaving Constraints', async () => {
    const ground = factories.createTier({ id: 'ground', footprint: factories.createRectangleFootprint(10, 10, [20, 0]), storeys: 6 })
    const upper = factories.createTier({ id: 'upper', footprint: factories.createRectangleFootprint(8, 8, [20, 0]), storeys: 1, baseElevation: 19.2 })
    const visible = factories.createVolume({ id: 'visible', name: 'Visible wing', tiers: [upper, ground] })
    const hidden = factories.createVolume({ id: 'hidden', name: 'Hidden wing', visible: false, tiers: [{ ...ground, id: 'hidden-ground' }] })
    const document = factories.createScenario({ siteId: 'compact-infill', volumes: [visible, hidden] })
    vi.spyOn(factories, 'createScenario').mockReturnValue(document)
    renderStudio({ ...sitePackage, studyArea: { ...sitePackage.studyArea, polygon: [[-20, -25], [20, -25], [20, 25], [-20, 25], [-20, -25]] } })
    const metrics = screen.getByRole('region', { name: /Site coverage/ })
    expect(within(metrics).getByText(/· 1 building$/)).toBeVisible()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Constraints' }))
    const constraints = screen.getByRole('region', { name: 'Envelope constraints' })
    expect(within(constraints).queryByRole('button', { name: /Hidden wing/ })).not.toBeInTheDocument()
    await user.click(within(constraints).getByRole('button', { name: /Visible wing.*outside the setback/ }))
    expect(screen.getByRole('tab', { name: 'Constraints' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'Model' }))
    expect(screen.getByLabelText('Name')).toHaveValue('Visible wing')
    expect(screen.getByLabelText('Base elevation')).toHaveValue('0.00')
    await user.click(screen.getByRole('checkbox', { name: 'Visible' }))
    expect(screen.getByText('Draw a mass to see metrics.')).toBeVisible()
  })

  it('keeps the default demo sun and updates scene lighting from Sun presets', async () => {
    const state = vi.spyOn(solar, 'sunState')
    renderStudio()
    expect(state.mock.lastCall?.[0]).toEqual(solar.DEMO_SUN_INSTANT)
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Sun' }))
    await user.click(screen.getByRole('button', { name: /Winter solstice/ }))
    await user.click(screen.getByRole('button', { name: 'Evening' }))
    expect(screen.getByRole('status')).toHaveTextContent('Sun below horizon')
    // Panel 02 and tile 04 share one playback clock, which survives a tab switch.
    await user.click(screen.getAllByRole('button', { name: 'Play' })[0]!)
    expect(screen.getAllByRole('button', { name: 'Pause' })).toHaveLength(2)
    await user.click(screen.getByRole('tab', { name: 'Model' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('button', { name: 'Play' })).toBeVisible()
  })

  it('does not mount Canvas without WebGL and keeps site data and inspector controls working', async () => {
    vi.mocked(webgl.detectWebGL).mockReturnValue('none')
    renderStudio()
    expect(screen.getByRole('heading', { name: '3D view unavailable' })).toBeVisible()
    expect(screen.getByText(/WebGL isn't available in this browser/)).toBeInTheDocument()
    expect(Canvas).not.toHaveBeenCalled()
    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument()
    // The rail's layers button opens the drawer at Layers; Site package is one more group.
    await userEvent.setup().click(screen.getByRole('button', { name: 'Site notes' }))
    await userEvent.setup().click(screen.getByText('Site package'))
    expect(screen.getByText('137 simplified')).toBeVisible()
    const terrain = screen.getByRole('checkbox', { name: 'Terrain' })
    await userEvent.setup().click(terrain)
    expect(terrain).not.toBeChecked()
    expect(screen.getByRole('combobox', { name: 'Render quality' })).toBeEnabled()
  })

  it.each([-5, 20])('shows the below-horizon chip only at night (%s degrees)', (elevationDeg) => {
    vi.spyOn(solar, 'sunState').mockReturnValue({ azimuthDeg: 180, elevationDeg, instant: solar.DEMO_SUN_INSTANT, localLabel: '', belowHorizon: elevationDeg <= 0, directionEnu: null })
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
    await user.click(screen.getByRole('button', { name: 'Site notes' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Render quality' }), 'low')
    expect(vi.mocked(Canvas).mock.lastCall?.[0].shadows).toBe(false)
    expect(localStorage.getItem(RENDER_QUALITY_KEY)).toBe('low')
    unmount()
    renderStudio()
    await user.click(screen.getByRole('button', { name: 'Site notes' }))
    expect(screen.getByRole('combobox', { name: 'Render quality' })).toHaveValue('low')
    expect(vi.mocked(Canvas).mock.lastCall?.[0].shadows).toBe(false)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Render quality' }), 'high')
    expect(vi.mocked(Canvas).mock.lastCall?.[0].shadows).toBe('percentage')
  })
})
