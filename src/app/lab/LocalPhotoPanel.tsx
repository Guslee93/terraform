import { useEffect, useMemo, useState } from 'react'
import { labelClass, rangeClass, segmentClass, segmentGroupClass, textButtonSmClass } from '../../components/ui/controls'
import type { Extent } from '../../scene/photoPlacement'
import { DEFAULT_ALIGNMENT, findLocalPhoto, greyPixels, loadAlignment, photoRect, saveAlignment, type PhotoAlignment } from './localPhoto'
import { SENTINEL_CREDIT, sentinelRequest } from './sentinelGround'
import { MAPTILER_COPYRIGHT_URL, MAPTILER_CREDIT, mapTilerTileUrl, tilePlan } from './tileGround'

/** Longest side of the greyed photo canvas, px (GPU texture limits on every reasonable machine). */
const MAX_SIDE_PX = 4096

export const LOCAL_PHOTO_CREDIT = 'Aerial photo © Norge i bilder (Kartverket, Geovekst) — local preview only, not published'

/**
 * Finds the owner's local aerial photo for a site, keeps its alignment (remembered in this
 * browser), and returns the greyed canvas + ground rectangle for ViewportCanvas.groundPhoto.
 */
export function useLocalPhoto(siteId: string, tileWidthM: number) {
  const [url, setUrl] = useState<string | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [alignment, setAlignmentState] = useState<PhotoAlignment>(() => loadAlignment(siteId) ?? DEFAULT_ALIGNMENT(tileWidthM))

  useEffect(() => {
    let cancelled = false
    void findLocalPhoto(siteId).then((found) => { if (!cancelled) setUrl(found) })
    return () => { cancelled = true }
  }, [siteId])

  useEffect(() => {
    if (!url) { setImage(null); return }
    const img = new Image()
    let cancelled = false
    img.onload = () => { if (!cancelled) setImage(img) }
    img.src = url
    return () => { cancelled = true }
  }, [url])

  const setAlignment = (next: PhotoAlignment) => {
    setAlignmentState(next)
    saveAlignment(siteId, next)
  }

  // Grey once per image / colour / brightness change (a few tens of ms at 4096 px).
  const canvas = useMemo(() => {
    if (!image) return null
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(image.naturalWidth, image.naturalHeight))
    const out = document.createElement('canvas')
    out.width = Math.round(image.naturalWidth * scale)
    out.height = Math.round(image.naturalHeight * scale)
    const context = out.getContext('2d')
    if (!context) return null
    context.drawImage(image, 0, 0, out.width, out.height)
    const pixels = context.getImageData(0, 0, out.width, out.height)
    greyPixels(pixels.data, alignment.keepColour, alignment.brightness)
    context.putImageData(pixels, 0, 0)
    return out
  }, [image, alignment.keepColour, alignment.brightness])

  // The local photo shows the streets itself, so the drawn street ribbons are hidden under it.
  // (`alignment.enabled` is kept for saved-data compatibility; the Ground choice replaces it.)
  const groundPhoto = useMemo(() => {
    if (!canvas || !image) return null
    return { canvas, rect: photoRect(alignment, image.naturalWidth / image.naturalHeight), hidesStreets: true }
  }, [canvas, image, alignment])

  return { found: url !== null, url, alignment, setAlignment, reset: () => setAlignment(DEFAULT_ALIGNMENT(tileWidthM)), groundPhoto }
}

/**
 * The free ground image (ADR-0041): Kartverket's Sentinel-2 cloudless mosaic over exactly the
 * terrain tile, fetched live once per site. 10 m data at 5 m/px, smoothed by the GPU's bilinear
 * filter; the drawn streets stay on top of it.
 */
export function useSentinelGround(origin: { readonly latitude: number; readonly longitude: number }, tile: Extent, active: boolean) {
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'ready' | 'failed'; canvas: HTMLCanvasElement | null }>({ status: 'idle', canvas: null })
  const { url } = useMemo(() => sentinelRequest(origin, tile), [origin, tile])

  useEffect(() => {
    if (!active) return
    let cancelled = false
    setState((previous) => (previous.canvas ? previous : { status: 'loading', canvas: null }))
    const img = new Image()
    img.crossOrigin = 'anonymous' // the WMS sends access-control-allow-origin: *
    img.onload = () => {
      if (cancelled) return
      const out = document.createElement('canvas')
      out.width = img.naturalWidth
      out.height = img.naturalHeight
      const context = out.getContext('2d')
      if (!context) { setState({ status: 'failed', canvas: null }); return }
      context.drawImage(img, 0, 0)
      setState({ status: 'ready', canvas: out })
    }
    img.onerror = () => { if (!cancelled) setState({ status: 'failed', canvas: null }) }
    img.src = url
    return () => { cancelled = true }
  }, [url, active])

  const groundPhoto = useMemo(() => (state.canvas ? { canvas: state.canvas, rect: tile, hidesStreets: false } : null), [state.canvas, tile])
  return { status: state.status, groundPhoto }
}

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY ?? ''

