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
import { buildClimateView, DEFAULT_WIND } from '../features/analysis/climateView'
import { noiseSourceLine, type NoiseMetric } from '../features/analysis/officialNoise'
import { useRunoff } from '../features/analysis/useRunoff'
import { RUNOFF_NOTE } from '../features/analysis/runoff'
import { hornSlopeDeg, type TerrainRaster } from '../features/analysis/terrainTools'
import { loadTerrainRaster } from '../features/sites/terrain1m'
import { normalizeRing, ringCentroid } from '../lib/polygon'
import type { CameraPresetId } from '../features/sites/manifest'
import type { SitePackage } from '../features/sites/package'
import type { SiteSummary } from '../features/sites/siteCatalog'
import { LAB_STYLES, buildDemoMassEditor, buildEmptyEditor, type LabStateId } from './lab/states'
import { LabTweakPanel, type LabQuality } from './lab/TweakPanel'

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
  const [stateId, setStateId] = useState<LabStateId>('neutral')
  const [styleId, setStyleId] = useState('nordic')
  const [presetId, setPresetId] = useState<CameraPresetId>('isometric')
  const [cameraNonce, setCameraNonce] = useState(0)
  const [date, setDate] = useState<LocalDate>('2026-06-21')
  const [minute, setMinute] = useState(900)
  const [quality, setQuality] = useState<LabQuality>('auto')

  const style = LAB_STYLES.find((option) => option.id === styleId)?.style ?? LAB_STYLES[0]!.style

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
  const terrainWanted = !!terrain1mPath && (stateId === 'water' || stateId === 'slope')
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

  const requestPreset = (preset: CameraPresetId) => {
    setPresetId(preset)
    setCameraNonce((value) => value + 1)
  }

  return (
    <main className="grid min-h-dvh gap-3 bg-canvas p-3 text-ink lg:grid-cols-[minmax(0,1fr)_320px]">
      <section aria-label="Studio viewport" className="relative flex min-h-[480px] min-w-0 flex-col overflow-hidden rounded-panel border border-card-line bg-viewport shadow-card">
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
      </section>
      <LabTweakPanel
        stateId={stateId}
        styleId={styleId}
        presetId={presetId}
        date={date}
        minute={minute}
        quality={quality}
        onState={setStateId}
        onStyle={setStyleId}
        onPreset={requestPreset}
        onDate={(value) => { if (isLocalDate(value)) setDate(value) }}
        onMinute={setMinute}
        onQuality={setQuality}
      />
    </main>
  )
}
