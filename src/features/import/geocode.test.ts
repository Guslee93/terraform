import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { searchKartverket, searchPhoton, searchPlaces } from './geocode'
import kartverketAdresseFixture from './__fixtures__/kartverket-adresse.json'
import photonGrunerlokkaFixture from './__fixtures__/photon-grunerlokka.json'

type JsonResponse = {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<unknown>
}

/** A fetch response-like object shaped like the parts the clients rely on. */
function jsonResponse(body: unknown, status = 200): Promise<JsonResponse> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
  })
}

type FetchMock = ReturnType<typeof vi.fn>

/** Stubs the global fetch, routing requests to per-provider recorded responses. */
function stubFetchRoute(kartverketBody: unknown, photonBody: unknown): FetchMock {
  const mockFetch = vi.fn((input: RequestInfo | URL) => {
    const url = requestUrl(input)
    if (url.includes('ws.geonorge.no/adresser')) return jsonResponse(kartverketBody)
    if (url.includes('photon.komoot.io')) return jsonResponse(photonBody)
    return jsonResponse({ error: 'unexpected URL' }, 500)
  })
  vi.stubGlobal('fetch', mockFetch)
  return mockFetch
}

function photonFeature(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'Feature',
    properties: { osm_type: 'N', osm_id: 1, name: 'Test place', city: 'Oslo', country: 'Norge' },
    geometry: { type: 'Point', coordinates: [10.75, 59.92] },
    ...overrides,
  }
}