function loadImageOnce(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // MapTiler serves CORS headers; the canvas stays readable
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`tile failed: ${url.replace(/key=[^&]+/, 'key=…')}`))
    img.src = url
  })
}

/** Some tiles answer slowly or time out once (measured: 1 of 30 on sloped-edge); retry before giving up. */
async function loadImage(url: string, retries = 2): Promise<HTMLImageElement> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await loadImageOnce(url)
    } catch (error) {
      if (attempt >= retries) throw error
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)))
    }
  }
}

/**
 * Sharp keyed satellite ground (ADR-0041 §3): MapTiler satellite tiles fetched live by the browser
 * with the owner's key (free plan: non-commercial; on-screen credit; no server-side or committed
 * copies), stitched and cropped to exactly the terrain tile at about 0.3 m/px, longest side ≤ 4096.
 */
export function useMapTilerGround(origin: { readonly latitude: number; readonly longitude: number }, tile: Extent, active: boolean) {
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'ready' | 'failed'; canvas: HTMLCanvasElement | null }>({ status: 'idle', canvas: null })
  const plan = useMemo(() => tilePlan(origin, tile), [origin, tile])

  useEffect(() => {
    if (!active || !MAPTILER_KEY) return
    let cancelled = false
    setState((previous) => (previous.canvas ? previous : { status: 'loading', canvas: null }))
    void Promise.all(plan.tiles.map(({ x, y }) => loadImage(mapTilerTileUrl(plan.zoom, x, y, MAPTILER_KEY))))
      .then((images) => {
        if (cancelled) return
        const size = images[0]!.naturalWidth
        const columns = new Set(plan.tiles.map((t) => t.x)).size
        const rows = new Set(plan.tiles.map((t) => t.y)).size
        const mosaic = document.createElement('canvas')
        mosaic.width = columns * size
        mosaic.height = rows * size
        const mosaicContext = mosaic.getContext('2d')
        if (!mosaicContext) throw new Error('no 2d context')
        plan.tiles.forEach(({ x, y }, index) => mosaicContext.drawImage(images[index]!, (x - plan.minTileX) * size, (y - plan.minTileY) * size))
        const crop = { left: plan.crop.left * size, top: plan.crop.top * size, width: plan.crop.width * size, height: plan.crop.height * size }
        const scale = Math.min(1, MAX_SIDE_PX / Math.max(crop.width, crop.height))
        const out = document.createElement('canvas')
        out.width = Math.round(crop.width * scale)
        out.height = Math.round(crop.height * scale)
        out.getContext('2d')?.drawImage(mosaic, crop.left, crop.top, crop.width, crop.height, 0, 0, out.width, out.height)
        setState({ status: 'ready', canvas: out })
      })
      .catch(() => { if (!cancelled) setState({ status: 'failed', canvas: null }) })
    return () => { cancelled = true }
  }, [plan, active])

  const groundPhoto = useMemo(() => (state.canvas ? { canvas: state.canvas, rect: tile, hidesStreets: true } : null), [state.canvas, tile])
  return { status: MAPTILER_KEY ? state.status : ('no-key' as const), groundPhoto }
}

export type GroundSource = 'local' | 'maptiler' | 'sentinel' | 'none'

/** The Lab's ground image: the owner's local photo, the free Sentinel-2 mosaic, or the map colours. */
export function useGround(siteId: string, origin: { readonly latitude: number; readonly longitude: number }, tile: Extent) {
  const local = useLocalPhoto(siteId, tile.maxX - tile.minX)
  const [choice, setChoice] = useState<GroundSource | null>(null)
  // Default: the local photo when it exists, otherwise the free mosaic.
  const source: GroundSource = choice ?? (local.found ? 'local' : 'sentinel')
  const sentinel = useSentinelGround(origin, tile, source === 'sentinel')
  const mapTiler = useMapTilerGround(origin, tile, source === 'maptiler')
  const groundPhoto =
    source === 'local' ? local.groundPhoto : source === 'maptiler' ? mapTiler.groundPhoto : source === 'sentinel' ? sentinel.groundPhoto : null
  return { source, setSource: setChoice, local, sentinelStatus: sentinel.status, mapTilerStatus: mapTiler.status, groundPhoto }
}

