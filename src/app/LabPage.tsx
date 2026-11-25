import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSite } from '../features/sites/siteCatalog'
import { useSitePackage } from '../features/sites/useSitePackage'
import { ViewportCanvas, type SceneLayers } from '../scene/ViewportCanvas'
import { sunState } from '../features/analysis/sun'
import { localDayMinuteToInstant, type LocalDate } from '../features/analysis/time'
import { daySunSamples } from '../features/analysis/shadowRay'
import { circlePolygon } from '../features/analysis/grid'
import { useCircleSunHours } from '../features/analysis/useCircleSunHours'
import { useWindFlow } from '../features/analysis/useWindFlow'
import { buildClimateView, DEFAULT_WIND, windCaption } from '../features/analysis/climateView'
import { noiseSourceLine, type NoiseMetric } from '../features/analysis/officialNoise'
import { useRunoff } from '../features/analysis/useRunoff'
import { RUNOFF_NOTE } from '../features/analysis/runoff'
import { hornSlopeDeg, SLOPE_NOTE, type TerrainRaster } from '../features/analysis/terrainTools'
import { sunHoursDisclaimer } from '../features/analysis/sunHours'
import { hasMeasuredHeights } from '../features/sites/provenance'
import { legendFor } from '../features/analysis/graphics'
import { MapLegend } from '../components/studio/MapLegend'
import { loadTerrainRaster } from '../features/sites/terrain1m'
import { normalizeRing, ringCentroid } from '../lib/polygon'
import type { SitePackage } from '../features/sites/package'
import type { SiteSummary } from '../features/sites/siteCatalog'
import { buildDemoMassEditor, buildEmptyEditor, type LabStateId } from './lab/states'
import { LocalPhotoPanel, useGround } from './lab/LocalPhotoPanel'
import { LabTweakPanel, type LabQuality } from './lab/TweakPanel'
import { parseLabParams, serializeTuning, type LabPresetId } from './lab/params'
import { NORDIC, applyTuning, DEFAULT_TUNING, identityStage, type IdentityStage, type IdentityTuning } from '../scene/style'

const noop = () => {}
const WIND = { ...DEFAULT_WIND, display: 'ratio' as const, heightM: 2 }
const isLocalDate = (value: string): value is LocalDate => /^\d{4}-\d{2}-\d{2}$/.test(value)

const LAYERS: SceneLayers = { terrain: true, ground: true, context: true, streets: true, trees: true, parcels: false }

/** The Lab page itself: loads the site package, then mounts the live scene. */
export function LabPage() {
  const { siteId } = useParams()
  const site = getSite(siteId)
  const { status, data } = useSitePackage(site?.id ?? null)

  if (!site) return <LabFallback heading="Unknown site package" body="Choose one of the curated sites." />
  if (status === 'error') return <LabFallback heading="The site model could not be loaded" body="Try again." />
  if (status !== 'ready' || !data) return <LabFallback heading="Loading site package" body="The Lab loads the curated package." />

  return <LabScene site={site} sitePackage={data} />
}

function LabFallback({ heading, body }: { heading: string; body: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-app p-6 text-ink">
      <div className="w-full max-w-md text-center">
        <p className="text-caption text-ink-secondary">Visual Lab</p>
        <h1 className="mt-2 text-title text-ink">{heading}</h1>
        <p className="mt-3 text-body-sm text-ink-secondary">{body}</p>
      </div>
    </main>
  )
}

