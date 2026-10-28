import { afterEach, describe, expect, it, vi } from 'vitest'
import compactBuildings from '../../../public/sites/compact-infill/buildings.json'
import compactManifest from '../../../public/sites/compact-infill/manifest.json'
import compactRoads from '../../../public/sites/compact-infill/roads.json'
import compactStudyArea from '../../../public/sites/compact-infill/study-area.json'
import compactTerrain from '../../../public/sites/compact-infill/terrain.json'
import compactTrees from '../../../public/sites/compact-infill/trees.json'
import { SitePackageError } from './manifest'
import { loadSitePackage } from './package'

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Mock fetch with the real compact-infill package payloads. */
function installSuccessFetch() {
  const fetchMock = vi.fn(
    (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input)
      if (url.endsWith('/manifest.json')) return Promise.resolve(jsonResponse(compactManifest))
      if (url.endsWith('/terrain.json')) return Promise.resolve(jsonResponse(compactTerrain))
      if (url.endsWith('/buildings.json')) return Promise.resolve(jsonResponse(compactBuildings))
      if (url.endsWith('/study-area.json')) return Promise.resolve(jsonResponse(compactStudyArea))
      if (url.endsWith('/roads.json')) return Promise.resolve(jsonResponse(compactRoads))
      if (url.endsWith('/trees.json')) return Promise.resolve(jsonResponse(compactTrees))
      return Promise.reject(new Error(`unexpected URL in test fetch: ${url}`))
    },
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Mock fetch that never settles on its own and rejects only when aborted. */
function installStallingFetch() {
  const fetchMock = vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
      new Promise((_resolve, reject) => {
        const onAbort = () => reject(new DOMException('The operation was aborted.', 'AbortError'))
        if (init?.signal?.aborted) {
          onAbort()
          return
        }
        init?.signal?.addEventListener('abort', onAbort, { once: true })
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Mock fetch whose headers arrive but whose body stalls until the request is aborted. */
function installStallingBodyFetch() {
  const fetchMock = vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const body = new ReadableStream({
        start(stream) {
          init?.signal?.addEventListener(
            'abort',
            () => stream.error(new DOMException('The operation was aborted.', 'AbortError')),
            { once: true },
          )
        },
      })
      return Promise.resolve(new Response(body, { status: 200 }))
    },
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('site package request timeout', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('fails with a timeout error naming the URL when a request stalls', async () => {
    vi.useFakeTimers()
    installStallingFetch()

    const promise = loadSitePackage('compact-infill')
    const expectRejection = expect(promise).rejects.toBeInstanceOf(SitePackageError)

    vi.advanceTimersByTime(15_000)
    await expectRejection

    const error = await promise.catch((value: unknown) => value)
    expect(error instanceof SitePackageError).toBe(true)
    if (error instanceof SitePackageError) {
      expect(error.message).toContain('timed out')
      expect(error.message).toContain('compact-infill/manifest.json')
    }
  })

  it('times out when the response body stalls after the headers arrive', async () => {
    vi.useFakeTimers()
    installStallingBodyFetch()

    const promise = loadSitePackage('compact-infill')
    const settled = promise.catch((value: unknown) => value)
    await vi.advanceTimersByTimeAsync(15_000)

    const error = await settled
    expect(error instanceof SitePackageError).toBe(true)
    if (error instanceof SitePackageError) expect(error.message).toContain('timed out')
  })

  it('still honours a caller abort', async () => {
    installStallingFetch()

    const controller = new AbortController()
    const promise = loadSitePackage('compact-infill', controller.signal)

    controller.abort()

    const error = await promise.catch((value: unknown) => value)
    expect(error instanceof DOMException).toBe(true)
    if (error instanceof DOMException) {
      expect(error.name).toBe('AbortError')
    }
  })

  it('clears the timeout timer when the request succeeds', async () => {
    vi.useFakeTimers()
    installSuccessFetch()

    const sitePackage = await loadSitePackage('compact-infill')

    expect(sitePackage.manifest.id).toBe('compact-infill')
    expect(sitePackage.terrain.siteId).toBe('compact-infill')
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('optional context layers', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads roads and trees when the manifest lists them', async () => {
    installSuccessFetch()
    const sitePackage = await loadSitePackage('compact-infill')
    expect(sitePackage.roads.length).toBe(compactRoads.roads.length)
    expect(sitePackage.trees.length).toBe(compactTrees.trees.length)
  })

  it('treats a package without them as empty and never requests them', async () => {
    const fetchMock = installSuccessFetch()
    const required = Object.fromEntries(
      Object.entries(compactManifest.assetPaths).filter(([key]) => key !== 'roads' && key !== 'trees'),
    )
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve(jsonResponse({ ...compactManifest, assetPaths: required })),
    )
    const sitePackage = await loadSitePackage('compact-infill')
    expect(sitePackage.roads).toEqual([])
    expect(sitePackage.trees).toEqual([])
    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls.some((url) => url.endsWith('/roads.json') || url.endsWith('/trees.json'))).toBe(false)
  })
})