import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { constraintsFromManifest, evaluateEnvelope, type HeightReference } from '../../features/analysis/constraints'
import { sunState } from '../../features/analysis/sun'
import { buildClimateView, type ClimateMode } from '../../features/analysis/climateView'
import { ClimatePanel } from './ClimatePanel'
import { localDayMinuteToInstant } from '../../features/analysis/time'
import type { SunTime } from './SunPanel'
import type { MassingCommand } from '../../features/editor/history'
import { commandError, displayedDocument } from '../../features/editor/interaction'
import { getScenarioRepository } from '../../features/scenarios/defaultRepository'
import type { ScenarioRepository } from '../../features/scenarios/repository'
import { scenarioMetrics } from '../../features/massing/metrics'
import { checkClearance, type ClearanceIssue } from '../../features/massing/clearance'
import { sampleTerrainHeight } from '../../features/sites/geometry'
import { normalizeRing } from '../../lib/polygon'
import type { CameraPresetId } from '../../features/sites/manifest'
import type { SitePackage } from '../../features/sites/package'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import { readRenderPreference, writeRenderPreference } from '../../scene/renderQuality'
import { ViewportCanvas, type SceneLayers } from '../../scene/ViewportCanvas'
import type { MassAnnotation } from '../../scene/MassLayer'
import { cn } from '../../lib/cn'
import { textButtonClass } from '../ui/controls'
import { Icon } from '../ui/Icon'
import { CameraPresets } from './CameraPresets'
import { summarizeChecks } from './checks'
import { ConstraintsPanel } from './ConstraintsPanel'
import { formatArea, formatMetres } from './format'
import { massSummary } from '../../features/analysis/massSummary'
import { Inspector, type PanelGroup } from './Inspector'
import { MetricsPanel } from './MetricsPanel'
import type { SnapshotResult, SnapshotRequest } from '../../scene/ScenarioSnapshots'
import { ComparePanel } from './ComparePanel'
import { ProjectBackup, RecoveryStrip } from './ProjectRecovery'
import { ScenarioMenu } from './ScenarioMenu'
import { ScenarioNotes } from './ScenarioNotes'
import { StudioGuide, readGuideDismissed } from './StudioGuide'
import { StudioTopBar } from './StudioTopBar'
import { SunBand, SunDetails, shortDate, useSunPlayback } from './SunPanel'
import { ToolRail, type ToolId } from './ToolRail'
import { useScenarioProject } from './useScenarioProject'

type PackageStatus = 'loading' | 'ready' | 'error'

type StudioShellProps = {
  site: SiteSummary
  sitePackage: SitePackage | null
  packageStatus: PackageStatus
  packageError: string | null
  onRetry: () => void
  /** Injected in tests; the app uses the shared IndexedDB repository. */
  repository?: ScenarioRepository
}

