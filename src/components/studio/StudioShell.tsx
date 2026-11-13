import { createHistory } from '../../features/editor/history'
import { createScenario } from '../../features/massing/factories'
import { formatMetres } from './format'
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { sunState } from '../../features/analysis/sun'
import { baselineMatches, captureBaseline, buildClimateView, DEFAULT_WIND, localSpeedMs, ROSE_THRESHOLD_MS, type WindBaseline, type ClimateMode, type WindSettings } from '../../features/analysis/climateView'
import { ClimatePanel, useWindDemo } from './ClimatePanel'
import { ShareBar } from './DirectionRose'
import { pillButtonClass } from '../ui/controls'
import { useWindFlow } from '../../features/analysis/useWindFlow'
import { useWindSweep } from '../../features/analysis/useWindSweep'
import { summariseSweep, SWEEP_DIRECTIONS } from '../../features/analysis/directionSweep'
import { circlePolygon } from '../../features/analysis/grid'
import type { Vec2 } from '../../lib/coordinates'
import { tierTop, tierHeight } from '../../features/massing/aggregate'
import { localDayMinuteToInstant } from '../../features/analysis/time'
import type { SunTime } from './SunPanel'
import type { MassingCommand } from '../../features/editor/history'
import { commandError, displayedDocument, createEditorState, reduceEditor } from '../../features/editor/interaction'
import { matchHistoryShortcut } from '../../features/editor/shortcuts'
import { sampleTerrainHeight, terrainRelief } from '../../features/sites/geometry'
import { frameSizeFromStudyArea } from '../../features/import/framing'
import { normalizeRing, polygonArea, ringCentroid } from '../../lib/polygon'
import type { CameraPresetId } from '../../features/sites/manifest'
import type { SitePackage } from '../../features/sites/package'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import { ViewportCanvas, type SceneLayers } from '../../scene/ViewportCanvas'
import type { MassAnnotation } from '../../scene/MassLayer'
import { cn } from '../../lib/cn'
import { textButtonClass } from '../ui/controls'
import { Icon } from '../ui/Icon'
import { CameraPresets } from './CameraPresets'
import { ExportVisuals, downloadPasses } from './ExportVisuals'
import type { PassImages } from '../../scene/exportPasses'
import { Inspector } from './Inspector'
import { StudioTopBar } from './StudioTopBar'
import { SunBand, SunDetails, clockLabel, useSunPlayback, type SunAnalysis } from './SunPanel'
import { ToolRail, type ToolId } from './ToolRail'
import { AnalysisCards, type AnalysisCard, type AnalysisId } from './AnalysisCards'
import { LayersCard } from './LayersCard'
import { noiseStat, facadeSunStat, roofSolarStat, sunHoursStat, sunStat, vscStat, windStat } from './analysisValues'
import { computeNoise, NOISE_DISCLAIMER } from '../../features/analysis/noise'
import { daySunSamples } from '../../features/analysis/shadowRay'
import { computeSunHours, SUN_HOURS_COLOUR, SUN_HOURS_DISCLAIMER } from '../../features/analysis/sunHours'
import { roofSolarLegend, roofSolarYieldKwh, ROOF_SOLAR_DISCLAIMER } from '../../features/analysis/roofSolar'
import { useRoofSolar } from '../../features/analysis/useRoofSolar'
import { facadeSamples } from '../../features/analysis/facadeSamples'
import { computeFacadeSun, facadeSunLegend, FACADE_SUN_DISCLAIMER } from '../../features/analysis/facadeSun'
import { computeVsc, vscLegend, VSC_COLOUR, VSC_DISCLAIMER } from '../../features/analysis/vsc'
import { FLOW_DISCLAIMER } from '../../features/analysis/lbm'
import { removeVolume } from '../../features/editor/commands'

type PackageStatus = 'loading' | 'ready' | 'error'

type StudioShellProps = {
  site: SiteSummary
  sitePackage: SitePackage | null
  packageStatus: PackageStatus
  packageError: string | null
  onRetry: () => void
}

/**
 * One ground level per block, under its first tier. Measuring each tier from the terrain under its
 * own centroid puts an upper tier's base below the lower tier's roof on a slope, so its first
 * façade row starts inside the block below.
 */
