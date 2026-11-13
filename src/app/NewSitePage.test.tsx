import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImportOptions, ImportResult } from '../features/import/assemble'
import type { ImportFrame } from '../features/import/frame'
import type { PlaceResult } from '../features/import/geocode'
import { getImported } from '../features/import/session'
import type * as ImportStoreModule from '../features/import/store'
import { createMemoryImportedSiteStore } from '../features/import/store'
import { importedFixture } from '../features/import/storeFixtures'
const stores = vi.hoisted(() => ({ current: null as ReturnType<typeof createMemoryImportedSiteStore> | null }))
vi.mock('../features/import/store', async (original) => {
  const actual = await original<typeof ImportStoreModule>()
  return { ...actual, createDexieImportedSiteStore: () => ({
    get: (id: string) => stores.current!.get(id),
    put: (site: Parameters<ReturnType<typeof createMemoryImportedSiteStore>['put']>[0]) => stores.current!.put(site),
    list: () => stores.current!.list(), delete: (id: string) => stores.current!.delete(id),
  }) }
})
import { AppRoutes } from './App'
import { NewSitePage } from './NewSitePage'

const mapCalls = vi.hoisted(() => ({ flyTo: [] as unknown[], jumpTo: [] as unknown[] }))

vi.mock('maplibre-gl', () => {
  class FakeMap {
    private center = { lat: 59.9239, lng: 10.7579 }
    private zoom = 15
    private listeners: (() => void)[] = []
    private canvas = document.createElement('canvas')
    addControl() { return this }
    setPadding() { return this }
    on(_event: string, listener: () => void) { this.listeners.push(listener); return this }
    getCanvas() { return this.canvas }
    getCenter() { return this.center }
    getZoom() { return this.zoom }
    remove() {}
    private move(target: { center: [number, number]; zoom: number }) {
      this.center = { lng: target.center[0], lat: target.center[1] }
      this.zoom = target.zoom
      this.listeners.forEach((listener) => listener())
    }
    flyTo(target: { center: [number, number]; zoom: number }) { mapCalls.flyTo.push(target); this.move(target) }
    jumpTo(target: { center: [number, number]; zoom: number }) { mapCalls.jumpTo.push(target); this.move(target) }
  }
  class NavigationControl {}
  return { default: { Map: FakeMap, NavigationControl } }
})

const importSite = vi.hoisted(() => vi.fn<(frame: ImportFrame, deps: unknown, options: ImportOptions) => Promise<ImportResult>>())
vi.mock('../features/import/assemble', () => ({ importSite }))
const searchPlaces = vi.hoisted(() => vi.fn<(query: string, signal?: AbortSignal) => Promise<PlaceResult[]>>())
vi.mock('../features/import/geocode', () => ({ searchPlaces }))

function StudioStub() {
  const { importId } = useParams()
  return <p>studio {importId}</p>
}

