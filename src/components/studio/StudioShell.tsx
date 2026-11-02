import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
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
import { textButtonClass } from '../ui/controls'
import { Icon } from '../ui/Icon'
import { CameraPresets } from './CameraPresets'
import { summarizeChecks } from './checks'
import { ConstraintsPanel } from './ConstraintsPanel'
import { formatArea, formatMetres } from './format'
import { massSummary } from './massSummary'
import { Inspector, type PanelGroup } from './Inspector'
import { MetricsPanel } from './MetricsPanel'
import { StudioTopBar } from './StudioTopBar'
import { SunBand, SunDetails, shortDate, useSunPlayback } from './SunPanel'
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
  const playback = useSunPlayback(setSunTime)
  const [panelFocus, setPanelFocus] = useState<{ group: PanelGroup; nonce: number }>({ group: 'layers', nonce: 0 })
  const [renderPreference, setRenderPreference] = useState(readRenderPreference)
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

      if (event.key === 'Escape') dispatch({ type: 'key', key: 'Escape' })

      if (event.key === 'Enter' || event.key === 'Backspace') {
        if (target?.closest('button, a, summary')) return
        event.preventDefault()
        dispatch({ type: 'key', key: event.key })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestCamera])

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

  return (
    <div className="flex min-h-dvh flex-col bg-app text-ink lg:h-dvh">
      <StudioTopBar
        site={site}
        scenario={scenario}
        canFit={packageStatus === 'ready'}
        onFitSite={() => requestCamera('isometric')}
      />

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
                  <p className="text-caption text-ink-secondary">
                    {site.title} · {packageStatus === 'error' ? 'Package error' : 'Loading'}
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

        <Inspector
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
        />
      </main>
    </div>
  )
}