function volumeGround(volume: { tiers: readonly { footprint: { vertices: readonly Vec2[] } }[] }, terrain: SitePackage['terrain']): number {
  const first = volume.tiers[0]
  if (!first) return 0
  const [east, north] = ringCentroid(first.footprint.vertices)
  return sampleTerrainHeight(terrain, east, north)
}

export function StudioShell({
  site,
  sitePackage,
  packageStatus,
  onRetry,
}: StudioShellProps) {
  const studioRoot = useRef<HTMLDivElement>(null)
  const [editor, dispatch] = useReducer(reduceEditor, undefined, () => createEditorState(createHistory(createScenario({ siteId: site.id, name: 'Blocks' }))))
  const [sunTime, setSunTime] = useState<SunTime>({ date: '2026-06-21', minuteOfDay: 900 })
  const [sunAnalysis, setSunAnalysis] = useState<SunAnalysis>('shadows')
  const solar = useMemo(() => {
    if (!sitePackage) return null
    const { latitude, longitude, timeZone } = sitePackage.manifest.location
    const resolved = localDayMinuteToInstant(sunTime.date, sunTime.minuteOfDay, timeZone)
    return { resolved, state: sunState(resolved.instant, latitude, longitude, timeZone) }
  }, [sunTime, sitePackage])
  const playback = useSunPlayback(setSunTime)
  const [exportRequest, setExportRequest] = useState<number | null>(null)
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const onExport = useCallback((result: PassImages | Error) => {
    setExportRequest(null)
    setExportMessage(result instanceof Error ? result.message : `Saved ${downloadPasses(result, site.id)} images.`)
  }, [site.id])
  // Below 640 px the studio is a read-only preview (M0 visual gate).
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 640px)').matches)
  const [testBuilding, setTestBuilding] = useState(false)
  const analysisOnly = !testBuilding
  const editable = wide && packageStatus === 'ready' && testBuilding
  // An imported site came from the frame step, so Back returns there: the same place, the same
  // frame size. A curated site never was framed, so Back returns to the site list.
  const backTo = useMemo(() => {
    if (site.dataStatus !== 'user-import') return '/#sites'
    const location = sitePackage?.manifest.location
    if (!location) return '/new'
    const params = new URLSearchParams({
      lat: String(location.latitude),
      lon: String(location.longitude),
      label: site.title,
    })
    const size = frameSizeFromStudyArea(sitePackage?.studyArea.polygon ?? [])
    if (size) params.set('size', String(size))
    return `/new?${params.toString()}`
  }, [site, sitePackage])
  const [layers, setLayers] = useState<SceneLayers>({
    terrain: true,
    ground: true,
    context: true,
    streets: true,
    trees: true,
  })
  // The open analysis card is the analysis on the map (ADR-0026): Wind, Noise and Sun hours colour the ground.
  const [activeCard, setActiveCard] = useState<AnalysisId | null>('noise')
  const climateMode: ClimateMode =
    activeCard === 'wind'
      ? 'wind'
      : activeCard === 'noise'
        ? 'noise'
        : activeCard === 'sun' && sunAnalysis === 'sun-hours'
          ? 'sun-hours'
          : 'off'
  const setClimateMode = (mode: ClimateMode) => {
    if (mode === 'sun-hours') {
      setActiveCard('sun')
      setSunAnalysis('sun-hours')
      return
    }
    setActiveCard(mode === 'wind' ? 'wind' : mode === 'noise' ? 'noise' : null)
  }
  const [wind, setWind] = useState<WindSettings>(DEFAULT_WIND)
  const [streamlines, setStreamlines] = useState(false)
  const windDemo = useWindDemo(wind, streamlines, setWind, setStreamlines)
  const stopWindDemo = windDemo.stop
  useEffect(() => {
    if (climateMode !== 'wind') stopWindDemo()
  }, [climateMode, stopWindDemo])
  const [baseline, setBaseline] = useState<WindBaseline | null>(null)
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('isometric')
  const [cameraNonce, setCameraNonce] = useState(0)
  // The displayed document follows a live drag, so the inspector and analysis show preview values.
  const shown = displayedDocument(editor)
  // displayedDocument includes hidden masses; analysis explicitly uses only visible previews.
  const analysisDocument = useMemo(() => ({ ...shown, volumes: shown.volumes.filter((volume) => volume.visible) }), [shown])
  // Context buildings plus every visible mass: a building you draw changes wind and noise.
  const analysisBuildings = useMemo(() => {
    if (!sitePackage) return []
    const masses = analysisDocument.volumes.flatMap((volume) => {
      const ground = volumeGround(volume, sitePackage.terrain)
      return volume.tiers.map((tier) => ({ height: Math.max(0, tierTop(tier) - ground), footprint: tier.footprint.vertices }))
    })
    return [...sitePackage.buildings.buildings, ...masses]
  }, [analysisDocument, sitePackage])
  // Roof solar is a statement about the site: the study area and the masses drawn on it. The
  // surrounding blocks still cast shadows into the site, but their own roofs are not the
  // site's yield, and measuring every roof in a city block costs seconds of worker time.
  const roofSolarFocus = useMemo(() => {
    const context = sitePackage?.buildings.buildings ?? []
    const focus: number[] = []
    context.forEach((building, index) => {
      if (building.withinStudyArea) focus.push(index)
    })
    for (let index = context.length; index < analysisBuildings.length; index += 1) focus.push(index)
    return focus
  }, [analysisBuildings, sitePackage])
  const studyArea = useMemo(() => (sitePackage ? normalizeRing(sitePackage.studyArea.polygon) : null), [sitePackage])
  // Sun samples are date-only (the time slider does not change a day's total); ground hours reuse them.
  const sunSamples = useMemo(
    () => (sitePackage ? daySunSamples(sunTime.date, sitePackage.manifest.location) : []),
    [sitePackage, sunTime.date],
  )
  const sunHoursCells = useMemo(
    () => (studyArea && climateMode === 'sun-hours' ? computeSunHours(studyArea, analysisBuildings, sunSamples, 10) : []),
    [studyArea, analysisBuildings, sunSamples, climateMode],
  )
  // Roof solar depends only on the buildings and the site, so it is computed once per edit in its worker.
  const roofSolarActive = activeCard === 'sun' && sunAnalysis === 'roof-solar'
  const roofSolarValues = useRoofSolar(analysisBuildings, sitePackage?.manifest.location ?? null, roofSolarActive, roofSolarFocus)
  const roofSolarSummary = useMemo(() => {
    if (!roofSolarValues) return null
    let totalKwhPerYear = 0
    let roofAreaM2 = 0
    analysisBuildings.forEach((building, index) => {
      const value = roofSolarValues[index]
      if (!value || !value.analysed) return
      // Only the open part of a roof counts: a podium under a tower is not double-counted.
      const area = polygonArea(building.footprint) * (value.exposedShare ?? 1)
      roofAreaM2 += area
      totalKwhPerYear += roofSolarYieldKwh(value, area)
    })
    return { totalKwhPerYear, roofAreaM2 }
  }, [roofSolarValues, analysisBuildings])
  // Façades exist only on the visible user masses, so the sample count stays small and design-led.
  const facadeMasses = useMemo(() => {
    if (!sitePackage) return []
    return analysisDocument.volumes.map((volume) => {
      const ground = volumeGround(volume, sitePackage.terrain)
      return {
        id: volume.id,
        tiers: volume.tiers.map((tier, tierIndex) => ({
          tierIndex,
          footprint: tier.footprint.vertices,
          ground,
          baseZ: Math.max(0, tier.baseElevation - ground),
          topZ: Math.max(0, tierTop(tier) - ground),
        })),
      }
    })
  }, [analysisDocument, sitePackage])
  const facadeSampleList = useMemo(() => facadeSamples(facadeMasses), [facadeMasses])
  const facadeActive = activeCard === 'sun' && sunAnalysis === 'facade'
  const facadeSunValues = useMemo(
    () => (facadeActive ? computeFacadeSun(facadeSampleList, analysisBuildings, sunSamples) : []),
    [facadeActive, facadeSampleList, analysisBuildings, sunSamples],
  )
  const vscActive = activeCard === 'sun' && sunAnalysis === 'vsc'
  const vscValues = useMemo(
    () => (vscActive ? computeVsc(facadeSampleList, analysisBuildings) : []),
    [vscActive, facadeSampleList, analysisBuildings],
  )
  const facadeOverlay = useMemo(() => {
    if (facadeActive && facadeSunValues.length > 0) {
      return {
        values: facadeSunValues.map((value) => ({
          sample: value.sample,
          colour: SUN_HOURS_COLOUR[value.band],
        })),
      }
    }
    if (vscActive && vscValues.length > 0) {
      return {
        values: vscValues.map((value) => ({
          sample: value.sample,
          colour: VSC_COLOUR[value.band],
        })),
      }
    }
    return null
  }, [facadeActive, facadeSunValues, vscActive, vscValues])
  const [placingCircle, setPlacingCircle] = useState(false)
  // The Move circle button exists only on the Wind card; leaving it must end the key and click capture.
  useEffect(() => {
    if (climateMode !== 'wind') setPlacingCircle(false)
  }, [climateMode])
  const windCentre = useMemo(() => wind.centre ?? (studyArea ? ringCentroid(studyArea) : null), [wind.centre, studyArea])
  // Stable object: scene layers memoise on it (roofs, heatmap), so a fresh literal would rebuild them on every render.
  const windCircle = useMemo(() => (windCentre ? { centre: windCentre, radius: wind.radius } : null), [windCentre, wind.radius])
  const windArea = useMemo(() => (windCentre ? circlePolygon(windCentre, wind.radius) : null), [windCentre, wind.radius])
  const { flow: windFlow, isCurrent: isCurrentFlow } = useWindFlow(windArea, analysisBuildings, wind.from, climateMode === 'wind', wind.downwash, climateMode === 'wind')
  // The live field shows even mid-edit (Forma-style live drag); only a current, settled field may become the baseline.
  const freshFlow = isCurrentFlow(windFlow) ? windFlow : null
  // All-directions sweep (ADR-0015): opt-in, solved in its own worker.
  const [sweepOn, setSweepOn] = useState(false)
  const sweep = useWindSweep(windCircle, analysisBuildings, climateMode === 'wind' && sweepOn, wind.downwash)
  const sweepSummary = useMemo(() => (sweep ? summariseSweep(sweep, ROSE_THRESHOLD_MS / localSpeedMs(1, wind.refSpeed)) : null), [sweep, wind.refSpeed])
  const worstCase = useMemo(() => (sweep && sweepSummary ? { cells: sweep.cells, maxRatio: sweepSummary.maxRatio, solved: sweep.directions.length } : null), [sweep, sweepSummary])
  const worstFrom = useMemo(() => (sweep && sweepSummary ? Array.from(sweepSummary.worstIndex, (i) => sweep.directions[i] ?? Number.NaN) : []), [sweep, sweepSummary])
  const baselineMismatch = !!baseline && !!windCentre && !baselineMatches(baseline, { centre: windCentre, radius: wind.radius }, wind.from, wind.downwash)
  useEffect(() => {
    if (!placingCircle) return
    // Keyboard placement: arrows nudge the centre 10 m (east/north), Enter places, Esc cancels.
    const NUDGE: Record<string, Vec2> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') { event.preventDefault(); setPlacingCircle(false); return }
      const step = NUDGE[event.key]
      if (!step || !windCentre) return
      event.preventDefault()
      setWind((w) => ({ ...w, centre: [(w.centre ?? windCentre)[0] + step[0], (w.centre ?? windCentre)[1] + step[1]] }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [placingCircle, windCentre])
  const climateView = useMemo(() => {
    if (!sitePackage || !studyArea || !windArea || climateMode === 'off') return null
    return buildClimateView(climateMode, climateMode === 'wind' ? windArea : studyArea, analysisBuildings, sitePackage.roads, windFlow, { ...wind, centre: windCentre }, 10, baseline, worstCase, sunHoursCells)
  }, [sitePackage, studyArea, windArea, climateMode, windFlow, analysisBuildings, wind, windCentre, baseline, worstCase, sunHoursCells])
  // Dock figures (ADR-0016): every value comes from the same analysis the layers draw.
  const noiseCells = useMemo(() => (sitePackage && studyArea ? computeNoise(studyArea, sitePackage.roads, analysisBuildings, 10) : []), [sitePackage, studyArea, analysisBuildings])
  const windComfortView = useMemo(() => {
    if (!sitePackage || !windArea || climateMode !== 'wind' || !windFlow) return null
    if (wind.display === 'activity' && climateView) return climateView
    return buildClimateView('wind', windArea, analysisBuildings, sitePackage.roads, windFlow, { ...wind, display: 'activity', centre: windCentre })
  }, [sitePackage, windArea, climateMode, windFlow, wind, climateView, analysisBuildings, windCentre])
  const selectedVolume = shown.volumes.find(
    (volume) => volume.id === editor.history.selection.volumeId,
  )
  const selectedTier = selectedVolume?.tiers.find(
    (tier) => tier.id === editor.history.selection.tierId,
  )
  const selected =
    selectedVolume && selectedTier
      ? { volume: selectedVolume, tier: selectedTier }
      : null

  const idle = editor.interaction.kind === 'idle'

  const runCommand = (command: MassingCommand) => {
    const problem = commandError(editor, command)
    if (!problem) dispatch({ type: 'command', command })
    return problem
  }

  const requestCamera = useCallback((preset: CameraPresetId) => {
    stopWindDemo()
    setCameraPreset(preset)
    setCameraNonce((value) => value + 1)
  }, [stopWindDemo])

  const toggleTestBuilding = () => {
    const next = !testBuilding
    setTestBuilding(next)
    if (!next) dispatch({ type: 'setTool', tool: 'select' })
  }

  const toggleLayer = (layer: keyof SceneLayers) => {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }))
  }


  useEffect(() => {
    const query = window.matchMedia('(min-width: 640px)')
    const update = () => {
      setWide(query.matches)
      if (!query.matches) dispatch({ type: 'setTool', tool: 'select' })
    }
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  },[dispatch])

  const selectTool = (tool: ToolId) => {
    if (tool === 'select' || tool === 'draw') dispatch({ type: 'setTool', tool })
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      // ⌘/Ctrl+Z, ⇧⌘Z, Ctrl+Y (the matcher leaves text fields to native undo); same gate as the buttons.
      const shortcut = matchHistoryShortcut({ key: event.key, metaKey: event.metaKey, ctrlKey: event.ctrlKey, shiftKey: event.shiftKey, altKey: event.altKey, targetTag: target?.tagName, targetEditable: target?.isContentEditable })
      if (shortcut) {
        if (!editable) return
        event.preventDefault()
        dispatch({ type: shortcut })
        return
      }
      // Text-entry surfaces own their keyboard input.
      if (target?.closest('input, select, textarea, dialog, [contenteditable="true"]')) return

      // Plain F only: Cmd/Ctrl+F belongs to the browser's Find.
    if ((event.key === 'f' || event.key === 'F') && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        requestCamera('isometric')
      }

      if (event.key === 'Escape') dispatch({ type: 'key', key: 'Escape' })

      if (event.key === 'Enter' || event.key === 'Backspace') {
        if (target?.closest('button, a, summary, [role="button"]')) return
        event.preventDefault()
        dispatch({ type: 'key', key: event.key })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatch, requestCamera, editable])

  const annotations = useMemo(() => new Map<string, MassAnnotation>(analysisDocument.volumes.map((volume) => [volume.id, {
    title: 'Block',
    detail: `${volume.tiers[0]?.storeys ?? 0} fl · ${formatMetres(volume.tiers[0] ? tierHeight(volume.tiers[0]) : 0)}`,
  }])), [analysisDocument])
  const selectedDeletable = !!selectedVolume && !selectedVolume.locked
  const climatePanel = (only: 'wind' | 'noise') => sitePackage ? (
    <ClimatePanel terrainReliefM={windCentre ? terrainRelief(sitePackage.terrain, windCentre, wind.radius) : 0} showModes={false} showQuick availableHeights={freshFlow?.slices?.map((slice) => slice.z) ?? []} slicesComplete={!!freshFlow?.slicesComplete} sliceHeights={freshFlow?.sliceHeights} demoPlaying={windDemo.playing} onToggleDemo={windDemo.toggle} onDemoEdit={windDemo.stopWith} sweepOn={sweepOn} onSweepChange={setSweepOn} sweep={sweepSummary ? { sectors: sweepSummary.perDirection, worstFrom: sweepSummary.worst?.from ?? null, total: SWEEP_DIRECTIONS.length } : null} mode={only} onModeChange={setClimateMode} wind={wind} onWindChange={setWind} placingCircle={placingCircle} onPlaceCircle={setPlacingCircle} view={climateMode === only ? climateView : null}
      streamlines={streamlines} onStreamlinesChange={setStreamlines}
      baseline={baseline} baselineMismatch={baselineMismatch} canSetBaseline={!!freshFlow?.settled && !!freshFlow?.slicesComplete}
      onSetBaseline={() => { if (windFlow?.settled && windFlow.slicesComplete && isCurrentFlow(windFlow) && windCentre) setBaseline(captureBaseline(windFlow, { centre: windCentre, radius: wind.radius }, wind.from, wind.downwash)) }}
      onClearBaseline={() => { setBaseline(null); setWind((w) => ({ ...w, display: w.display === 'delta' ? 'activity' : w.display })) }} />
  ) : null
  const drawHint = 'Click the ground to place corners · Enter to finish · Backspace removes a point · Esc cancels'
  // One card per analysis, in the Parameters panel (ADR-0026). The open card is the analysis on the map.
  const analysisCards: AnalysisCard[] = [
    {
      id: 'sun',
      label: 'Sun',
      icon: 'sun',
      stat: solar
        ? sunAnalysis === 'sun-hours'
          ? sunHoursStat(sunHoursCells, sunTime.date)
          : sunAnalysis === 'roof-solar'
            ? roofSolarStat(roofSolarValues)
            : sunAnalysis === 'facade'
              ? facadeSunStat(facadeSunValues, sunTime.date)
              : sunAnalysis === 'vsc'
                ? vscStat(vscValues)
                : sunStat(solar.state, clockLabel(sunTime.minuteOfDay))
        : { value: null, unit: '', hint: 'Site loading', secondary: [] },
      note: sunAnalysis === 'sun-hours' ? SUN_HOURS_DISCLAIMER : sunAnalysis === 'roof-solar' ? ROOF_SOLAR_DISCLAIMER : sunAnalysis === 'facade' ? FACADE_SUN_DISCLAIMER : sunAnalysis === 'vsc' ? VSC_DISCLAIMER : 'Geometric sun direction — not a daylight assessment',
      body: solar && sitePackage ? (
        <div className="space-y-4">
          {/* The time band: the day profile, the time slider and playback. The analysis switch lives in SunDetails. */}
          <SunBand time={sunTime} onChange={setSunTime} state={solar.state} location={sitePackage.manifest.location} playback={playback} />
          {climateMode === 'sun-hours' && climateView && climateView.assessed > 0 && (
            <ShareBar entries={climateView.legend} label="Share of the study area by band" />
          )}
          {roofSolarActive && roofSolarValues && roofSolarValues.length > 0 && (
            <ShareBar entries={roofSolarLegend(roofSolarValues)} label="Share of roofs by band" />
          )}
          {facadeActive && facadeSunValues.length > 0 && (
            <ShareBar entries={facadeSunLegend(facadeSunValues)} label="Share of your façades by band" />
          )}
          {vscActive && vscValues.length > 0 && (
            <ShareBar entries={vscLegend(vscValues)} label="Share of your façades by band" />
          )}
          <SunDetails time={sunTime} onChange={setSunTime} state={solar.state} resolved={solar.resolved} location={sitePackage.manifest.location} playback={playback} analysis={sunAnalysis} onAnalysisChange={setSunAnalysis} roofSolar={sunAnalysis === 'roof-solar' ? roofSolarSummary : null} />
        </div>
      ) : <p className="text-body-sm text-ink-secondary">The site package is loading.</p>,
    },
    {
      id: 'wind',
      label: 'Wind',
      icon: 'wind',
      stat: windStat(windComfortView, wind.from, wind.refSpeed, climateMode === 'wind'),
      note: `${FLOW_DISCLAIMER} · figure = share of open ground ≥ ${ROSE_THRESHOLD_MS} m/s`,
      body: climatePanel('wind') ?? <p className="text-body-sm text-ink-secondary">The site package is loading.</p>,
    },
    {
      id: 'noise',
      label: 'Noise',
      icon: 'noise',
      stat: noiseStat(noiseCells, sitePackage?.roads ?? []),
      note: NOISE_DISCLAIMER,
      body: climatePanel('noise') ?? <p className="text-body-sm text-ink-secondary">The site package is loading.</p>,
    },
  ]
  // The open card is the analysis on the map; closing it turns the layer off.
  const selectAnalysisCard = (id: AnalysisId) => setActiveCard((current) => (current === id ? null : id))
  const blockCount = shown.volumes.length
  // While drawing, the panel says what the next click does; otherwise it offers another footprint.
  const drawAction = !testBuilding ? null : editor.tool === 'draw'
    ? <p className="mt-3 text-caption text-ink-secondary">{drawHint}</p>
    : editable
      ? <button type="button" onClick={() => selectTool('draw')} className={cn(pillButtonClass, 'mt-3')}>Draw another <Icon name="plus" size={12} /></button>
      : null
  const ready = packageStatus === 'ready'
  return (
    <div ref={studioRoot} data-demo={windDemo.playing ? 'playing' : undefined} className="flex min-h-dvh flex-col gap-3 bg-canvas p-3 text-ink lg:h-dvh">
      <style>{`[data-demo="playing"] aside[aria-label="Parameters"] { scrollbar-width: none; }
        [data-demo="playing"] aside[aria-label="Parameters"]::-webkit-scrollbar { display: none; }`}</style>

      <main className="grid flex-1 gap-3 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_minmax(0,1fr)] lg:[&>aside]:col-start-2 lg:[&>aside]:row-start-2">
        <StudioTopBar
          site={site}
          backTo={backTo}
          canFit={ready}
          onFitSite={() => requestCamera('isometric')}
          toolbar={testBuilding && wide ? (
            <ToolRail
              ready={ready}
              activeTool={editor.tool === 'draw' ? 'draw' : 'select'}
              onSelect={selectTool}
              canUndo={editable && idle && editor.history.undoStack.length > 0}
              canRedo={editable && idle && editor.history.redoStack.length > 0}
              onUndo={() => dispatch({ type: 'undo' })}
              onRedo={() => dispatch({ type: 'redo' })}
              canDelete={editable && idle && selectedDeletable}
              onDelete={() => { if (selectedVolume) runCommand(removeVolume(selectedVolume.id)) }}
            />
          ) : null}
          exportAction={ready ? <button type="button" className="min-h-9 text-body-sm text-ink-secondary hover:text-ink" onClick={() => {
            const group = studioRoot.current?.querySelector<HTMLDetailsElement>('#panel-group-export')
            if (group) { group.open = true; group.scrollIntoView({ block: 'nearest' }); group.querySelector<HTMLElement>('button')?.focus() }
          }}>Export</button> : null}
          modeAction={ready && wide ? (
            <button type="button" aria-pressed={testBuilding} onClick={toggleTestBuilding} className="min-h-9 rounded-pill border border-card-line bg-card px-3.5 text-body-sm text-ink shadow-card aria-pressed:border-accent aria-pressed:text-accent">
              Add a block
            </button>
          ) : null}
        />
        <section aria-label="Studio viewport" className="tf-rise relative flex h-[min(720px,70dvh)] min-w-0 flex-col overflow-hidden rounded-panel border border-card-line bg-viewport shadow-card max-sm:h-[360px] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:h-auto lg:min-h-[280px]">
          {ready && sitePackage && solar ? (
            <>
              <ViewportCanvas
                sitePackage={sitePackage}
                sun={solar.state}
                layers={layers}
                presetId={cameraPreset}
                cameraNonce={cameraNonce}
                editor={editor}
                dispatch={dispatch}
                editable={editable}
                annotations={annotations}
                renderPreference="auto"
                climate={climateView?.overlay ?? null}
                roofSolar={roofSolarActive ? roofSolarValues : null}
                facade={facadeActive || vscActive ? facadeOverlay : null}
                demoOrbitDeg={windDemo.orbitDeg}
                onStopDemo={windDemo.stop}
                windStreamlines={streamlines}
                windSettings={wind}
                windBuildings={analysisBuildings}
                windBaseline={baseline}
                windFlow={climateMode === 'wind' ? windFlow : null}
                windWorst={climateMode === 'wind' && wind.display === 'worst' && sweep ? { cells: sweep.cells, worstFrom } : null}
                windCircle={climateMode === 'wind' ? windCircle : null}
                onPickPoint={placingCircle ? (point) => { setWind((w) => ({ ...w, centre: point })); setPlacingCircle(false) } : undefined}
                exportRequest={exportRequest}
                onExport={onExport}
              />
            </>
          ) : packageStatus === 'loading' ? (
            <div className="flex h-full flex-col gap-6 p-6 pt-20">
              <p role="status" className="text-body-sm text-ink-secondary">Loading site package</p>
              <div aria-hidden="true" className="flex flex-1 flex-col justify-between motion-safe:animate-pulse motion-reduce:animate-none">
                <div className="h-4 w-40 rounded-chip bg-muted-fill" />
                <div className="my-6 min-h-32 flex-1 rounded-card border border-line bg-app" />
              </div>
            </div>
          ) : (
            <div className="grid h-full place-items-center p-4 pt-20">
              <div className="w-full max-w-[23rem] text-center">
                <p className="text-caption text-ink-secondary">{site.title} · Package error</p>
                <h1 className="mt-2.5 text-balance text-title text-ink">
                  The site model could not be loaded.
                </h1>
                <p className="mx-auto mt-3 max-w-[36ch] text-body-sm leading-relaxed text-ink-secondary">
                  The site package is missing or could not be read. Try again, or choose another site.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-4">
                  <button type="button" className={textButtonClass} onClick={onRetry}>
                    Try again
                  </button>
                  <Link to="/#sites" className={textButtonClass}>Back to sites</Link>
                </div>
              </div>
            </div>
          )}

          {/* Errors and draw instructions. */}
          {ready && (editor.error || editor.tool === 'draw') && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-52 lg:top-[60px]">
              <p
                role="status"
                aria-live="polite"
                className={cn(
                  'max-w-[60ch] rounded-pill bg-surface-inverse px-3 py-1.5 text-center text-mono-sm',
                  editor.error ? 'text-ink-on-inverse' : 'text-ink-on-inverse-2',
                )}
              >
                {editor.error && <Icon name="warn" size={12} className="mr-1.5 inline text-danger" />}
                {editor.error ?? drawHint}
              </p>
            </div>
          )}
        </section>

        {packageStatus === 'loading' ? (
          <div aria-hidden="true" className="overflow-hidden rounded-panel border border-card-line bg-card p-6 shadow-card lg:col-start-2 lg:row-span-2 lg:row-start-2">
            <div className="space-y-6 motion-safe:animate-pulse motion-reduce:animate-none">
              <div className="h-4 w-28 rounded-chip bg-muted-fill" />
              <div className="h-24 rounded-chip bg-muted-fill" />
              <div className="h-10 rounded-chip bg-muted-fill" />
              <div className="h-10 rounded-chip bg-muted-fill" />
            </div>
          </div>
        ) : <Inspector
          analysisCards={<AnalysisCards cards={analysisCards} active={activeCard} onSelect={selectAnalysisCard} />}
          analysisOnly={analysisOnly}
          layers={<LayersCard manifest={sitePackage?.manifest ?? null} layers={layers} onToggleLayer={toggleLayer} />}
          site={site}
          manifest={sitePackage?.manifest ?? null}
          packageStatus={packageStatus}
          views={ready ? <CameraPresets active={cameraPreset} onSelect={requestCamera} /> : null}
          visuals={ready ? <ExportVisuals siteId={site.id} exporting={exportRequest !== null} message={exportMessage}
            onExportPasses={() => {
              // The exporter lives inside the canvas; without one nothing would ever clear the request.
              if (!document.querySelector('section[aria-label="Studio viewport"] canvas')) return setExportMessage('Viewport not ready.')
              setExportMessage('Rendering 4K passes…')
              setExportRequest(Date.now())
            }} /> : null}
          selected={selected}
          canEdit={editable}
          editingEnabled={editable && idle}
          onCommand={runCommand}
          selectionMeta={`${blockCount} ${blockCount === 1 ? 'block' : 'blocks'}`}
          selectionExtra={drawAction}
        />}
      </main>
    </div>
  )
}
