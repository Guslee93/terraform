import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { constraintsFromManifest, evaluateEnvelope, type HeightReference } from '../../features/analysis/constraints'
import { sunState } from '../../features/analysis/sun'
import { localDayMinuteToInstant } from '../../features/analysis/time'
import type { SunTime } from './SunPanel'
import { createHistory } from '../../features/editor/history'
import type { MassingCommand } from '../../features/editor/history'
import {
  commandError,
  createEditorState,
  displayedDocument,
  reduceEditor,
} from '../../features/editor/interaction'
import { scenarioMetrics } from '../../features/massing/metrics'
import { tierHeight } from '../../features/massing/aggregate'
import { checkClearance, type ClearanceIssue } from '../../features/massing/clearance'
import { createScenario } from '../../features/massing/factories'
import { sampleTerrainHeight } from '../../features/sites/geometry'
import { normalizeRing } from '../../lib/polygon'
import type { CameraPresetId } from '../../features/sites/manifest'
import type { SitePackage } from '../../features/sites/package'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import { readRenderPreference, writeRenderPreference } from '../../scene/renderQuality'
import { ViewportCanvas, type SceneLayers } from '../../scene/ViewportCanvas'
import type { MassAnnotation } from '../../scene/MassLayer'
import { cn } from '../../lib/cn'
import { Card, CardHeader } from '../ui/Card'
import { textButtonClass } from '../ui/controls'
import { Icon } from '../ui/Icon'
import { CameraPresets } from './CameraPresets'
import { summarizeChecks } from './checks'
import { ConstraintsPanel } from './ConstraintsPanel'
import { formatArea, formatNumber, massLetter } from './format'
import { ChecksTile, GrossAreaTile, HeightTile, SunPathTile, type TileMass } from './InsightTiles'
import { Inspector, type DrawerGroup } from './Inspector'
import { MetricsPanel } from './MetricsPanel'
import { StudioTopBar, STUDIO_TABPANEL_ID, type StudioTab } from './StudioTopBar'
import { SunPanel, SunTile, useSunPlayback } from './SunPanel'
import { ToolRail, type ToolId } from './ToolRail'

type PackageStatus = 'loading' | 'ready' | 'error'

type StudioShellProps = {
  site: SiteSummary
  sitePackage: SitePackage | null
  packageStatus: PackageStatus
  packageError: string | null
  onRetry: () => void
}