function lastFetchUrl(mock: FetchMock): string {
  const call = mock.mock.calls.at(-1)
  return String(call?.[0] ?? '')
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

describe('searchPhoton', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('parses the recorded Grünerløkka response into validated PlaceResults', async () => {
    const mockFetch = stubFetchRoute(null, photonGrunerlokkaFixture)

    const results = await searchPhoton('Grünerløkka Oslo')

    expect(results).toHaveLength(5)
    const first = results[0]
    expect(first).toMatchObject({
      id: 'photon:R:1279942',
      label: 'Grünerløkka',
      source: 'photon',
    })
    expect(first?.latitude).toBeCloseTo(59.9254713, 6)
    expect(first?.longitude).toBeCloseTo(10.7774212, 6)
    expect(first?.detail).toContain('Oslo')
    expect(first?.detail).toContain('Norge')

    const url = lastFetchUrl(mockFetch)
    expect(url).toContain('q=Gr%C3%BCnerl%C3%B8kka%20Oslo')
    expect(url).toContain('limit=8')
    expect(url).toContain('lang=en')
    expect(url).toContain('bbox=4,54,32,71')
  })

  it('labels street addresses from street + housenumber when there is no name', async () => {
    stubFetchRoute(null, {
      features: [
        photonFeature({
          properties: {
            osm_type: 'N',
            osm_id: 7,
            street: 'Fossveien',
            housenumber: '24',
            district: 'Grünerløkka',
            city: 'Oslo',
            country: 'Norge',
          },
        }),
      ],
    })

    const results = await searchPhoton('Fossveien 24')

    expect(results[0]).toMatchObject({
      id: 'photon:N:7',
      label: 'Fossveien 24',
      detail: 'Grünerløkka, Oslo, Norge',
    })
  })

  it('drops malformed features instead of failing the lookup', async () => {
    stubFetchRoute(null, {
      features: [
        photonFeature(),
        photonFeature({ geometry: { type: 'Polygon', coordinates: [[[0, 0]]] } }),
        photonFeature({ geometry: { type: 'Point', coordinates: [10.75, 95] } }),
        photonFeature({ geometry: { type: 'Point', coordinates: [10.75, 59.9, 0] } }),
        photonFeature({ properties: {} }),
        photonFeature({ geometry: null }),
        null,
        'nonsense',
      ],
    })

    const results = await searchPhoton('whatever')

    expect(results).toHaveLength(1)
  })

  it('returns [] for an empty query without making a request', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    await expect(searchPhoton('   ')).resolves.toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })
describe('searchKartverket', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('parses the recorded address response into validated PlaceResults', async () => {
    const mockFetch = stubFetchRoute(kartverketAdresseFixture, null)

    const results = await searchKartverket('Thorvald Meyers gate 40 Oslo')

    expect(results).toHaveLength(2)
    const first = results[0]
    expect(first).toMatchObject({
      id: 'kartverket:285829723',
      label: 'Thorvald Meyers gate 40A',
      detail: 'OSLO',
      source: 'kartverket',
    })
    expect(first?.latitude).toBeCloseTo(59.92371913549509, 8)
    expect(first?.longitude).toBeCloseTo(10.75944665075892, 8)

    const url = lastFetchUrl(mockFetch)
    expect(url).toContain('treffPerSide=8')
    expect(url).toContain('sok=Thorvald%20Meyers%20gate%2040%20Oslo')
  })

  it('drops malformed addresses instead of failing the lookup', async () => {
    stubFetchRoute(
      {
        adresser: [
          kartverketAdresseFixture.adresser[0],
          { adressetekst: 'Only a label', poststed: 'OSLO' },
          { adressetekst: '', adresseid: '1', representasjonspunkt: { lat: 59.9, lon: 10.7 } },
          { adressetekst: 'Bad coords', adresseid: '2', representasjonspunkt: { lat: 95, lon: 10.7 } },
          { adressetekst: 'No id', representasjonspunkt: { lat: 59.9, lon: 10.7 } },
        ],
      },
      null,
    )

    const results = await searchKartverket('whatever')

    expect(results).toHaveLength(1)
    expect(results[0]?.id).toBe('kartverket:285829723')
  })

  it('returns [] for an empty query without making a request', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    await expect(searchKartverket('')).resolves.toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
describe('searchPlaces', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('returns [] for empty and whitespace queries without a request', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    await expect(searchPlaces('')).resolves.toEqual([])
    await expect(searchPlaces('   ')).resolves.toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('keeps Kartverket results first, drops Photon results within 25 m, caps at 8', async () => {
    const nearDuplicate = photonFeature({
      properties: { osm_type: 'N', osm_id: 100, name: 'Near duplicate', city: 'Oslo', country: 'Norge' },
      geometry: { type: 'Point', coordinates: [10.75944665075892, 59.92371913549509 + 0.00001] },
    })
    const farFeature = photonFeature({
      properties: { osm_type: 'N', osm_id: 101, name: 'Far away', city: 'Oslo', country: 'Norge' },
      geometry: { type: 'Point', coordinates: [10.77, 59.93] },
    })
    stubFetchRoute(kartverketAdresseFixture, { features: [nearDuplicate, farFeature] })

    const results = await searchPlaces('Thorvald Meyers gate 40 Oslo')

    expect(results.map((result) => result.source)).toEqual(['kartverket', 'photon'])
    expect(results[0]?.label).toBe('Thorvald Meyers gate 40A')
    expect(results[1]?.label).toBe('Far away')

    // Cap at 8: nine well-spaced Photon hits, no Kartverket hits.
    stubFetchRoute(
      { adresser: [] },
      {
        features: Array.from({ length: 9 }, (_, index) =>
          photonFeature({
            properties: {
              osm_type: 'N',
              osm_id: 200 + index,
              name: `Place ${index}`,
              city: 'Oslo',
              country: 'Norge',
            },
            geometry: { type: 'Point', coordinates: [10 + index * 0.001, 59.9] },
          }),
        ),
      },
    )

    const capped = await searchPlaces('many')
    expect(capped).toHaveLength(8)
  })

  it('keeps results from the working source when the other fails', async () => {
    const mockFetch = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input)
      if (url.includes('photon.komoot.io')) return jsonResponse(photonGrunerlokkaFixture)
      return Promise.reject(new Error('kartverket down'))
    })
    vi.stubGlobal('fetch', mockFetch)

    const photonOnly = await searchPlaces('Grünerløkka Oslo')
    expect(photonOnly.length).toBeGreaterThan(0)
    expect(photonOnly.every((result) => result.source === 'photon')).toBe(true)

    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = requestUrl(input)
      if (url.includes('ws.geonorge.no/adresser')) return jsonResponse(kartverketAdresseFixture)
      return Promise.reject(new Error('photon down'))
    })

    const kartverketOnly = await searchPlaces('Thorvald Meyers gate 40 Oslo')
    expect(kartverketOnly.length).toBeGreaterThan(0)
    expect(kartverketOnly.every((result) => result.source === 'kartverket')).toBe(true)
  })

  it('throws when both sources fail', async () => {
    const mockFetch = vi.fn(() => Promise.reject(new Error('network down')))
    vi.stubGlobal('fetch', mockFetch)

    await expect(searchPlaces('Oslo')).rejects.toThrow('Both geocoders failed')
  })

  it('honours a caller-supplied abort signal', async () => {
    const mockFetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal
          if (signal?.aborted) {
            reject(new Error('aborted'))
            return
          }
          signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
        }),
    )
    vi.stubGlobal('fetch', mockFetch)

    const controller = new AbortController()
    const pending = searchPhoton('Oslo', controller.signal)
    controller.abort()
    await expect(pending).rejects.toThrow('aborted')

    const preAborted = new AbortController()
    preAborted.abort()
    await expect(searchPhoton('Oslo', preAborted.signal)).rejects.toThrow('aborted')
  })

  it('times out stalled requests after 8 seconds', async () => {
    vi.useFakeTimers()
    const mockFetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal
          if (signal?.aborted) {
            reject(new Error('aborted'))
            return
          }
          signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
        }),
    )
    vi.stubGlobal('fetch', mockFetch)

    const pending = searchPlaces('Oslo')
    // Attach the rejection handler before the timers fire so the abort rejection
    // is never observed as unhandled.
    const outcome = expect(pending).rejects.toThrow('Both geocoders failed')
    await vi.advanceTimersByTimeAsync(8_000)

    await outcome
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
})