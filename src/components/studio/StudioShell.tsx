import { useCallback, useEffect, useReducer, useState } from 'react'
import { Link } from 'react-router-dom'
import { createHistory } from '../../features/editor/history'
import { createEditorState, reduceEditor } from '../../features/editor/interaction'
import { tierHeight } from '../../features/massing/aggregate'
import { createScenario } from '../../features/massing/factories'
import type { CameraPresetId } from '../../features/sites/manifest'
import type { SitePackage } from '../../features/sites/package'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import { CameraHud } from '../../scene/CameraHud'
import { ViewportCanvas, type SceneLayers } from '../../scene/ViewportCanvas'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { CameraPresets } from './CameraPresets'
import { Inspector, type InspectorTab } from './Inspector'
import { StudioTopBar } from './StudioTopBar'
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
  const [activeTab, setActiveTab] = useState<InspectorTab>('model')
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() =>
    window.matchMedia('(min-width: 1100px)').matches,
  )
  // Below 640 px the studio is a read-only preview (M0 visual gate).
  const [editable, setEditable] = useState(() => window.matchMedia('(min-width: 640px)').matches)
  const [layers, setLayers] = useState<SceneLayers>({
    terrain: true,
    context: true,
    parcel: true,
  })
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('isometric')
  const [cameraNonce, setCameraNonce] = useState(0)
  const scenario = editor.history.document.name
  const selectedVolume = editor.history.document.volumes.find(
    (volume) => volume.id === editor.history.selection.volumeId,
  )
  const selectedTier = selectedVolume?.tiers.find(
    (tier) => tier.id === editor.history.selection.tierId,
  )
  const selectedSummary =
    selectedVolume && selectedTier
      ? {
          name: selectedVolume.name,
          detail: `${selectedTier.storeys} storeys · ${tierHeight(selectedTier).toFixed(1)} m`,
        }
      : null

  const requestCamera = useCallback((preset: CameraPresetId) => {
    setCameraPreset(preset)
    setCameraNonce((value) => value + 1)
  }, [])

  const toggleLayer = (layer: keyof SceneLayers) => {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }))
  }

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1100px)')
    const update = () => setIsDesktop(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

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
        setInspectorOpen(false)
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

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-app text-ink">
      <StudioTopBar
        site={site}
        scenario={scenario}
        canFit={packageStatus === 'ready'}
        onFitSite={() => requestCamera('isometric')}
        onToggleInspector={() => setInspectorOpen((open) => !open)}
        inspectorOpen={inspectorOpen}
      />

      <div className="flex min-h-0 flex-1">
        <ToolRail
          activeTool={editor.tool}
          onSelect={selectTool}
          onOpenLayers={() => setInspectorOpen(true)}
        />

        <main className="relative min-w-0 flex-1 overflow-hidden" aria-label="Studio viewport">
          {packageStatus === 'ready' && sitePackage ? (
            <>
              <ViewportCanvas
                sitePackage={sitePackage}
                layers={layers}
                presetId={cameraPreset}
                cameraNonce={cameraNonce}
                editor={editor}
                dispatch={dispatch}
                editable={editable}
              />
              <CameraHud />
              <CameraPresets active={cameraPreset} onSelect={requestCamera} />
            </>
          ) : (
            <div className="tf-paper-grid grid h-full place-items-center bg-viewport p-4">
              <div className="w-full max-w-[23rem] rounded-[14px] border border-line bg-surface/95 p-6 text-center shadow-[var(--shadow-soft)] backdrop-blur-md">
                <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-accent">
                  {site.title} · {packageStatus === 'error' ? 'Package error' : 'Loading'}
                </p>
                <h1 className="mt-2.5 text-balance font-display text-[26px] leading-[1.05] tracking-[-0.01em] text-ink">
                  {packageStatus === 'error'
                    ? 'The site model could not be loaded.'
                    : 'Preparing the curated site package.'}
                </h1>
                <p className="mx-auto mt-3 max-w-[36ch] text-[11.5px] leading-relaxed text-ink-secondary">
                  {packageStatus === 'error'
                    ? packageError ?? 'The package is unavailable.'
                    : 'Loading terrain, context buildings and the study boundary from the local package.'}
                </p>
                {packageStatus === 'error' ? (
                  <Button className="mt-4 min-h-9 px-3.5 text-[11.5px]" onClick={onRetry}>
                    Try again
                  </Button>
                ) : (
                  <span
                    aria-hidden="true"
                    className="mx-auto mt-5 block size-6 animate-pulse rounded-full border border-line bg-surface-muted"
                  />
                )}
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2 sm:left-4 sm:top-4">
            <span className="rounded-full border border-line bg-surface/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-secondary shadow-sm backdrop-blur-sm">
              {packageStatus === 'ready' ? 'Curated demo' : 'Local package'}
            </span>
            <span className="rounded-full border border-line bg-surface/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-secondary shadow-sm backdrop-blur-sm sm:hidden">
              Read-only preview
            </span>
          </div>

          {packageStatus === 'ready' && (editor.error || editor.tool === 'draw') && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-16 sm:top-4">
              <p
                role="status"
                aria-live="polite"
                className={
                  editor.error
                    ? 'max-w-[44ch] rounded-[6px] border border-danger/40 bg-surface/95 px-3 py-1.5 text-center text-[11px] text-danger shadow-sm backdrop-blur-sm'
                    : 'max-w-[44ch] rounded-[6px] border border-line bg-surface/95 px-3 py-1.5 text-center text-[11px] text-ink-secondary shadow-sm backdrop-blur-sm'
                }
              >
                {editor.error ??
                  'Click the ground to place corners · Enter to finish · Backspace removes a point · Esc cancels'}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setInspectorOpen(true)}
            className="absolute bottom-3 left-3 z-10 inline-flex min-h-8 items-center gap-1.5 rounded-[6px] border border-line bg-surface/90 px-2.5 text-[10px] font-medium text-ink-secondary shadow-sm backdrop-blur-sm transition-colors hover:text-ink min-[1100px]:hidden"
          >
            <Icon name="layers" size={13} />
            Site notes
          </button>

        </main>

        <Inspector
          site={site}
          manifest={sitePackage?.manifest ?? null}
          packageStatus={packageStatus}
          layers={layers}
          onToggleLayer={toggleLayer}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={inspectorOpen}
          onClose={() => setInspectorOpen(false)}
          isDrawer={!isDesktop}
          selected={selectedSummary}
          canEdit={editable}
        />
      </div>

      <footer className="flex h-9 shrink-0 items-center justify-between gap-4 border-t border-line bg-surface px-3 text-[10px] uppercase tracking-[0.12em] text-ink-secondary">
        <span className="truncate">
          {site.title}
          <span className="hidden sm:inline"> · {scenario}</span>
        </span>
        <span className="hidden sm:inline">Illustrative constraints · not planning advice</span>
        <span className="sm:hidden">Not planning advice</span>
        {packageStatus === 'ready' ? (
          <Link
            to="/about#data"
            className="hidden shrink-0 items-center gap-1.5 transition-colors hover:text-ink lg:inline-flex"
          >
            Data: OSM · Kartverket
          </Link>
        ) : (
          <span className="hidden shrink-0 items-center gap-1.5 lg:inline-flex">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
            {packageStatus === 'error' ? 'Package unavailable' : 'Preparing package'}
          </span>
        )}
      </footer>
    </div>
  )
}
