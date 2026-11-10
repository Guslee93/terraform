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
import { parseBuildings, parseStudyArea, parseTerrain } from '../../features/sites/package'
import { SITES } from '../../features/sites/siteCatalog'
import { moveGesture } from '../../features/editor/interaction'
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
function draw() {
  act(() => scene().dispatch({ type: 'setTool', tool: 'draw' }))
  for (const point of [[0, 0], [20, 0], [20, 20], [0, 20]] as const) act(() => scene().dispatch({ type: 'pointerDown', point, elevation: 0 }))
  act(() => scene().dispatch({ type: 'key', key: 'Enter' }))
}
beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  vi.mocked(ViewportCanvas).mockClear()
})
afterEach(() => vi.unstubAllGlobals())

it('starts with only Sun/Wind/Noise and automatic rendering; block tools are opt-in', async () => {
  mount()
  const cards = within(screen.getByRole('group', { name: 'Analysis cards' }))
  expect(cards.getAllByRole('button')).toHaveLength(3)
  expect(scene().renderPreference).toBe('auto')
  expect(screen.queryByRole('navigation', { name: 'Studio tools' })).not.toBeInTheDocument()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Add a block' }))
  expect(screen.getByRole('button', { name: 'Draw building' })).toBeVisible()
  expect(cards.getByRole('button', { name: /^Blocks/ })).toHaveTextContent('0')
  for (const label of ['Compare', 'Guide', 'Saved', 'Design check', 'Study area', 'Data notes', 'Render quality']) expect(screen.queryByText(label)).not.toBeInTheDocument()
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

it('keeps loading and retry states', () => {
  const view = render(<MemoryRouter><StudioShell {...props} sitePackage={null} packageStatus="loading" /></MemoryRouter>)
  expect(screen.getByRole('status')).toHaveTextContent('Loading site package')
  view.rerender(<MemoryRouter><StudioShell {...props} sitePackage={null} packageStatus="error" /></MemoryRouter>)
  expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible()
})
