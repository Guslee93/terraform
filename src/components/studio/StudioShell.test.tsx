import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Children, isValidElement, type ComponentProps, type ReactNode } from 'react'
import { moveGesture } from '../../features/editor/interaction'
import { MassLayer } from '../../scene/MassLayer'
import { TEST_BUILDING_KEY } from './studioMode'
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
import { createScenarioRepository } from '../../features/scenarios/repository'
import { createMemoryStore } from '../../features/scenarios/store'
import { createDefaultProject } from '../../features/scenarios/project'
import { StudioShell } from './StudioShell'
import { STUDIO_GUIDE_KEY } from './StudioGuide'

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
  // These specs exercise the massing tools; the default studio is analysis-only (see below).
  localStorage.setItem(TEST_BUILDING_KEY, 'true')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('analysis-first studio', () => {
  const renderStudio = () => render(
    <MemoryRouter>
      <StudioShell site={SITES.find((entry) => entry.id === 'compact-infill')!} sitePackage={sitePackage} packageStatus="ready" packageError={null} onRetry={() => {}} />
    </MemoryRouter>,
  )

  it('opens on study-area facts and wind/noise with no massing tools, until Test a building is on', async () => {
    localStorage.clear()
    const user = userEvent.setup()
    renderStudio()
    expect(screen.getByRole('heading', { name: 'Study area' })).toBeVisible()
    const cards = screen.getByRole('group', { name: 'Analysis cards' })
    expect(within(cards).getByRole('button', { name: /^Noise/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(cards).queryByRole('button', { name: /^Draw/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Draw building' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Scenario' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Compare' })).not.toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: 'Test a building' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Draw building' })).toBeVisible()
    expect(localStorage.getItem(TEST_BUILDING_KEY)).toBe('true')
  })
})

describe('studio rendering states', () => {
  it('shows accessible loading status and motion-safe placeholders in both editor columns, then the editor', () => {
    const site = SITES.find((entry) => entry.id === 'compact-infill')!
    const view = (ready: boolean) => (
      <MemoryRouter>
        <StudioShell site={site} sitePackage={ready ? sitePackage : null} packageStatus={ready ? 'ready' : 'loading'} packageError={null} onRetry={() => {}} />
      </MemoryRouter>
    )
    const { container, rerender } = render(view(false))
    expect(screen.getByRole('status')).toHaveTextContent('Loading site package')
    expect(Canvas).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Analysis' })).not.toBeInTheDocument()
    const placeholders = container.querySelectorAll('.motion-safe\\:animate-pulse')
    expect(placeholders).toHaveLength(2)
    for (const placeholder of placeholders) {
      expect(placeholder).toHaveClass('motion-reduce:animate-none')
      expect(placeholder.closest('[aria-hidden="true"]')).not.toBeNull()
    }
    rerender(view(true))
    expect(screen.queryByText('Loading site package')).not.toBeInTheDocument()
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Analysis' })).toBeInTheDocument()
  })

  it.each([null, 'Unexpected token < in JSON at position 0'])('offers plain-language recovery for a missing or failed package (%s)', async (packageError) => {
    const site = SITES.find((entry) => entry.id === 'compact-infill')!
    const onRetry = vi.fn()
    render(<MemoryRouter><StudioShell site={site} sitePackage={null} packageStatus="error" packageError={packageError} onRetry={onRetry} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'The site model could not be loaded.' })).toBeVisible()
    expect(screen.getByText('The site package is missing or could not be read. Try again, or choose another site.')).toBeVisible()
    if (packageError) expect(screen.queryByText(packageError)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to sites' })).toHaveAttribute('href', '/#sites')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
    expect(Canvas).not.toHaveBeenCalled()
  })

  it('disables Compare for one scenario and enables it after creating another', async () => {
    const repository = createScenarioRepository(createMemoryStore(), { now: () => '2026-11-02T00:00:00Z', appVersion: 'test' })
    const { project, scenarios } = createDefaultProject('compact-infill', '2026-11-02T00:00:00Z')
    await repository.saveScenario(scenarios[0]!)
    await repository.saveProject({ ...project, scenarioIds: [project.activeScenarioId] })
    const site = SITES.find((entry) => entry.id === 'compact-infill')!
    render(<MemoryRouter><StudioShell site={site} sitePackage={sitePackage} packageStatus="ready" packageError={null} onRetry={() => {}} repository={repository} /></MemoryRouter>)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Concept A' }))
    expect(screen.getByRole('button', { name: 'Compare' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'New scenario' }))
    expect(screen.getByRole('button', { name: 'Compare' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Compare' }))
    expect(await screen.findByRole('table')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Edit B' }))
    expect(screen.getByRole('button', { name: 'Concept A' })).toBeVisible()
  })

  it('updates coverage, envelope and amber tint during a live drag, then restores them on Escape', async () => {
    const tier = factories.createTier({ id: 'ground', footprint: factories.createRectangleFootprint(10, 10), storeys: 1 })
    const volume = factories.createVolume({ id: 'moving', name: 'Moving wing', tiers: [tier] })
    const document = factories.createScenario({ siteId: 'compact-infill', volumes: [volume] })
    vi.spyOn(factories, 'createScenario').mockReturnValue(document)
    renderStudio({ ...sitePackage,
      terrain: { ...sitePackage.terrain, heights: sitePackage.terrain.heights.map((row) => row.map(() => 0)) },
      studyArea: { ...sitePackage.studyArea, polygon: [[-20, -25], [20, -25], [20, 25], [-20, 25], [-20, -25]] },
    })
    const sceneChildren = () => {
      const children = Children.toArray(vi.mocked(Canvas).mock.lastCall?.[0].children)
      const live = children.find((child) => isValidElement<{ name?: string }>(child) && child.props.name === 'live-scenario')
      if (!isValidElement<{ children: ReactNode }>(live)) throw new Error('Missing live scenario group')
      return Children.toArray(live.props.children)
    }
    const massLayer = sceneChildren().find((child) => isValidElement<ComponentProps<typeof MassLayer>>(child) && child.type === MassLayer)
    if (!isValidElement<ComponentProps<typeof MassLayer>>(massLayer)) throw new Error('Missing mass adapter')
    const dispatch = massLayer.props.dispatch
    await userEvent.setup().click(screen.getByRole('button', { name: /^Area/ }))
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
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Area/ }))
    const metrics = screen.getByRole('region', { name: 'Scenario' })
    expect(within(metrics).getByText('1 building')).toBeVisible()
    const constraints = screen.getByRole('region', { name: 'Envelope constraints' })
    expect(within(constraints).queryByRole('button', { name: /Hidden wing/ })).not.toBeInTheDocument()
    await user.click(within(constraints).getByRole('button', { name: /Visible wing is outside the setback/ }))
    // The check and the selected mass's fields are on screen together; no tab switch.
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
    await user.click(screen.getByRole('button', { name: /^Sun/ }))
    await user.click(screen.getByRole('button', { name: /Winter solstice/ }))
    await user.click(screen.getByRole('button', { name: 'Evening' }))
    expect(screen.getByRole('status')).toHaveTextContent('Sun below horizon')
    // The sun band owns the one playback clock.
    await user.click(screen.getByRole('button', { name: 'Play' }))
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
    // The viewport's Layers card opens the layer switches; Site is a Parameters group.
    await userEvent.setup().click(screen.getByRole('button', { name: /^Layers/ }))
    await userEvent.setup().click(screen.getByText('Site', { selector: 'summary span' }))
    expect(screen.getByText('137 simplified')).toBeVisible()
    const terrain = screen.getByRole('checkbox', { name: 'Terrain' })
    await userEvent.setup().click(terrain)
    expect(terrain).not.toBeChecked()
    expect(screen.getByRole('combobox', { name: 'Render quality' })).toBeEnabled()
  })

  it.each([-5, 20])('shows the below-horizon chip only at night (%s degrees)', async (elevationDeg) => {
    vi.spyOn(solar, 'sunState').mockReturnValue({ azimuthDeg: 180, elevationDeg, instant: solar.DEMO_SUN_INSTANT, localLabel: '', belowHorizon: elevationDeg <= 0, directionEnu: null })
    renderStudio()
    await userEvent.setup().click(screen.getByRole('button', { name: /^Sun/ }))
    if (elevationDeg <= 0) {
      expect(screen.getByRole('status')).toHaveTextContent('Sun below horizon')
      // The dock card shows no figure at night, only the plain state.
      expect(within(screen.getByRole('button', { name: /^Sun/ })).getByText('Sun below horizon')).toBeInTheDocument()
    } else {
      expect(screen.queryByText('Sun below horizon')).not.toBeInTheDocument()
    }
    // The method note's negation ("Not a … sun-hours assessment") is the one allowed mention.
    const claims = screen.queryAllByText(/sunlit|sun.hours/i).filter((node) => !node.textContent?.includes('Not a daylight or sun-hours assessment'))
    expect(claims).toHaveLength(0)
  })

  it('lets Enter reach a group summary instead of the editor', () => {
    renderStudio()
    const summary = screen.getByText('View', { selector: 'summary span' }).closest('summary')
    if (!summary) throw new Error('Missing View summary')
    summary.focus()
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    summary.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('shows one height and floor count for a mass whether it is visible or hidden', async () => {
    const lower = factories.createTier({ id: 'lower', footprint: factories.createRectangleFootprint(10, 10), storeys: 3, storeyHeight: 3 })
    const upper = factories.createTier({ id: 'upper', footprint: factories.createRectangleFootprint(6, 6), storeys: 2, storeyHeight: 3, baseElevation: 9 })
    const volume = factories.createVolume({ id: 'stepped', name: 'Stepped wing', tiers: [lower, upper] })
    vi.spyOn(factories, 'createScenario').mockReturnValue(factories.createScenario({ siteId: 'compact-infill', volumes: [volume] }))
    renderStudio({ ...sitePackage, terrain: { ...sitePackage.terrain, heights: sitePackage.terrain.heights.map((row) => row.map(() => 0)) } })
    const masses = screen.getByRole('list', { name: 'Masses' })
    expect(within(masses).getByText('5 floors · 15.0 m · 2 tiers')).toBeInTheDocument()
    await userEvent.setup().click(within(masses).getByRole('button', { name: /Stepped wing/ }))
    await userEvent.setup().click(screen.getByRole('checkbox', { name: 'Visible' }))
    expect(within(screen.getByRole('list', { name: 'Masses' })).getByText('5 floors · 15.0 m · 2 tiers')).toBeInTheDocument()
  })

  it('wires the dock cards to the live scenario: Area GFA matches the metrics panel', async () => {
    const tier = factories.createTier({ id: 'g', footprint: factories.createRectangleFootprint(20, 10), storeys: 3, storeyHeight: 3.2 })
    vi.spyOn(factories, 'createScenario').mockReturnValue(factories.createScenario({ siteId: 'compact-infill', volumes: [factories.createVolume({ id: 'v', name: 'Block', tiers: [tier] })] }))
    renderStudio()
    const cards = screen.getByRole('group', { name: 'Analysis cards' })
    const area = within(cards).getByRole('button', { name: /^Area/ })
    expect(area).toHaveTextContent('600 m²')
    expect(within(cards).getByRole('button', { name: /^Draw/ })).toHaveTextContent('1 mass')
    await userEvent.setup().click(area)
    expect(within(screen.getByRole('region', { name: 'Scenario' })).getByText('600')).toBeInTheDocument()
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


describe('studio guide', () => {
  it('opens on first visit, skips, remembers dismissal and reopens with focus restoration', async () => {
    const user = userEvent.setup()
    const { unmount } = renderStudio()
    expect(await screen.findByRole('region', { name: 'Studio guide' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(localStorage.getItem(STUDIO_GUIDE_KEY)).toBe('true')
    expect(screen.queryByRole('region', { name: 'Studio guide' })).not.toBeInTheDocument()
    unmount()
    renderStudio()
    const trigger = await screen.findByRole('button', { name: 'Guide' })
    expect(screen.queryByRole('region', { name: 'Studio guide' })).not.toBeInTheDocument()
    await user.click(trigger)
    expect(screen.getByRole('region', { name: 'Studio guide' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Studio guide' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('points to real controls, allows editing and finishes all three steps', async () => {
    const user = userEvent.setup()
    renderStudio()
    await screen.findByRole('region', { name: 'Studio guide' })
    await user.click(screen.getByRole('button', { name: 'Show control' }))
    expect(screen.getByRole('button', { name: 'Draw building' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Draw building' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Studio guide · 2 of 3')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Skip' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Show control' }))
    const slider = screen.getByRole('slider', { name: 'Local time' })
    expect(slider).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('15:15'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Studio guide · 3 of 3')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Skip' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Show control' }))
    expect(screen.getByRole('button', { name: 'Concept A' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Finish' }))
    expect(screen.queryByRole('region', { name: 'Studio guide' })).not.toBeInTheDocument()
    expect(localStorage.getItem(STUDIO_GUIDE_KEY)).toBe('true')
  })

  it('lets Tab leave the guide and Escape skip while a studio control is focused', async () => {
    const user = userEvent.setup()
    renderStudio()
    await screen.findByRole('region', { name: 'Studio guide' })
    await user.tab()
    expect(screen.getByRole('button', { name: 'Show control' })).toHaveFocus()
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Skip' })).toHaveFocus()
    await user.tab()
    // The pill toolbar sits in the top bar, before the guide; Tab moves on into the viewport.
    expect(screen.getByRole('button', { name: /^Layers/ })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: /^Sun/ }))
    await user.click(screen.getByRole('slider', { name: 'Local time' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Studio guide' })).not.toBeInTheDocument()
    expect(localStorage.getItem(STUDIO_GUIDE_KEY)).toBe('true')
  })

  it.each(['getter', 'methods'])('works when storage %s throws', async (failure) => {
    if (failure === 'getter') {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('Unavailable') })
    } else {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Unavailable') })
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Unavailable') })
    }
    const user = userEvent.setup()
    renderStudio()
    // Storage can't hold the switch, so turn Test a building on for this visit; the guide belongs to it.
    await user.click(screen.getByRole('button', { name: 'Test a building' }))
    await screen.findByRole('region', { name: 'Studio guide' })
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.queryByRole('region', { name: 'Studio guide' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guide' }))
    expect(screen.getByRole('region', { name: 'Studio guide' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Finish' }))
    expect(screen.queryByRole('region', { name: 'Studio guide' })).not.toBeInTheDocument()
  })
})