export function StudioShell({
  site,
  sitePackage,
  packageStatus,
  packageError,
  onRetry,
}: StudioShellProps) {
  const [editor, dispatch] = useReducer(reduceEditor, site.id, (siteId) =>
    createEditorState(createHistory(createScenario({ siteId }))),
  )
  const [heightReference, setHeightReference] = useState<HeightReference>('grade')
  const [sunTime, setSunTime] = useState<SunTime>({ date: '2026-06-21', minuteOfDay: 900 })
  const solar = useMemo(() => {
    if (!sitePackage) return null
    const { latitude, longitude, timeZone } = sitePackage.manifest.location
    const resolved = localDayMinuteToInstant(sunTime.date, sunTime.minuteOfDay, timeZone)
    return { resolved, state: sunState(resolved.instant, latitude, longitude, timeZone) }
  }, [sunTime, sitePackage])
  const [activeTab, setActiveTab] = useState<StudioTab>('model')
  const playback = useSunPlayback(setSunTime)
  const [drawerFocus, setDrawerFocus] = useState<DrawerGroup | null>(null)
  const [renderPreference, setRenderPreference] = useState(readRenderPreference)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  // Below 640 px the studio is a read-only preview (M0 visual gate).
  const [editable, setEditable] = useState(() => window.matchMedia('(min-width: 640px)').matches)
  const [layers, setLayers] = useState<SceneLayers>({
    terrain: true,
    context: true,
    streets: true,
    trees: true,
    parcel: true,
    setback: true,
    heightLimit: true,
  })
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
  const envelope = useMemo(() => sitePackage ? evaluateEnvelope(analysisDocument, {
    studyArea: normalizeRing(sitePackage.studyArea.polygon),
    heightAt: (east, north) => sampleTerrainHeight(sitePackage.terrain, east, north),
    constraints,
  }) : null, [analysisDocument, sitePackage, constraints])
  const warnedVolumes = useMemo(() => new Set([
    ...clearance.keys(),
    ...(envelope?.perVolume.filter((volume) => volume.status === 'exceeds').map((volume) => volume.volumeId) ?? []),
  ]), [clearance, envelope])
  const warningSummary = (() => {
    if (clearance.size === 0) return null
    if (clearance.size > 1) return `${clearance.size} masses need attention`
    const first = clearance.entries().next().value
    if (!first) return null
    const [volumeId, issues] = first
    const name = shown.volumes.find((volume) => volume.id === volumeId)?.name ?? 'A mass'
    return `${name}: ${issues.map((issue) => issue.message.toLowerCase()).join(' · ')}`
  })()

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
    const base = volume.tiers[0]
    const tiers = volume.tiers.length > 1 ? ` · ${volume.tiers.length} tiers` : ''
    return {
      id: volume.id,
      name: volume.name,
      detail: base ? `${base.storeys} storeys · ${tierHeight(base).toFixed(1)} m${tiers}` : '',
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
  const idleRef = useRef(idle)
  useEffect(() => {
    idleRef.current = idle
  }, [idle])

  // The drawer covers panel 02, so Sun and Constraints close it; Model brings back a selection.
  const changeTab = (tab: StudioTab) => {
    setActiveTab(tab)
    if (tab !== 'model') setInspectorOpen(false)
    else if (editor.history.selection.volumeId) {
      setDrawerFocus(null)
      setInspectorOpen(true)
    }
  }

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

  // Selecting a mass opens the drawer at its fields (spec §7.4).
  const selectionId = editor.history.selection.volumeId
  useEffect(() => {
    if (!selectionId) return
    setDrawerFocus(null)
    setInspectorOpen(true)
  }, [selectionId])

  useEffect(() => {
    const query = window.matchMedia('(min-width: 640px)')
    const update = () => {
      setEditable(query.matches)
      if (!query.matches) dispatch({ type: 'setTool', tool: 'select' })
    }
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const selectTool = (tool: ToolId) => {
    if (tool === 'select' || tool === 'draw') dispatch({ type: 'setTool', tool })
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, select, textarea, [contenteditable="true"]')) return

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        requestCamera('isometric')
      }

      if (event.key === 'Escape') {
        // Esc cancels a gesture first; only an idle Esc closes the drawer.
        if (idleRef.current) setInspectorOpen(false)
        dispatch({ type: 'key', key: 'Escape' })
      }

      if (event.key === 'Enter' || event.key === 'Backspace') {
        if (target?.closest('button, a')) return
        event.preventDefault()
        dispatch({ type: 'key', key: event.key })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestCamera])

  const checks = useMemo(() => summarizeChecks(envelope, clearance, sitePackage?.manifest.constraints ?? null), [envelope, clearance, sitePackage])
  const letters = useMemo(() => new Map(shown.volumes.map((volume, index) => [volume.id, massLetter(index)])), [shown.volumes])
  const tileMasses = useMemo<TileMass[]>(() => (metrics?.perVolume ?? []).map((entry) => ({
    id: entry.volumeId,
    letter: letters.get(entry.volumeId) ?? '?',
    name: entry.name,
    gfaM2: entry.gfaM2,
    floors: entry.storeys.length,
    heightM: envelope?.perVolume.find((volume) => volume.volumeId === entry.volumeId)?.heightM ?? entry.maxHeightM,
  })), [metrics, envelope, letters])
  const annotations = useMemo(() => new Map<string, MassAnnotation>(tileMasses.map((mass) => [mass.id, {
    title: `${mass.letter} · ${formatNumber(mass.heightM, 1)} m`,
    detail: `${mass.floors} fl · ${formatNumber(mass.gfaM2)} m²`,
  }])), [tileMasses])
  const selectedId = editor.history.selection.volumeId

  const tileClass = 'min-h-[360px] studio:min-h-0'
  const ready = packageStatus === 'ready' && sitePackage && solar

  return (
    <div className="min-h-dvh bg-app px-4 pb-7 pt-[22px] text-ink sm:px-7">
      <div className="mx-auto max-w-[1680px]">
        <StudioTopBar
          site={site}
          scenario={scenario}
          canFit={packageStatus === 'ready'}
          onFitSite={() => requestCamera('isometric')}
          activeTab={activeTab}
          onTabChange={changeTab}
        />

        <main className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 studio:grid-cols-5 studio:grid-rows-[540px_394px]">
          <Card aria-label="Studio viewport" className="h-[420px] bg-viewport sm:col-span-2 sm:h-[520px] studio:col-span-3 studio:h-auto">
            {ready ? (
              <>
                <ViewportCanvas
                  sitePackage={sitePackage}
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
                />
                <CameraPresets active={cameraPreset} onSelect={requestCamera} />
              </>
            ) : (
              <div className="grid h-full place-items-center p-4">
                <div className="w-full max-w-[23rem] text-center">
                  <p className="text-label text-ink-secondary">
                    01 / Massing · {packageStatus === 'error' ? 'Package error' : 'Loading'}
                  </p>
                  <h1 className="mt-2.5 text-balance text-title text-ink">
                    {packageStatus === 'error'
                      ? 'The site model could not be loaded.'
                      : 'Preparing the curated site package.'}
                  </h1>
                  <p className="mx-auto mt-3 max-w-[36ch] text-body-sm leading-relaxed text-ink-secondary">
                    {packageStatus === 'error'
                      ? packageError ?? 'The package is unavailable.'
                      : 'Loading terrain, context buildings and the study boundary from the local package.'}
                  </p>
                  {packageStatus === 'error' ? (
                    <button type="button" className={`${textButtonClass} mt-4`} onClick={onRetry}>
                      Try again
                    </button>
                  ) : (
                    <span aria-hidden="true" className="mx-auto mt-5 block size-6 animate-pulse rounded-pill bg-muted-fill" />
                  )}
                </div>
              </div>
            )}

            <ToolRail
              activeTool={editor.tool}
              onSelect={selectTool}
              canUndo={editable && idle && editor.history.undoStack.length > 0}
              canRedo={editable && idle && editor.history.redoStack.length > 0}
              onUndo={() => dispatch({ type: 'undo' })}
              onRedo={() => dispatch({ type: 'redo' })}
              layersOpen={inspectorOpen && drawerFocus === 'layers'}
              onOpenLayers={() => {
                setDrawerFocus('layers')
                setInspectorOpen(true)
              }}
            />

            {packageStatus === 'ready' && (editor.error || editor.tool === 'draw' || warningSummary) && (
              <div className="pointer-events-none absolute inset-x-0 top-[22px] z-10 flex justify-center px-40">
                <p
                  role="status"
                  aria-live="polite"
                  className={cn(
                    'max-w-[52ch] rounded-control bg-surface-inverse px-3 py-2 text-center text-mono-sm',
                    editor.error ? 'text-ink-on-inverse' : 'text-ink-on-inverse-2',
                  )}
                >
                  {editor.error && <Icon name="warn" size={12} className="mr-1.5 inline text-danger" />}
                  {!editor.error && editor.tool !== 'draw' && <Icon name="warn" size={12} className="mr-1.5 inline text-warning" />}
                  {editor.error ??
                    (editor.tool === 'draw'
                      ? 'Click the ground to place corners · Enter to finish · Backspace removes a point · Esc cancels'
                      : `${warningSummary} · illustrative check`)}
                </p>
              </div>
            )}
          </Card>

          <div
            role="tabpanel"
            id={STUDIO_TABPANEL_ID}
            aria-labelledby={`studio-tab-${activeTab}`}
            className="min-h-[360px] sm:col-span-2 studio:min-h-0"
          >
            {activeTab === 'model' && <MetricsPanel metrics={metrics} />}
            {activeTab === 'sun' && (solar && sitePackage
              ? <SunPanel time={sunTime} onChange={setSunTime} {...solar} location={sitePackage.manifest.location} playback={playback} />
              : <PendingCard code="02" title="Sun position" />)}
            {activeTab === 'constraints' && (
              <ConstraintsPanel
                envelope={envelope}
                limits={sitePackage?.manifest.constraints ?? null}
                heightReference={heightReference}
                onHeightReferenceChange={setHeightReference}
                masses={masses}
                onSelectMass={selectMass}
                checks={checks}
              />
            )}
          </div>

          <div className={tileClass}><GrossAreaTile masses={tileMasses} selectedId={selectedId} /></div>
          <div className={tileClass}>
            {solar && sitePackage
              ? <SunTile time={sunTime} onChange={setSunTime} state={solar.state} location={sitePackage.manifest.location} playback={playback} />
              : <PendingCard code="04" title="Sun" />}
          </div>
          <div className={tileClass}>
            {solar && sitePackage
              ? <SunPathTile date={sunTime.date} state={solar.state} location={sitePackage.manifest.location} />
              : <PendingCard code="05" title="Sun path" />}
          </div>
          <div className={tileClass}>
            <HeightTile masses={tileMasses} selectedId={selectedId} limitM={sitePackage?.manifest.constraints.maxHeightMeters ?? null} reference={heightReference} />
          </div>
          <div className={cn(tileClass, 'sm:col-span-2 studio:col-span-1')}>
            <ChecksTile
              checks={checks}
              onOpenCheck={() => {
                changeTab('constraints')
                document.getElementById(STUDIO_TABPANEL_ID)?.scrollIntoView?.({ block: 'nearest' })
              }}
            />
          </div>
        </main>

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-label text-ink-secondary">
          <span>{site.title} · {scenario} · Local ENU metres</span>
          <span>Illustrative constraints · not planning advice</span>
          {/* Licence attribution stays on screen, not only in the drawer (ODbL, CC BY 4.0). */}
          <Link to="/about#data" className="transition-colors duration-200 hover:text-ink">Buildings © OpenStreetMap contributors (ODbL) · Terrain © Kartverket (CC BY 4.0)</Link>
        </footer>
      </div>

      <Inspector
        metrics={metrics}
        site={site}
        manifest={sitePackage?.manifest ?? null}
        packageStatus={packageStatus}
        layers={layers}
        onToggleLayer={toggleLayer}
        renderPreference={renderPreference}
        onRenderPreferenceChange={(preference) => setRenderPreference(writeRenderPreference(preference))}
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        isDrawer={!editable}
        focusGroup={drawerFocus}
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
      />
    </div>
  )
}

function PendingCard({ code, title }: { code: string; title: string }) {
  return (
    <Card className="flex h-full flex-col px-[22px] pb-5 pt-5">
      <CardHeader code={code} title={title} />
      <p className="mt-auto text-label text-ink-secondary">Appears when the site package is ready</p>
    </Card>
  )
}
