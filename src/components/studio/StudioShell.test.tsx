import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import compactManifest from '../../../public/sites/compact-infill/manifest.json'
import compactTerrain from '../../../public/sites/compact-infill/terrain.json'
import compactBuildings from '../../../public/sites/compact-infill/buildings.json'
import compactStudyArea from '../../../public/sites/compact-infill/study-area.json'
import { parseSiteManifest } from '../../features/sites/manifest'
import type { SitePackage } from '../../features/sites/package'
import { parseBuildings, parseStudyArea, parseTerrain } from '../../features/sites/package'
import { SITES } from '../../features/sites/siteCatalog'
import { SUN_HOURS_DISCLAIMER } from '../../features/analysis/sunHours'
import { ROOF_SOLAR_DISCLAIMER } from '../../features/analysis/roofSolar'
import { FACADE_SUN_DISCLAIMER } from '../../features/analysis/facadeSun'
import { VSC_COLOUR, VSC_DISCLAIMER } from '../../features/analysis/vsc'
import { moveGesture } from '../../features/editor/interaction'
import { removeVolume } from '../../features/editor/commands'
import { ViewportCanvas } from '../../scene/ViewportCanvas'
import { StudioShell } from './StudioShell'

vi.mock('../../scene/ViewportCanvas', () => ({ ViewportCanvas: vi.fn(() => <div>Viewport</div>) }))
const sitePackage = {
  manifest: parseSiteManifest(compactManifest),
  terrain: parseTerrain(compactTerrain),
  buildings: parseBuildings(compactBuildings),
  studyArea: parseStudyArea(compactStudyArea),
  roads: [], trees: [], landcover: [],
}


const props = { site: SITES.find((s) => s.id === 'compact-infill')!, sitePackage, packageStatus: 'ready' as const, packageError: null, onRetry: vi.fn() }
const mount = () => render(<MemoryRouter><StudioShell {...props} /></MemoryRouter>)
function scene(): ComponentProps<typeof ViewportCanvas> {
  const call = vi.mocked(ViewportCanvas).mock.lastCall
  if (!call) throw new Error('No viewport')
  return call[0]
}
function draw(points: readonly (readonly [number, number])[] = [[0, 0], [20, 0], [20, 20], [0, 20]]) {
  act(() => scene().dispatch({ type: 'setTool', tool: 'draw' }))
  for (const point of points) act(() => scene().dispatch({ type: 'pointerDown', point, elevation: 0 }))
  act(() => scene().dispatch({ type: 'key', key: 'Enter' }))
}
beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  vi.mocked(ViewportCanvas).mockClear()
})
afterEach(() => vi.unstubAllGlobals())

it('starts with only Sun/Wind/Noise and automatic rendering; block tools are opt-in', async () => {
  mount()
  // One card per analysis, in the Parameters panel (ADR-0026); no bottom dock.
  for (const id of ['sun', 'wind', 'noise']) expect(screen.getByTestId(`analysis-card-${id}`)).toBeVisible()
  expect(screen.queryByRole('region', { name: 'Analysis' })).not.toBeInTheDocument()
  expect(scene().renderPreference).toBe('auto')
  expect(screen.queryByRole('navigation', { name: 'Studio tools' })).not.toBeInTheDocument()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Add a block' }))
  expect(screen.getByRole('button', { name: 'Draw building' })).toBeVisible()
  // The block count is on the Selected block group, not on a card of its own.
  expect(screen.getByText('0 blocks')).toBeVisible()
  for (const label of ['Compare', 'Guide', 'Saved', 'Design check', 'Study area', 'Data notes', 'Render quality']) expect(screen.queryByText(label)).not.toBeInTheDocument()
})