function renderPage(entry = '/new') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/new" element={<NewSitePage />} />
        <Route path="/studio/import/:importId" element={<StudioStub />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** An import that waits until the test resolves or the signal aborts it. */
function pendingImport() {
  let resolve: (result: ImportResult) => void = () => {}
  let options: ImportOptions = {}
  importSite.mockImplementation((_frame, _deps, given) => {
    options = given
    return new Promise<ImportResult>((done, fail) => {
      resolve = done
      given.signal?.addEventListener('abort', () => fail(new DOMException('Aborted', 'AbortError')))
    })
  })
  return { resolve: (result: ImportResult) => resolve(result), options: () => options }
}

beforeEach(() => {
  stores.current = createMemoryImportedSiteStore()
  mapCalls.flyTo.length = 0
  mapCalls.jumpTo.length = 0
  importSite.mockReset()
  searchPlaces.mockReset()
})

describe('NewSitePage', () => {
  it('searches with the keyboard and moves the map to the chosen place', async () => {
    const user = userEvent.setup()
    searchPlaces.mockResolvedValue([
      { id: 'k1', label: 'Thorvald Meyers gate 40', detail: 'Oslo', latitude: 59.9225, longitude: 10.7595, source: 'kartverket' },
    ])
    renderPage()

    const search = screen.getByRole('combobox', { name: 'Search for an address or place' })
    await user.type(search, 'Thorvald')
    await screen.findByRole('option', { name: /Thorvald Meyers gate 40/ })
    expect(searchPlaces).toHaveBeenCalledTimes(1)
    expect(searchPlaces.mock.calls[0]?.[0]).toBe('Thorvald')

    await user.keyboard('{ArrowDown}{Enter}')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(search).toHaveValue('Thorvald Meyers gate 40')
    expect(mapCalls.flyTo.at(-1)).toMatchObject({ center: [10.7595, 59.9225] })
    expect(screen.getByText(/Thorvald Meyers gate 40 · Area to load — not a cadastral parcel/)).toBeInTheDocument()
  })

  it('says when search finds nothing or fails', async () => {
    const user = userEvent.setup()
    searchPlaces.mockResolvedValueOnce([])
    renderPage()
    const search = screen.getByRole('combobox', { name: 'Search for an address or place' })
    await user.type(search, 'zzzz')
    expect(await screen.findByText('No places found')).toBeInTheDocument()

    searchPlaces.mockRejectedValueOnce(new Error('503'))
    await user.type(search, 'y')
    expect(await screen.findByText(/Search is unavailable right now/)).toBeInTheDocument()
  })

  it('starts at a place passed from the landing search and frame sizes update the readout', async () => {
    const user = userEvent.setup()
    renderPage('/new?lat=60.397&lon=5.324&label=Bergen%20(Bryggen)')
    expect(screen.getByText(/Bergen \(Bryggen\) · Area to load/)).toBeInTheDocument()

    expect(screen.getByText('400 × 400 m · 16 ha')).toBeInTheDocument()
    await user.click(within(screen.getByRole('radiogroup', { name: 'Frame size' })).getByRole('radio', { name: '600 m' }))
    expect(screen.getByText('600 × 600 m · 36 ha')).toBeInTheDocument()
  })

  it('shows progress per step and cancels the import', async () => {
    const user = userEvent.setup()
    const pending = pendingImport()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Open in 3D' }))
    const progress = screen.getByRole('list', { name: 'Import progress' })
    expect(within(progress).getAllByRole('listitem')).toHaveLength(7)
    expect(within(progress).getAllByText('Waiting')).toHaveLength(7)

    pending.options().onProgress?.('tiles', 'start')
    await waitFor(() => expect(within(progress).getByText('Map tiles').closest('li')).toHaveTextContent('Loading'))
    pending.options().onProgress?.('tiles', 'done')
    await waitFor(() => expect(within(progress).getByText('Map tiles').closest('li')).toHaveTextContent('Done'))
    expect(screen.getByRole('button', { name: 'Open in 3D' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Cancel import' }))
    expect(pending.options().signal?.aborted).toBe(true)
    expect(await screen.findByText('Import cancelled')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open in 3D' })).toBeEnabled()
  })

  it('shows a progress bar that advances with the steps', async () => {
    const user = userEvent.setup()
    const pending = pendingImport()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Open in 3D' }))
    const bar = screen.getByRole('progressbar', { name: 'Import progress' })
    expect(bar).toHaveAttribute('aria-valuenow', '0')
    pending.options().onProgress?.('tiles', 'start')
    await waitFor(() => expect(bar).toHaveAttribute('aria-valuenow', '7'))
    pending.options().onProgress?.('tiles', 'done')
    await waitFor(() => expect(bar).toHaveAttribute('aria-valuenow', '14'))
  })

  it('restores the frame size from the link', async () => {
    renderPage('/new?lat=59.9225&lon=10.7595&label=Nypevegen%208&size=600')
    expect(screen.getByText('600 × 600 m · 36 ha')).toBeInTheDocument()
    expect(within(screen.getByRole('radiogroup', { name: 'Frame size' })).getByRole('radio', { name: '600 m' })).toBeChecked()
  })

  it('shows failures in an alert with a retry', async () => {
    const user = userEvent.setup()
    importSite.mockRejectedValueOnce(new Error('OpenFreeMap tile 14/1/1: HTTP 503'))
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Open in 3D' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('HTTP 503')

    pendingImport()
    await user.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(importSite).toHaveBeenCalledTimes(2)
  })

  it('waits for saving before navigating', async () => {
    const user = userEvent.setup()
    let finish: () => void = () => {}
    const store = stores.current!
    const put = store.put.bind(store)
    vi.spyOn(store, 'put').mockImplementation(async (site) => {
      await new Promise<void>((resolve) => { finish = resolve })
      await put(site)
    })
    importSite.mockImplementation(async (frame) => ({ sitePackage: importedFixture(frame.id).sitePackage, warnings: [], timings: { tiles: 0, buildings: 0, water: 0, context: 0, terrain: 0, roofs: 0, assemble: 0 } }))
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Open in 3D' }))
    await waitFor(() => expect(store.put).toHaveBeenCalled())
    expect(screen.queryByText(/^studio import-/)).not.toBeInTheDocument()
    finish()
    expect(await screen.findByText(/^studio import-/)).toBeInTheDocument()
  })

  it.each(['quota', 'unavailable'] as const)('offers one-session opening after a %s failure', async (kind) => {
    const user = userEvent.setup()
    stores.current!.failNext = kind
    importSite.mockImplementation(async (frame) => ({ sitePackage: importedFixture(frame.id).sitePackage, warnings: [], timings: { tiles: 0, buildings: 0, water: 0, context: 0, terrain: 0, roofs: 0, assemble: 0 } }))
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Open in 3D' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(`This browser could not save the site (${kind}). You can still open it once.`)
    expect(await stores.current!.list()).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Open without saving' }))
    expect(await screen.findByText(/^studio import-/)).toBeInTheDocument()
  })

  it('stores a successful import and opens it in the studio', async () => {
    const user = userEvent.setup()
    const pending = pendingImport()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Open in 3D' }))
    const frame = importSite.mock.calls[0]?.[0]
    expect(frame).toMatchObject({ latitude: 59.9239, longitude: 10.7579, sizeMetres: 400, title: 'Oslo (Grünerløkka)' })
    expect(frame?.id).toMatch(/^import-[a-z0-9]+$/)

    const sitePackage = importedFixture(frame?.id).sitePackage
    pending.resolve({ sitePackage, warnings: [{ code: 'roofs-flat', message: 'Roofs are flat.' }], timings: { tiles: 0, buildings: 0, water: 0, context: 0, terrain: 0, roofs: 0, assemble: 0 } })

    expect(await screen.findByText(`studio ${frame?.id}`)).toBeInTheDocument()
    const stored = await getImported(frame?.id)
    if (!stored || 'status' in stored) throw new Error('Expected readable site')
    expect(stored?.summary).toMatchObject({ title: 'Oslo (Grünerløkka)', dataStatus: 'user-import', notices: ['Roofs are flat.'] })
    expect(stored?.sitePackage).toEqual(sitePackage)
  })
})

describe('imported studio route', () => {
  it('explains when an imported site is gone after a reload', async () => {
    render(
      <MemoryRouter initialEntries={['/studio/import/import-missing']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: 'This imported site is no longer available' }, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Import it again' })).toHaveAttribute('href', '/new')
  })
})