export function StudioShell({
  site,
  sitePackage,
  packageStatus,
  onRetry,
  repository,
}: StudioShellProps) {
  const [guideOpen, setGuideOpen] = useState(() => !readGuideDismissed())
  const studioRoot = useRef<HTMLDivElement>(null)
  const closeGuide = useCallback(() => setGuideOpen(false), [])
  const project = useScenarioProject({ siteId: site.id, repository: repository ?? getScenarioRepository() })
  const { editor, dispatch } = project
  const [comparePair, setComparePair] = useState<readonly [string, string] | null>(null)
  const [snapshot, setSnapshot] = useState<SnapshotResult | null>(null)
  const compareTrigger = useRef<HTMLButtonElement>(null)
  // A deleted scenario can't stay in the compare pair: close Compare and return focus (review).
  useEffect(() => {
    if (!comparePair || comparePair.every((id) => project.scenarios.some((item) => item.id === id))) return
    setComparePair(null)
    compareTrigger.current?.focus()
  }, [comparePair, project.scenarios])
  const [heightReference, setHeightReference] = useState<HeightReference>('grade')
  const [sunTime, setSunTime] = useState<SunTime>({ date: '2026-06-21', minuteOfDay: 900 })
  const solar = useMemo(() => {
    if (!sitePackage) return null
    const { latitude, longitude, timeZone } = sitePackage.manifest.location
    const resolved = localDayMinuteToInstant(sunTime.date, sunTime.minuteOfDay, timeZone)
    return { resolved, state: sunState(resolved.instant, latitude, longitude, timeZone) }
  }, [sunTime, sitePackage])
  const playback = useSunPlayback(setSunTime)
  const [panelFocus, setPanelFocus] = useState<{ group: PanelGroup; nonce: number }>({ group: 'layers', nonce: 0 })
  const [renderPreference, setRenderPreference] = useState(readRenderPreference)
  // Below 640 px the studio is a read-only preview (M0 visual gate).
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 640px)').matches)
  // Editing waits for the scenario project to load, so no edit can be lost to the load.
  const editable = wide && project.ready
  const [layers, setLayers] = useState<SceneLayers>({
    terrain: true,
    context: true,
    streets: true,
    trees: true,
    parcel: true,
    setback: true,
    heightLimit: true,
  })
  const [climateMode, setClimateMode] = useState<ClimateMode>('off')
  const [windFrom, setWindFrom] = useState(270)
  const climateView = useMemo(() => {
    if (!sitePackage || climateMode === 'off') return null
    return buildClimateView(
      climateMode,
      normalizeRing(sitePackage.studyArea.polygon),
      sitePackage.buildings.buildings,
      sitePackage.roads,
      windFrom,
    )
  }, [sitePackage, climateMode, windFrom])
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('isometric')
  const [cameraNonce, setCameraNonce] = useState(0)
  const scenario = editor.history.document.name
  // The displayed document follows a live drag, so the inspector and warnings show preview values.
  const shown = displayedDocument(editor)
  // displayedDocument includes hidden masses; analysis explicitly uses only visible previews.
  const analysisDocument = useMemo(() => ({ ...shown, volumes: shown.volumes.filter((volume) => volume.visible) }), [shown])
  const metrics = useMemo(() => sitePackage
    ? scenarioMetrics(analysisDocument, normalizeRing(sitePackage.studyArea.polygon))
    : null, [analysisDocument, sitePackage])
  const clearance = useMemo(
    () =>
      sitePackage
        ? checkClearance(analysisDocument, {
            studyArea: normalizeRing(sitePackage.studyArea.polygon),
            heightAt: (east, north) => sampleTerrainHeight(sitePackage.terrain, east, north),
          })
        : new Map<string, readonly ClearanceIssue[]>(),
    [analysisDocument, sitePackage],
  )
  const constraints = useMemo(() => sitePackage ? constraintsFromManifest(sitePackage.manifest.constraints, heightReference) : null, [sitePackage, heightReference])
  const envelopeSite = useMemo(() => sitePackage ? ({
    studyArea: normalizeRing(sitePackage.studyArea.polygon),
    heightAt: (east: number, north: number) => sampleTerrainHeight(sitePackage.terrain, east, north),
    constraints,
  }) : null, [sitePackage, constraints])
  const envelope = useMemo(() => envelopeSite ? evaluateEnvelope(analysisDocument, envelopeSite) : null, [analysisDocument, envelopeSite])
  // One height and floor count per mass for the list, the scene labels and Tallest (ADR-0010 §4).
  const summaries = useMemo(() => {
    if (!sitePackage) return new Map<string, ReturnType<typeof massSummary>>()
    const site = {
      studyArea: normalizeRing(sitePackage.studyArea.polygon),
      heightAt: (east: number, north: number) => sampleTerrainHeight(sitePackage.terrain, east, north),
      constraints,
    }
    return new Map(shown.volumes.map((volume) => [volume.id, massSummary(volume, site, heightReference)]))
  }, [shown.volumes, sitePackage, constraints, heightReference])
  const warnedVolumes = useMemo(() => new Set([
    ...clearance.keys(),
    ...(envelope?.perVolume.filter((volume) => volume.status === 'exceeds').map((volume) => volume.volumeId) ?? []),
  ]), [clearance, envelope])

  const selectedVolume = shown.volumes.find(
    (volume) => volume.id === editor.history.selection.volumeId,
  )
  const selectedTier = selectedVolume?.tiers.find(
    (tier) => tier.id === editor.history.selection.tierId,
  )
  const selected =
    selectedVolume && selectedTier
      ? { volume: selectedVolume, tier: selectedTier, warnings: clearance.get(selectedVolume.id) }
      : null

  const masses = shown.volumes.map((volume) => {
    const summary = summaries.get(volume.id)
    const tiers = volume.tiers.length > 1 ? ` · ${volume.tiers.length} tiers` : ''
    return {
      id: volume.id,
      name: volume.name,
      detail: summary ? `${summary.floors} floors · ${formatMetres(summary.heightM)}${tiers}` : '',
      gfa: (() => {
        const entry = metrics?.perVolume.find((candidate) => candidate.volumeId === volume.id)
        return entry ? formatArea(entry.gfaM2) : undefined
      })(),
      hidden: !volume.visible,
      warning: warnedVolumes.has(volume.id),
    }
  })
  const selectMass = (volumeId: string) => {
    const tiers = shown.volumes.find((volume) => volume.id === volumeId)?.tiers ?? []
    const tierId = [...tiers].sort((a, b) => a.baseElevation - b.baseElevation)[0]?.id ?? null
    dispatch({ type: 'select', selection: { volumeId, tierId } })
  }
  const idle = editor.interaction.kind === 'idle'

  const runCommand = (command: MassingCommand) => {
    const problem = commandError(editor, command)
    if (!problem) dispatch({ type: 'command', command })
    return problem
  }

  const requestCamera = useCallback((preset: CameraPresetId) => {
    setCameraPreset(preset)
    setCameraNonce((value) => value + 1)
  }, [])

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
      // The scenario menu is a text-entry surface: letters there are not shortcuts.
      if (target?.closest('input, select, textarea, dialog, [role="group"][aria-label="Scenarios"], [contenteditable="true"]')) return

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        requestCamera('isometric')
      }

      if (event.key === 'Escape') dispatch({ type: 'key', key: 'Escape' })

      if (event.key === 'Enter' || event.key === 'Backspace') {
        if (target?.closest('button, a, summary')) return
        event.preventDefault()
        dispatch({ type: 'key', key: event.key })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatch, requestCamera])

  const checks = useMemo(() => summarizeChecks(envelope, clearance, sitePackage?.manifest.constraints ?? null), [envelope, clearance, sitePackage])
  const annotations = useMemo(() => new Map<string, MassAnnotation>(analysisDocument.volumes.flatMap((volume) => {
    const summary = summaries.get(volume.id)
    return summary ? [[volume.id, {
      title: volume.name,
      detail: `${summary.floors} fl · ${formatMetres(summary.heightM)}`,
      status: warnedVolumes.has(volume.id) ? 'attention' : 'pass',
    }] as const] : []
  })), [analysisDocument, summaries, warnedVolumes])
  const visibleHeights = analysisDocument.volumes.flatMap((volume) => summaries.get(volume.id)?.heightM ?? [])
  const limits = sitePackage?.manifest.constraints ?? null

  const compareA = project.scenarios.find((item) => item.id === comparePair?.[0])
  const compareB = project.scenarios.find((item) => item.id === comparePair?.[1])
  const snapshotRequest = useMemo<SnapshotRequest | null>(() => compareA && compareB && sitePackage && envelopeSite
    ? { a: compareA, b: compareB, preset: sitePackage.manifest.cameraPresets[cameraPreset], site: envelopeSite, layers, sunKey: `${sunTime.date}:${sunTime.minuteOfDay}` }
    : null, [compareA, compareB, sitePackage, envelopeSite, cameraPreset, layers, sunTime])
  const closeCompare = () => { setComparePair(null); compareTrigger.current?.focus() }
  return (
    <div ref={studioRoot} className="flex min-h-dvh flex-col bg-app text-ink lg:h-dvh">
      <StudioTopBar
        site={site}
        scenario={scenario}
        guideAction={wide && packageStatus === 'ready' && project.ready ? (
          <button type="button" className="min-h-9 text-caption underline underline-offset-4" onClick={() => setGuideOpen(true)}>Guide</button>
        ) : null}
        scenarioMenu={<ScenarioMenu project={project} site={envelopeSite} />}
        compareAction={<button ref={compareTrigger} type="button" className="min-h-9 text-caption disabled:text-ink-disabled" disabled={!project.ready || !idle || !envelopeSite || project.scenarios.length < 2} onClick={async () => {
          await project.actions.flush()
          const index = project.scenarios.findIndex((item) => item.id === project.activeId)
          const a = project.scenarios[index]
          const b = project.scenarios[(index + 1) % project.scenarios.length]
          if (a && b) setComparePair([a.id, b.id])
        }}>Compare</button>}
        saveStatus={project.saveStatus}
        storage={project.storage}
        canFit={packageStatus === 'ready'}
        onFitSite={() => requestCamera('isometric')}
      />

      {guideOpen && wide && packageStatus === 'ready' && project.ready && (
        <StudioGuide onClose={closeGuide} onShowControl={(step) => {
          const selectors = ['[data-guide="draw"]', '[aria-label="Local time"]', '[data-guide="scenarios"]']
          const selector = selectors[step]
          if (selector) studioRoot.current?.querySelector<HTMLElement>(selector)?.focus()
        }} />
      )}

      <main className="grid flex-1 gap-2 px-4 pb-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_392px]">
        <section aria-label="Studio viewport" className="tf-rise flex h-[min(720px,78dvh)] min-w-0 flex-col overflow-hidden rounded-card bg-viewport max-sm:h-auto lg:h-auto">
          <div className="relative min-h-0 flex-1 max-sm:h-[360px] max-sm:flex-none">
            {/* First in tab order: the toolbar sits top-left, before the views (review). */}
            <ToolRail
              ready={packageStatus === 'ready'}
              activeTool={editor.tool}
              onSelect={selectTool}
              canUndo={editable && idle && editor.history.undoStack.length > 0}
              canRedo={editable && idle && editor.history.redoStack.length > 0}
              onUndo={() => dispatch({ type: 'undo' })}
              onRedo={() => dispatch({ type: 'redo' })}
              onOpenLayers={() => setPanelFocus((current) => ({ group: 'layers', nonce: current.nonce + 1 }))}
            />
            {packageStatus === 'ready' && sitePackage && solar ? (
              <>
                <ViewportCanvas
                  sitePackage={sitePackage}
                  snapshotRequest={snapshotRequest}
                  onSnapshot={setSnapshot}
                  sun={solar.state}
                  constraints={constraints}
                  envelope={envelope}
                  layers={layers}
                  presetId={cameraPreset}
                  cameraNonce={cameraNonce}
                  editor={editor}
                  dispatch={dispatch}
                  editable={editable}
                  warnedVolumes={warnedVolumes}
                  annotations={annotations}
                  renderPreference={renderPreference}
                  climate={climateView?.overlay ?? null}
                />
                <CameraPresets active={cameraPreset} onSelect={requestCamera} />
              </>
            ) : packageStatus === 'loading' ? (
              <div className="flex h-full flex-col gap-6 p-6 pt-20">
                <p role="status" className="text-body-sm text-ink-secondary">Loading site package</p>
                <div aria-hidden="true" className="flex flex-1 flex-col justify-between motion-safe:animate-pulse motion-reduce:animate-none">
                  <div className="h-4 w-40 rounded-chip bg-muted-fill" />
                  <div className="min-h-32 flex-1 my-6 rounded-card border border-line bg-app" />
                  <div className="h-12 border-t border-line bg-surface" />
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


            {/* Errors and draw instructions only: warnings live in the design check (assessment #5). */}
            {packageStatus === 'ready' && (editor.error || editor.tool === 'draw') && (
              <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center px-6">
                <p
                  role="status"
                  aria-live="polite"
                  className={cn(
                    'max-w-[60ch] rounded-chip bg-surface-inverse px-3 py-1.5 text-center text-mono-sm',
                    editor.error ? 'text-ink-on-inverse' : 'text-ink-on-inverse-2',
                  )}
                >
                  {editor.error && <Icon name="warn" size={12} className="mr-1.5 inline text-danger" />}
                  {editor.error ?? 'Click the ground to place corners · Enter to finish · Backspace removes a point · Esc cancels'}
                </p>
              </div>
            )}
          </div>

          {solar && sitePackage && (
            <SunBand time={sunTime} onChange={setSunTime} state={solar.state} location={sitePackage.manifest.location} playback={playback} />
          )}
        </section>

        {packageStatus === 'loading' ? (
          <div aria-hidden="true" className="overflow-hidden rounded-card bg-surface p-6 lg:overflow-y-auto">
            <div className="space-y-6 motion-safe:animate-pulse motion-reduce:animate-none">
              <div className="h-4 w-28 rounded-chip bg-muted-fill" />
              <div className="h-24 rounded-chip bg-muted-fill" />
              <div className="grid grid-cols-2 gap-4 border-t border-line pt-6">
                <div className="h-16 rounded-chip bg-muted-fill" />
                <div className="h-16 rounded-chip bg-muted-fill" />
              </div>
              <div className="space-y-4 border-t border-line pt-6">
                <div className="h-4 w-32 rounded-chip bg-muted-fill" />
                <div className="h-10 rounded-chip bg-muted-fill" />
                <div className="h-10 rounded-chip bg-muted-fill" />
              </div>
            </div>
          </div>
        ) : compareA && compareB && envelopeSite ? <ComparePanel
          scenarios={project.scenarios} a={compareA} b={compareB} site={envelopeSite}
          thumbnails={snapshot?.request !== snapshotRequest ? 'pending' : snapshot.images ?? 'failed'}
          cameraLabel={cameraPreset} disabled={!idle}
          onPairChange={(a, b) => setComparePair([a, b])}
          onEdit={(id) => { project.actions.switchTo(id); closeCompare() }} onClose={closeCompare}
        /> : <Inspector
          recovery={<RecoveryStrip project={project} siteId={site.id} />}
          backup={<ProjectBackup project={project} siteId={site.id} />}
          notes={<ScenarioNotes key={`${shown.id}:${shown.notes}`} notes={shown.notes} disabled={!editable || !idle} onCommit={project.actions.setNotes} />}
          check={
            <ConstraintsPanel
              envelope={envelope}
              limits={limits}
              heightReference={heightReference}
              onHeightReferenceChange={setHeightReference}
              masses={masses}
              onSelectMass={selectMass}
              checks={checks}
              clearance={clearance}
            />
          }
          figures={<MetricsPanel metrics={metrics} tallestM={visibleHeights.length > 0 ? Math.max(...visibleHeights) : undefined} limitM={limits?.maxHeightMeters ?? null} reference={heightReference} />}
          sun={solar && sitePackage ? (
            <SunDetails time={sunTime} onChange={setSunTime} state={solar.state} resolved={solar.resolved} location={sitePackage.manifest.location} playback={playback} />
          ) : null}
          sunMeta={sitePackage
            ? `${shortDate(sunTime.date)} · ${Math.abs(sitePackage.manifest.location.latitude).toFixed(1)}° ${sitePackage.manifest.location.latitude >= 0 ? 'N' : 'S'}`
            : shortDate(sunTime.date)}
          climate={sitePackage ? (
            <ClimatePanel mode={climateMode} onModeChange={setClimateMode} windFrom={windFrom} onWindFromChange={setWindFrom} view={climateView} />
          ) : null}
          climateMeta={climateMode === 'off' ? 'Off' : climateMode === 'wind' ? 'Wind' : 'Noise'}
          metrics={metrics}
          site={site}
          manifest={sitePackage?.manifest ?? null}
          packageStatus={packageStatus}
          layers={layers}
          onToggleLayer={toggleLayer}
          renderPreference={renderPreference}
          onRenderPreferenceChange={(preference) => setRenderPreference(writeRenderPreference(preference))}
          focusGroup={panelFocus.group}
          focusNonce={panelFocus.nonce}
          selected={selected}
          canEdit={editable}
          editingEnabled={editable && idle}
          onCommand={runCommand}
          masses={masses}
          onSelectMass={selectMass}
          onSelectTier={(tierId) =>
            dispatch({ type: 'select', selection: { volumeId: editor.history.selection.volumeId, tierId } })
          }
          onAddMass={() => selectTool('draw')}
        />}
      </main>
    </div>
  )
}