type Slider = { key: keyof Omit<PhotoAlignment, 'enabled'>; label: string; min: number; max: number; step: number; unit: string }

const SLIDERS: readonly Slider[] = [
  { key: 'offsetE', label: 'Move east', min: -400, max: 400, step: 1, unit: ' m' },
  { key: 'offsetN', label: 'Move north', min: -400, max: 400, step: 1, unit: ' m' },
  { key: 'widthM', label: 'Photo width', min: 100, max: 3000, step: 1, unit: ' m' },
  { key: 'keepColour', label: 'Colour kept', min: 0, max: 1, step: 0.05, unit: '' },
  { key: 'brightness', label: 'Brightness', min: 0.5, max: 1.6, step: 0.05, unit: '×' },
]

const SOURCES: readonly { id: GroundSource; label: string }[] = [
  { id: 'local', label: 'Aerial photo' },
  { id: 'maptiler', label: 'MapTiler' },
  { id: 'sentinel', label: 'Sentinel-2' },
  { id: 'none', label: 'Map colours' },
]

/** The Lab's Ground card: choose the ground image; line up the local photo; credit the source. */
export function LocalPhotoPanel({ siteId, ground }: { siteId: string; ground: ReturnType<typeof useGround> }) {
  const photo = ground.local
  return (
    <details open className="w-72 rounded-card border border-card-line bg-card/95 p-3 text-ink shadow-card backdrop-blur">
      <summary className="cursor-pointer text-body-sm text-ink">Ground image</summary>
      <div role="group" aria-label="Ground image" className={`${segmentGroupClass} mt-2`}>
        {SOURCES.map(({ id, label }) => {
          const unavailable = (id === 'local' && !photo.found) || (id === 'maptiler' && ground.mapTilerStatus === 'no-key')
          return (
            <button
              key={id}
              type="button"
              aria-pressed={ground.source === id}
              disabled={unavailable}
              title={!unavailable ? undefined : id === 'local' ? `No local photo: save one as public/local-ortho/${siteId}.png` : 'No MapTiler key: add VITE_MAPTILER_KEY to .env.local and restart the dev server'}
              className={`${segmentClass} disabled:cursor-not-allowed disabled:opacity-40`}
              onClick={() => ground.setSource(id)}
            >
              {label}
            </button>
          )
        })}
      </div>
      {ground.source === 'local' && (
        <div className="mt-2 space-y-2">
          <p className={labelClass}>Line the white buildings up with the roofs in the photo.</p>
          {SLIDERS.map((slider) => (
            <label key={slider.key} className="block">
              <span className={`${labelClass} flex justify-between`}>
                <span>{slider.label}</span>
                <span>{photo.alignment[slider.key]}{slider.unit}</span>
              </span>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={photo.alignment[slider.key]}
                aria-label={`Photo ${slider.label}`}
                className={rangeClass}
                onChange={(event) => photo.setAlignment({ ...photo.alignment, [slider.key]: Number(event.currentTarget.value) })}
              />
            </label>
          ))}
          <button type="button" className={textButtonSmClass} onClick={photo.reset}>Reset</button>
          <p className={labelClass}>{LOCAL_PHOTO_CREDIT}</p>
        </div>
      )}
      {ground.source === 'maptiler' && (
        <p className={`${labelClass} mt-2`} aria-live="polite">
          {ground.mapTilerStatus === 'failed'
            ? 'Could not load the MapTiler tiles (key, quota or network); showing the map colours. '
            : ground.mapTilerStatus === 'loading'
              ? 'Loading the MapTiler satellite tiles… '
              : 'Live satellite tiles, about 0.3 m per pixel. Free plan: non-commercial. '}
          <a href={MAPTILER_COPYRIGHT_URL} target="_blank" rel="noreferrer" className="underline">{MAPTILER_CREDIT}</a>
        </p>
      )}
      {ground.source === 'sentinel' && (
        <p className={`${labelClass} mt-2`} aria-live="polite">
          {ground.sentinelStatus === 'failed'
            ? 'Could not load the Sentinel-2 mosaic (offline or the service is down); showing the map colours.'
            : ground.sentinelStatus === 'loading'
              ? 'Loading the Sentinel-2 mosaic…'
              : 'Free satellite mosaic, 10 m per pixel. '}
          {ground.sentinelStatus !== 'failed' && SENTINEL_CREDIT}
        </p>
      )}
    </details>
  )
}
