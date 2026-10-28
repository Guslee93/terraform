/**
 * Geocoder clients for the site-import pickup (D21).
 *
 * Photon (komoot) and the Kartverket Adresse-API run in the browser against live
 * keyless endpoints. Every request has an 8 s timeout and honours the caller's
 * AbortSignal; every response field is validated and malformed entries are dropped
 * rather than failing the whole lookup.
 */
export type GeocoderSource = 'photon' | 'kartverket'

export type PlaceResult = {
  id: string
  label: string
  detail: string
  latitude: number
  longitude: number
  source: GeocoderSource
}

const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/'
const KARTVERKET_ENDPOINT = 'https://ws.geonorge.no/adresser/v1/sok'
const REQUEST_TIMEOUT_MS = 8_000
const NORDIC_BBOX = '4,54,32,71'
/** Results closer than this to an earlier result are dropped (Kartverket wins). */
const DEDUPE_DISTANCE_M = 25
const MAX_RESULTS = 8

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  // Narrowed to a non-null, non-array object; TS needs one cast to give it an index
  // signature (same boundary pattern as src/features/sites/package.ts).
  return value as Record<string, unknown>
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asPosition(latitude: unknown, longitude: unknown): { latitude: number; longitude: number } | null {
  const lat = asFiniteNumber(latitude)
  const lon = asFiniteNumber(longitude)
  if (lat === null || lon === null) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { latitude: lat, longitude: lon }
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const onOuterAbort = () => controller.abort()
  if (signal?.aborted) {
    controller.abort()
  } else {
    signal?.addEventListener('abort', onOuterAbort, { once: true })
  }
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`Geocoder request failed (HTTP ${response.status})`)
    }
    return await response.json()
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onOuterAbort)
  }
}

function parsePhotonFeature(feature: unknown): PlaceResult | null {
  const record = asRecord(feature)
  if (!record) return null
  const geometry = asRecord(record.geometry)
  if (!geometry || geometry.type !== 'Point') return null
  const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : null
  if (!coordinates || coordinates.length !== 2) return null
  const position = asPosition(coordinates[1], coordinates[0])
  if (!position) return null

  const properties = asRecord(record.properties)
  if (!properties) return null
  const osmId = properties.osm_id
  const osmType = asTrimmedString(properties.osm_type)
  if (osmType === null || (typeof osmId !== 'string' && typeof osmId !== 'number')) return null
  if (typeof osmId === 'string' && osmId.trim() === '') return null

  const name = asTrimmedString(properties.name)
  const street = asTrimmedString(properties.street)
  const housenumber = asTrimmedString(properties.housenumber)
  const label = name ?? (street ? (housenumber ? `${street} ${housenumber}` : street) : null)
  if (!label) return null

  const detail = [properties.district, properties.city, properties.country]
    .filter((part): part is string => typeof part === 'string' && part.trim() !== '')
    .map((part) => part.trim())
    .join(', ')

  return {
    id: `photon:${osmType}:${osmId}`,
    label,
    detail,
    latitude: position.latitude,
    longitude: position.longitude,
    source: 'photon',
  }
}

function parsePhoton(response: unknown): PlaceResult[] {
  const root = asRecord(response)
  if (!root) return []
  if (!Array.isArray(root.features)) return []
  const results: PlaceResult[] = []
  for (const feature of root.features) {
    const parsed = parsePhotonFeature(feature)
    if (parsed) results.push(parsed)
  }
  return results
}

function parseKartverketAddress(address: unknown): PlaceResult | null {
  const record = asRecord(address)
  if (!record) return null
  const label = asTrimmedString(record.adressetekst)
  if (!label) return null
  const point = asRecord(record.representasjonspunkt)
  if (!point) return null
  const position = asPosition(point.lat, point.lon)
  if (!position) return null

  const adresseId = asTrimmedString(record.adresseid)
  if (adresseId === null) return null

  return {
    id: `kartverket:${adresseId}`,
    label,
    detail: asTrimmedString(record.poststed) ?? '',
    latitude: position.latitude,
    longitude: position.longitude,
    source: 'kartverket',
  }
}

function parseKartverket(response: unknown): PlaceResult[] {
  const root = asRecord(response)
  if (root === null) return []
  const list = Array.isArray(response) ? response : Array.isArray(root.adresser) ? root.adresser : null
  if (!list) return []
  const results: PlaceResult[] = []
  for (const address of list) {
    const parsed = parseKartverketAddress(address)
    if (parsed) results.push(parsed)
  }
  return results
}

export async function searchPhoton(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const trimmed = query.trim()
  if (trimmed === '') return []
  const url = `${PHOTON_ENDPOINT}?q=${encodeURIComponent(trimmed)}&limit=8&lang=en&bbox=${NORDIC_BBOX}`
  return parsePhoton(await fetchJson(url, signal))
}

export async function searchKartverket(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const trimmed = query.trim()
  if (trimmed === '') return []
  const url = `${KARTVERKET_ENDPOINT}?sok=${encodeURIComponent(trimmed)}&treffPerSide=8`
  return parseKartverket(await fetchJson(url, signal))
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const trimmed = query.trim()
  if (trimmed === '') return []

  const [kartverketOutcome, photonOutcome] = await Promise.allSettled([
    searchKartverket(trimmed, signal),
    searchPhoton(trimmed, signal),
  ])

  if (kartverketOutcome.status === 'rejected' && photonOutcome.status === 'rejected') {
    throw new Error('Both geocoders failed; no place results available', {
      cause: [kartverketOutcome.reason, photonOutcome.reason],
    })
  }

  const kartverket = kartverketOutcome.status === 'fulfilled' ? kartverketOutcome.value : []
  const photon = photonOutcome.status === 'fulfilled' ? photonOutcome.value : []

  const accepted: PlaceResult[] = []
  for (const result of [...kartverket, ...photon]) {
    if (accepted.length >= MAX_RESULTS) break
    if (accepted.some((existing) => distanceMetres(existing, result) <= DEDUPE_DISTANCE_M)) {
      continue
    }
    accepted.push(result)
  }
  return accepted
}

function distanceMetres(a: PlaceResult, b: PlaceResult): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const latA = toRadians(a.latitude)
  const latB = toRadians(b.latitude)
  const dLat = latB - latA
  const dLon = toRadians(b.longitude - a.longitude)
  const haversine =
    Math.sin(dLat / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin(dLon / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(haversine)))
}