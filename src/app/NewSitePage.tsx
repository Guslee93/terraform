import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PlaceSearch } from './PlaceSearch'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/cn'
import { importSite, type ImportStep } from '../features/import/assemble'
import { QUICK_PICKS } from '../features/import/cities'
import { FRAME_SIZES, frameAt, framePixels, frameReadout, type FrameSize } from '../features/import/framing'
import { saveImported, openImportedWithoutSaving, type ImportedSite } from '../features/import/session'
import { StoreError, toStoreError } from '../features/scenarios/store'
import { kartverketProvider, terrariumProvider } from '../features/import/terrain'
import { openFreeMapSource } from '../features/import/tiles'
import { overpassTrees } from '../features/import/trees'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'
const START = QUICK_PICKS[0] ?? { label: 'Custom area', latitude: 59.9239, longitude: 10.7579 }
const START_ZOOM = 15
/** Panel width (368) plus its 16 px inset and gap; matches `lg:pl-[400px]` on the frame layer. */
const PANEL_OFFSET = 400

const STEPS: readonly { id: ImportStep; label: string; source: string }[] = [
  { id: 'tiles', label: 'Map tiles', source: 'OpenFreeMap' },
  { id: 'buildings', label: 'Buildings', source: 'OpenStreetMap' },
  { id: 'context', label: 'Streets and green space', source: 'OpenStreetMap' },
  { id: 'terrain', label: 'Terrain', source: 'Kartverket or AWS Terrain Tiles' },
  { id: 'assemble', label: 'Site package', source: 'Validated locally' },
]
type StepState = 'waiting' | 'start' | 'done' | 'skipped' | 'failed'
const STATUS_WORD: Record<StepState, string> = { waiting: 'Waiting', start: 'Loading', done: 'Done', skipped: 'Skipped', failed: 'Failed' }
const WAITING: Record<ImportStep, { state: StepState; detail?: string }> = {
  tiles: { state: 'waiting' }, buildings: { state: 'waiting' }, context: { state: 'waiting' }, terrain: { state: 'waiting' }, assemble: { state: 'waiting' },
}

type Phase = 'idle' | 'loading' | 'cancelled' | 'error'

const prefersReducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The place in `?lat=&lon=&label=`, if valid; otherwise the default start. */
function startFrom(params: URLSearchParams) {
  const latitude = Number(params.get('lat'))
  const longitude = Number(params.get('lon'))
  const valid = params.has('lat') && params.has('lon') && Math.abs(latitude) <= 85 && Math.abs(longitude) <= 180 && Number.isFinite(latitude) && Number.isFinite(longitude)
  return valid ? { latitude, longitude, label: params.get('label')?.slice(0, 120) || 'Custom area' } : START
}