it('draws ground sun hours, recomputes when a block is added and returns to shadows', async () => {
  mount()
  const user = userEvent.setup()
  await user.click(screen.getByTestId('analysis-card-sun'))
  const control = screen.getAllByRole('group', { name: 'Sun analysis' })[0]
  if (!control) throw new Error('Missing sun analysis control')
  await user.click(within(control).getByRole('button', { name: 'Sun hours' }))
  expect(within(control).getByRole('button', { name: 'Sun hours' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getAllByText(SUN_HOURS_DISCLAIMER).length).toBeGreaterThan(0)
  const before = scene().climate?.cells.length ?? 0
  expect(before).toBeGreaterThan(0)
  await user.click(screen.getByRole('button', { name: 'Add a block' }))
  // Draw over an empty part of the study area so the cells inside it were assessed before.
  draw([[-20, 75], [0, 75], [0, 95], [-20, 95]])
  expect(scene().windBuildings).toHaveLength((sitePackage.buildings.buildings.length) + 1)
  expect(scene().climate?.cells.length ?? 0).toBeLessThan(before)
  const volume = scene().editor.history.document.volumes[0]
  if (!volume) throw new Error('No drawn volume')
  const beforeMove = (scene().climate?.cells ?? []).map((cell) => `${cell.x},${cell.y}`).join(';')
  act(() => scene().dispatch({ type: 'pointerDown', point: [0, 0], gesture: moveGesture(volume.id) }))
  act(() => scene().dispatch({ type: 'pointerMove', point: [30, 0] }))
  act(() => scene().dispatch({ type: 'pointerUp' }))
  const afterMove = (scene().climate?.cells ?? []).map((cell) => `${cell.x},${cell.y}`).join(';')
  expect(afterMove).not.toBe(beforeMove)
  act(() => scene().dispatch({ type: 'command', command: removeVolume(volume.id) }))
  expect(scene().climate?.cells.length ?? 0).toBe(before)
  await user.click(within(control).getByRole('button', { name: 'Shadows' }))
  expect(scene().climate).toBeNull()
})
it('offers roof solar with its upper-bound disclaimer and no invented value while computing', async () => {
  mount()
  const user = userEvent.setup()
  await user.click(screen.getByTestId('analysis-card-sun'))
  const control = screen.getAllByRole('group', { name: 'Sun analysis' })[0]
  if (!control) throw new Error('Missing sun analysis control')
  await user.click(within(control).getByRole('button', { name: 'Roof solar' }))
  expect(screen.getAllByText(ROOF_SOLAR_DISCLAIMER).length).toBeGreaterThan(0)
  // jsdom has no Worker: the card says it is computing rather than showing a placeholder number.
  expect(within(screen.getByRole('region', { name: 'Sun card' })).getByText(/Computing roof solar/)).toBeVisible()
})

it('colours the façades of a user block and removes the layer in Shadows', async () => {
  mount()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Add a block' }))
  draw()
  await user.click(screen.getByTestId('analysis-card-sun'))
  const control = screen.getAllByRole('group', { name: 'Sun analysis' })[0]
  if (!control) throw new Error('Missing sun analysis control')
  await user.click(within(control).getByRole('button', { name: 'Façade' }))
  expect(screen.getAllByText(FACADE_SUN_DISCLAIMER).length).toBeGreaterThan(0)
  expect(scene().facade?.values.length ?? 0).toBeGreaterThan(0)
  const volume = scene().editor.history.document.volumes[0]
  if (!volume) throw new Error('No drawn volume')
  const beforeMove = scene().facade?.values[0]?.sample.p[0]
  act(() => scene().dispatch({ type: 'pointerDown', point: [0, 0], gesture: moveGesture(volume.id) }))
  act(() => scene().dispatch({ type: 'pointerMove', point: [20, 0] }))
  act(() => scene().dispatch({ type: 'pointerUp' }))
  expect(scene().facade?.values[0]?.sample.p[0]).not.toBe(beforeMove)
  act(() => scene().dispatch({ type: 'command', command: removeVolume(volume.id) }))
  expect(scene().facade).toBeNull()
  await user.click(within(control).getByRole('button', { name: 'Shadows' }))
  expect(scene().facade).toBeNull()
})

it('colours the same façades with VSC and shows the daylight disclaimer', async () => {
  mount()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Add a block' }))
  draw()
  await user.click(screen.getByTestId('analysis-card-sun'))
  const control = screen.getAllByRole('group', { name: 'Sun analysis' })[0]
  if (!control) throw new Error('Missing sun analysis control')
  await user.click(within(control).getByRole('button', { name: 'VSC' }))
  expect(screen.getAllByText(VSC_DISCLAIMER).length).toBeGreaterThan(0)
  const first = scene().facade?.values[0]
  expect(first).toBeDefined()
  expect(Object.values(VSC_COLOUR)).toContain(first?.colour)
})

it('feeds new and preview blocks into analysis, cancels a drag and commits it as one undo entry', async () => {

  mount()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Add a block' }))
  const initial = scene().windBuildings?.length ?? 0
  draw()
  expect(scene().windBuildings).toHaveLength(initial + 1)
  const volume = scene().editor.history.document.volumes[0]!
  const gesture = moveGesture(volume.id)
  const before = scene().editor.history.undoStack.length
  act(() => scene().dispatch({ type: 'pointerDown', point: [0, 0], gesture }))
  act(() => scene().dispatch({ type: 'pointerMove', point: [30, 0] }))
  expect(scene().windBuildings?.at(-1)?.footprint[0]).toEqual([30, 0])
  act(() => scene().dispatch({ type: 'key', key: 'Escape' }))
  expect(scene().windBuildings?.at(-1)?.footprint[0]).toEqual([0, 0])
  expect(scene().editor.history.undoStack).toHaveLength(before)
  act(() => scene().dispatch({ type: 'pointerDown', point: [0, 0], gesture }))
  act(() => scene().dispatch({ type: 'pointerMove', point: [20, 0] }))
  act(() => scene().dispatch({ type: 'pointerUp' }))
  expect(scene().editor.history.undoStack).toHaveLength(before + 1)
  act(() => scene().dispatch({ type: 'undo' }))
  expect(scene().windBuildings?.at(-1)?.footprint[0]).toEqual([0, 0])
})

it('keeps blocks when tools are hidden but clears them on a fresh studio session', async () => {
  const first = mount()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Add a block' }))
  draw()
  await user.click(screen.getByRole('button', { name: 'Add a block' }))
  expect(scene().editor.history.document.volumes).toHaveLength(1)
  first.unmount()
  mount()
  expect(scene().editor.history.document.volumes).toHaveLength(0)
})

it('sends Back to the frame step for an imported site and to the site list for a curated one', () => {
  const curated = mount()
  expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/#sites')
  curated.unmount()

  const imported = { ...props.site, id: 'import-test', title: 'Nypevegen 8', dataStatus: 'user-import' as const }
  // The study area of an import is the frame inset 15 % on every side: 280 m for a 400 m frame.
  const importedPackage = {
    ...sitePackage,
    studyArea: { ...sitePackage.studyArea, polygon: [[-140, -140], [140, -140], [140, 140], [-140, 140], [-140, -140]] as SitePackage['studyArea']['polygon'] },
  }
  render(<MemoryRouter><StudioShell {...props} site={imported} sitePackage={importedPackage} /></MemoryRouter>)
  const href = screen.getByRole('link', { name: 'Back' }).getAttribute('href') ?? ''
  expect(href.startsWith('/new?')).toBe(true)
  const params = new URLSearchParams(href.split('?')[1] ?? '')
  expect(params.get('lat')).toBe(String(sitePackage.manifest.location.latitude))
  expect(params.get('lon')).toBe(String(sitePackage.manifest.location.longitude))
  expect(params.get('label')).toBe('Nypevegen 8')
  expect(params.get('size')).toBe('400')
})

it('keeps loading and retry states', () => {
  const view = render(<MemoryRouter><StudioShell {...props} sitePackage={null} packageStatus="loading" /></MemoryRouter>)
  expect(screen.getByRole('status')).toHaveTextContent('Loading site package')
  view.rerender(<MemoryRouter><StudioShell {...props} sitePackage={null} packageStatus="error" /></MemoryRouter>)
  expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible()
})