function LabScene({ site, sitePackage }: { site: SiteSummary; sitePackage: SitePackage }) {
  const [initialParams] = useState(() => parseLabParams(window.location.search))
  const [stateId, setStateId] = useState<LabStateId>(initialParams.stateId)
  const [styleId, setStyleId] = useState<'nordic' | 'identity'>(initialParams.styleId)
  const [stage, setStage] = useState<IdentityStage>(initialParams.stage)
  const [presetId, setPresetId] = useState<LabPresetId>(initialParams.presetId)
  const [cameraNonce, setCameraNonce] = useState(0)
  const [date, setDate] = useState<LocalDate>(initialParams.date as LocalDate)
  const [minute, setMinute] = useState(initialParams.minute)
  const [quality, setQuality] = useState<LabQuality>('auto')
  const [tuning, setTuning] = useState<IdentityTuning>(initialParams.tuning)

  const style = styleId === 'identity' ? applyTuning(identityStage(stage), tuning) : NORDIC
  // The ground image (ADR-0041): the owner's local aerial photo (never committed or published), the
  // free Sentinel-2 mosaic, or the map colours. Identity only.
  const groundOrigin = useMemo(
    () => ({ latitude: sitePackage.manifest.crs.originLatitude, longitude: sitePackage.manifest.crs.originLongitude }),
    [sitePackage],
  )
  const groundTile = useMemo(() => {
    const { minX, maxX, minY, maxY } = sitePackage.terrain
    return { minX, maxX, minY, maxY }
  }, [sitePackage])
  const ground = useGround(site.id, groundOrigin, groundTile)

  const copyTuning = async () => {
    const tuned = applyTuning(identityStage(stage), tuning)
    const url = `${window.location.origin}/lab/${site.id}?style=identity&stage=${stage}&state=${stateId}&preset=${presetId}&date=${date}&minute=${minute}&tuning=${encodeURIComponent(serializeTuning(tuning))}`
    const text = `// IDENTITY tuned in the Visual Lab (Run 8)\n${JSON.stringify(tuned, null, 2)}\n\n// Reproduce: ${url}`
    try { await navigator.clipboard.writeText(text) } catch { /* clipboard unavailable */ }
  }

  // A Lab-only camera that frames the whole terrain tile from a 45° elevation (Run 8 T1), so the
  // owner can judge the dissolve on all four edges.
  const overviewPreset = useMemo(() => {
    const t = sitePackage.terrain
    const radius = Math.hypot((t.maxX - t.minX) / 2, (t.maxY - t.minY) / 2)
    const fov = (40 * Math.PI) / 180
    const elevation = (45 * Math.PI) / 180
    const azimuth = (45 * Math.PI) / 180
    const distance = (radius * 1.2) / Math.tan(fov / 2)
    const horizontal = distance * Math.cos(elevation)
    return {
      position: [horizontal * Math.cos(azimuth), horizontal * Math.sin(azimuth), distance * Math.sin(elevation)] as [number, number, number],
      target: [0, 0, 0] as [number, number, number],
      projection: 'perspective' as const,
      fov: 40,
    }
  }, [sitePackage])

  // The demo mass is part of the editor only in the "mass" state; every other state is mass-less.
  const editor = useMemo(
    () => (stateId === 'mass' ? buildDemoMassEditor(site.id, sitePackage) : buildEmptyEditor(site.id)),
    [stateId, site.id, sitePackage],
  )

  const solar = useMemo(() => {
    const { latitude, longitude, timeZone } = sitePackage.manifest.location
    const resolved = localDayMinuteToInstant(date, minute, timeZone)
    return { resolved, state: sunState(resolved.instant, latitude, longitude, timeZone) }
  }, [date, minute, sitePackage])

  const studyArea = useMemo(() => normalizeRing(sitePackage.studyArea.polygon), [sitePackage])
  const windCentre = useMemo(() => ringCentroid(studyArea), [studyArea])
  const windCircle = useMemo(() => ({ centre: windCentre, radius: WIND.radius }), [windCentre])
  const windArea = useMemo(() => circlePolygon(windCentre, WIND.radius), [windCentre])

  // Analysis runs over the context buildings only: the demo mass is a separate state.
  const analysisBuildings = useMemo(() => sitePackage.buildings.buildings, [sitePackage])
  const sunSamples = useMemo(() => daySunSamples(date, sitePackage.manifest.location), [date, sitePackage])

  const circleSun = useCircleSunHours(analysisBuildings, windCircle, sunSamples, stateId === 'sun-hours')
  const { flow: windFlow } = useWindFlow(windArea, analysisBuildings, WIND.from, stateId === 'wind', WIND.downwash, stateId === 'wind')

  // The 1 m tile is loaded the first time Water or Slope needs it (ADR-0037).
  const terrain1mPath = sitePackage.manifest.assetPaths.terrain1m
  const [terrainRaster, setTerrainRaster] = useState<{ siteId: string; raster: TerrainRaster } | null>(null)
  const terrainWanted = !!terrain1mPath && (stateId === 'water' || stateId === 'slope' || style.contourSource === 'tile1m')
  useEffect(() => {
    if (!terrainWanted || !terrain1mPath || terrainRaster) return
    const controller = new AbortController()
    loadTerrainRaster(site.id, terrain1mPath, controller.signal)
      .then((raster) => setTerrainRaster({ siteId: site.id, raster }))
      .catch(() => {})
    return () => controller.abort()
  }, [terrainWanted, terrain1mPath, terrainRaster, site.id])
  const raster = terrainRaster && terrainRaster.siteId === site.id ? terrainRaster.raster : null

  const runoffFootprints = useMemo(() => analysisBuildings.map((building) => building.footprint), [analysisBuildings])
  const { runoff, computing: runoffComputing } = useRunoff(raster, runoffFootprints, stateId === 'water')

  const climateView = useMemo(() => {
    if (stateId !== 'wind' || !windFlow) return null
    return buildClimateView('wind', windArea, analysisBuildings, sitePackage.roads, windFlow, { ...WIND, centre: windCentre }, 10, null, null)
  }, [stateId, windArea, analysisBuildings, sitePackage.roads, windFlow, windCentre])

  const noise = sitePackage.noise
  const slopeDegrees = useMemo(() => (raster && stateId === 'slope' ? hornSlopeDeg(raster) : null), [raster, stateId])

  // The on-map legend (TF-VIS-040 part B). The claim for each analysis is the exact string the
  // studio's caption blocks already show for the same inputs — never authored here.
  const legend = useMemo(() => {
    if (stateId === 'sun-hours') {
      return legendFor('sun-hours', {
        claim: circleSun.computing ? 'Computing hours of direct sun…' : sunHoursDisclaimer(hasMeasuredHeights(sitePackage.manifest)),
        state: circleSun.computing ? 'computing' : 'ready',
      })
    }
    if (stateId === 'wind') {
      return legendFor('wind-speed', {
        claim: windCaption(WIND.heightM, !climateView),
        state: climateView ? 'ready' : 'computing',
      })
    }
    if (stateId === 'noise' && noise) {
      return legendFor('noise', { claim: noiseSourceLine('Lden', noise.dataYear) })
    }
    if (stateId === 'water') {
      return legendFor('runoff', {
        claim: runoffComputing || !runoff ? 'Tracing where the water runs…' : RUNOFF_NOTE,
        state: runoffComputing || !runoff ? 'computing' : 'ready',
      })
    }
    if (stateId === 'slope' && raster && slopeDegrees) {
      return legendFor('slope', { claim: SLOPE_NOTE })
    }
    return null
  }, [stateId, circleSun.computing, sitePackage.manifest, climateView, noise, runoffComputing, runoff, raster, slopeDegrees])

  const requestPreset = (preset: LabPresetId) => {
    setPresetId(preset)
    setCameraNonce((value) => value + 1)
  }

  return (
    <main className="grid min-h-dvh gap-3 bg-canvas p-3 text-ink lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* The viewport needs a definite height, not just a min-height: ViewportCanvas's root is
          h-full, and `height: 100%` cannot resolve against a min-height-only parent in strict
          engines (Safari), collapsing the R3F canvas to 0 px — the blank first view (TF-VIS-015
          follow-up). The studio solves the same problem with a definite h-[min(720px,70dvh)] and
          grid rows; the Lab grid has no row tracks, so the height is stated per breakpoint. */}
      <section aria-label="Studio viewport" className="relative flex h-[min(720px,70dvh)] min-h-[480px] min-w-0 flex-col overflow-hidden rounded-panel border border-card-line bg-viewport shadow-card lg:h-[calc(100dvh_-_1.5rem)]">
        <ViewportCanvas
          sitePackage={sitePackage}
          sun={solar.state}
          layers={LAYERS}
          presetId={presetId}
          cameraNonce={cameraNonce}
          editor={editor}
          dispatch={noop}
          editable={false}
          renderPreference={quality === 'auto' ? 'auto' : quality}
          style={style}
          terrain1m={raster}
          overviewPreset={overviewPreset}
          groundPhoto={styleId === 'identity' ? ground.groundPhoto : null}
          sunHours={stateId === 'sun-hours' ? { circle: windCircle, result: circleSun.result, buildings: circleSun.buildings, computing: circleSun.computing } : null}
          climate={stateId === 'wind' && climateView ? climateView.overlay : null}
          windFlow={stateId === 'wind' ? windFlow : null}
          windSettings={WIND}
          windBuildings={analysisBuildings}
          windCircle={stateId === 'wind' ? windCircle : null}
          windStreamlines={false}
          noise={stateId === 'noise' && noise ? { polygons: noise.polygons, metric: 'Lden' as NoiseMetric, caption: noiseSourceLine('Lden', noise.dataYear) } : null}
          runoff={stateId === 'water' && raster ? { result: runoff, caption: runoffComputing || !runoff ? 'Tracing where the water runs…' : RUNOFF_NOTE } : null}
          slope={raster && slopeDegrees ? { raster, degrees: slopeDegrees } : null}
        />
        {legend && (
          <div className="absolute left-3 top-3 z-20">
            <MapLegend model={legend} />
          </div>
        )}
        {styleId === 'identity' && (
          <div className="absolute bottom-3 left-3 z-20">
            <LocalPhotoPanel siteId={site.id} ground={ground} />
          </div>
        )}
      </section>
      <LabTweakPanel
        stateId={stateId}
        styleId={styleId}
        stage={stage}
        presetId={presetId}
        date={date}
        minute={minute}
        quality={quality}
        tuning={tuning}
        onState={setStateId}
        onStyle={setStyleId}
        onStage={setStage}
        onPreset={requestPreset}
        onDate={(value) => { if (isLocalDate(value)) setDate(value) }}
        onMinute={setMinute}
        onQuality={setQuality}
        onTuning={setTuning}
        onCopyTuning={copyTuning}
        onResetTuning={() => setTuning({ ...DEFAULT_TUNING })}
      />
    </main>
  )
}