export function NewSitePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [start] = useState(() => startFrom(params))
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const controller = useRef<AbortController | null>(null)
  const [view, setView] = useState({ latitude: start.latitude, longitude: start.longitude, zoom: START_ZOOM })
  const [size, setSize] = useState<FrameSize>(400)
  const [title, setTitle] = useState(start.label)
  const [phase, setPhase] = useState<Phase>('idle')
  const [steps, setSteps] = useState(WAITING)
  const [unsaved, setUnsaved] = useState<ImportedSite | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return
    const instance = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [start.longitude, start.latitude],
      zoom: START_ZOOM,
      attributionControl: { compact: false },
    })
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    instance.getCanvas().setAttribute('aria-label', 'Map. Use arrow keys to move the site frame.')
    const sync = () => {
      const centre = instance.getCenter()
      setView({ latitude: centre.lat, longitude: centre.lng, zoom: instance.getZoom() })
    }
    instance.on('move', sync)
    // On wide screens the panel covers the left of the map; padding keeps the map centre
    // (the imported frame centre) under the drawn frame, which sits right of the panel.
    const wide = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 1024px)') : null
    const pad = () => instance.setPadding({ left: wide?.matches ? PANEL_OFFSET : 0, top: 0, right: 0, bottom: 0 })
    pad()
    wide?.addEventListener('change', pad)
    map.current = instance
    return () => {
      wide?.removeEventListener('change', pad)
      instance.remove()
      map.current = null
    }
    // The map is created once, at the start place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Leaving the page cancels an import in flight.
  useEffect(() => () => controller.current?.abort(), [])

  const goTo = useCallback((latitude: number, longitude: number, label: string) => {
    setTitle(label)
    const target = { center: [longitude, latitude] as [number, number], zoom: Math.max(map.current?.getZoom() ?? START_ZOOM, START_ZOOM) }
    if (prefersReducedMotion()) map.current?.jumpTo(target)
    else map.current?.flyTo(target)
  }, [])

  const loading = phase === 'loading'
  const framed = frameAt(view.latitude, view.longitude, size, title)

  async function load() {
    if (!('frame' in framed)) return
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setPhase('loading')
    setError(null)
    setUnsaved(null)
    setSteps(WAITING)
    try {
      const result = await importSite(
        framed.frame,
        { tiles: openFreeMapSource(), terrain: [kartverketProvider(), terrariumProvider()], trees: overpassTrees() },
        {
          signal: current.signal,
          onProgress: (step, state, detail) => setSteps((previous) => ({ ...previous, [step]: { state, detail } })),
        },
      )
      const { frame } = framed
      if (current.signal.aborted) return
      const imported: ImportedSite = {
        summary: {
          id: frame.id,
          title: frame.title,
          subtitle: 'OpenStreetMap context · heights partly estimated · not survey data',
          description: 'Imported from open map data on /new; no cadastral or planning data.',
          morphology: 'Imported area',
          thumbnail: '',
          dataStatus: 'user-import',
          notices: result.warnings.map((warning) => warning.message),
        },
        sitePackage: result.sitePackage,
        warnings: result.warnings,
        importedAt: new Date().toISOString(),
      }
      if (current.signal.aborted) return
      try { await saveImported(imported) }
      catch (problem) {
        if (current.signal.aborted) return
        const reason = problem instanceof StoreError ? problem : toStoreError(problem)
        setUnsaved(imported)
        setError(`This browser could not save the site (${reason.kind}). You can still open it once.`)
        setPhase('error')
        return
      }
      if (!current.signal.aborted) navigate(`/studio/import/${frame.id}`)
    } catch (caught) {
      if (current.signal.aborted) {
        if (controller.current === current) setPhase('cancelled')
        return
      }
      setError(caught instanceof Error ? caught.message : 'The import failed.')
      setPhase('error')
    }
  }

  function cancel() {
    controller.current?.abort()
    setPhase('cancelled')
  }

  const pixels = framePixels(size, view.latitude, view.zoom)

  return (
    <div className="relative flex min-h-dvh flex-col bg-app lg:block lg:h-dvh lg:overflow-hidden">
      <div className="relative h-[55dvh] shrink-0 lg:absolute lg:inset-0 lg:h-auto">
        <div ref={mapContainer} data-testid="import-map" className="h-full w-full bg-viewport [&_canvas:focus-visible]:outline-2 [&_canvas:focus-visible]:outline-focus" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center lg:pl-[400px]">
          <div
            data-testid="site-frame"
            className="border-2 border-ink bg-ink/5 shadow-[0_0_0_9999px_rgb(0_0_0/0.12)]"
            style={{ width: pixels, height: pixels }}
          />
        </div>
      </div>

      <aside
        aria-label="Find and frame a site"
        className="relative z-10 flex flex-col gap-6 border-t border-line bg-surface px-4 py-5 lg:absolute lg:bottom-4 lg:left-4 lg:top-4 lg:w-[368px] lg:overflow-y-auto lg:rounded-card lg:border lg:px-6 lg:py-6"
      >
        <header>
          <Link to="/" className="text-caption text-ink-secondary underline underline-offset-4 hover:text-ink">
            Terraform · back to search
          </Link>
          <h1 className="mt-3 text-figure-s text-ink">Frame the site</h1>
          <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">
            Move the map to place the frame, then open it in 3D.
          </p>
        </header>

        <PlaceSearch disabled={loading} onSelect={(place) => goTo(place.latitude, place.longitude, place.label)} />

        <fieldset disabled={loading}>
          <legend id="frame-size-label" className="text-caption text-ink-secondary">Frame size</legend>
          <div role="radiogroup" aria-labelledby="frame-size-label" className="mt-2 grid grid-cols-3 gap-2">
            {FRAME_SIZES.map((option) => (
              <label key={option} className={cn('flex min-h-10 cursor-pointer items-center justify-center rounded-control border text-body-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus', size === option ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-ink hover:bg-surface-hover')}>
                <input type="radio" name="frame-size" value={option} checked={size === option} onChange={() => setSize(option)} className="sr-only" />
                {option} m
              </label>
            ))}
          </div>
          <p className="mt-3 text-body-sm text-ink">{frameReadout(size)}</p>
          <p className="mt-1 text-caption text-ink-secondary">
            {title} · Area to load — not a cadastral parcel
          </p>
        </fieldset>

        {'error' in framed && <p className="text-caption text-warning-ink">{framed.error}</p>}

        <div className="flex gap-2">
          <Button className="min-h-11 flex-1" disabled={loading || !('frame' in framed)} onClick={() => void load()}>
            Open in 3D
          </Button>
          {loading && (
            <Button variant="secondary" className="min-h-11" onClick={cancel}>
              Cancel import
            </Button>
          )}
        </div>

        {phase !== 'idle' && (
          <ol aria-label="Import progress" aria-live="polite" className="border-t border-line pt-4">
            {STEPS.map((step) => {
              const { state, detail } = steps[step.id]
              return (
                <li key={step.id} className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0">
                  <span className="min-w-0">
                    <span className="block text-body-sm text-ink">{step.label}</span>
                    <span className="block text-caption text-ink-secondary">
                      {(state === 'failed' || state === 'skipped') && detail ? detail : step.source}
                    </span>
                  </span>
                  <span className={cn('shrink-0 text-caption', state === 'failed' ? 'text-danger' : state === 'done' ? 'text-ink' : 'text-ink-secondary')}>
                    {STATUS_WORD[state]}
                  </span>
                </li>
              )
            })}
          </ol>
        )}

        {phase === 'cancelled' && <p role="status" className="text-body-sm text-ink-secondary">Import cancelled</p>}
        {phase === 'error' && error && (
          <div role="alert" className="rounded-control border border-danger/40 bg-surface px-3 py-3">
            <p className="text-body-sm text-ink">{unsaved ? 'The site could not be saved.' : 'The site could not be loaded.'}</p>
            <p className="mt-1 break-words text-caption text-ink-secondary">{error}</p>
            {unsaved ? <Button variant="secondary" className="mt-3 min-h-10" onClick={() => {
              openImportedWithoutSaving(unsaved)
              navigate(`/studio/import/${unsaved.summary.id}`)
            }}>Open without saving</Button> : <Button variant="secondary" className="mt-3 min-h-10" onClick={() => void load()}>Try again</Button>}
          </div>
        )}

        <p className="mt-auto border-t border-line pt-4 text-caption text-ink-secondary">
          OpenStreetMap context · heights partly estimated · not survey data. Imported sites are saved in this browser only.
        </p>
      </aside>
    </div>
  )
}
