import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { SiteManifest } from '../../features/sites/manifest'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import type { SceneLayers } from '../../scene/ViewportCanvas'
import { isRenderPreference, type RenderPreference } from '../../scene/renderQuality'
import { cn } from '../../lib/cn'
import { checkboxClass, inputClass, labelClass, textButtonSmClass } from '../ui/controls'
import { Icon } from '../ui/Icon'
import type { MassingCommand } from '../../features/editor/history'
import type { ClearanceIssue } from '../../features/massing/clearance'
import type { MassTier, MassVolume } from '../../features/massing/types'
import type { ScenarioMetrics } from '../../features/massing/metrics'
import { MetricsNotes, SelectedFloors } from './MetricsPanel'
import { MassFields } from './MassFields'
import { MassList, type MassListItem } from './MassList'

export type DrawerGroup = 'notes' | 'site' | 'layers' | 'assumptions'

const LAYER_ROWS: ReadonlyArray<{
  id: keyof SceneLayers
  label: string
  /** Optional package file the row depends on; the row is hidden when the package lacks it. */
  asset?: 'roads' | 'trees'
}> = [
  { id: 'terrain', label: 'Terrain' },
  { id: 'context', label: 'Context buildings' },
  { id: 'streets', label: 'Streets', asset: 'roads' },
  { id: 'trees', label: 'Trees', asset: 'trees' },
  { id: 'parcel', label: 'Study boundary' },
  { id: 'setback', label: 'Setback' },
  { id: 'heightLimit', label: 'Height limit' },
]

type InspectorProps = {
  metrics: ScenarioMetrics | null
  site: SiteSummary
  manifest: SiteManifest | null
  packageStatus: 'loading' | 'ready' | 'error'
  layers: SceneLayers
  onToggleLayer: (layer: keyof SceneLayers) => void
  renderPreference: RenderPreference
  onRenderPreferenceChange: (preference: RenderPreference) => void
  isOpen: boolean
  onClose: () => void
  /** Below 640 px the drawer is a modal bottom sheet; otherwise a non-modal side panel. */
  isDrawer: boolean
  /** Group to open and scroll to when the drawer opens (the Layers rail button). */
  focusGroup?: DrawerGroup | null
  selected: { volume: MassVolume; tier: MassTier; warnings?: readonly ClearanceIssue[] } | null
  canEdit: boolean
  /** Editing allowed right now (false on small screens or during a gesture). */
  editingEnabled: boolean
  onCommand: (command: MassingCommand) => string | null
  masses: readonly MassListItem[]
  onSelectMass: (volumeId: string) => void
  onSelectTier: (tierId: string) => void
  onAddMass?: () => void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-b-0">
      <dt className={labelClass}>{label}</dt>
      <dd className="text-right text-body-sm text-ink">{value}</dd>
    </div>
  )
}

/** §7.4 collapsible group: a 48 px row with a top hairline, a meta label and a rotating chevron. */
function Group({ id, title, meta, open, onToggle, children }: {
  id: DrawerGroup
  title: string
  meta?: string
  open: boolean
  onToggle: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <details id={`drawer-group-${id}`} open={open} onToggle={(event) => onToggle(event.currentTarget.open)} className="group border-t border-line">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-body text-ink [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="flex items-center gap-3">
          {meta && <span className={labelClass}>{meta}</span>}
          <Icon name="chevron-down" size={14} className="text-ink-secondary transition-transform duration-200 group-open:rotate-180" />
        </span>
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  )
}

export function Inspector({
  metrics,
  site,
  manifest,
  packageStatus,
  layers,
  onToggleLayer,
  renderPreference,
  onRenderPreferenceChange,
  isOpen,
  onClose,
  isDrawer,
  focusGroup = null,
  selected,
  canEdit,
  editingEnabled,
  onCommand,
  masses,
  onSelectMass,
  onSelectTier,
  onAddMass,
}: InspectorProps) {
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const selectedMetrics = metrics?.perVolume.find((entry) => entry.volumeId === selected?.volume.id)
  const [openGroups, setOpenGroups] = useState<ReadonlySet<DrawerGroup>>(new Set())
  const toggleGroup = (group: DrawerGroup, open: boolean) => setOpenGroups((current) => {
    if (current.has(group) === open) return current
    const next = new Set(current)
    if (open) next.add(group)
    else next.delete(group)
    return next
  })

  // The Layers rail button opens the drawer at its group (spec §12 q6).
  useEffect(() => {
    if (!isOpen || !focusGroup) return
    setOpenGroups((current) => new Set(current).add(focusGroup))
    const frame = window.requestAnimationFrame(() => {
      const group = document.getElementById(`drawer-group-${focusGroup}`)
      // jsdom has no scrollIntoView.
      group?.scrollIntoView?.({ block: 'nearest' })
      group?.querySelector('summary')?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isOpen, focusGroup])

  useEffect(() => {
    if (!isDrawer || !isOpen) return

    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'summary, button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [isDrawer, isOpen])

  if (!isOpen) return null

  return (
    <>
      {isDrawer && (
        <button
          type="button"
          aria-label="Dismiss inspector"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-ink/20"
        />
      )}

      <aside
        ref={panelRef}
        aria-label="Inspector"
        role={isDrawer ? 'dialog' : undefined}
        aria-modal={isDrawer ? true : undefined}
        className={cn(
          'tf-drawer z-40 flex flex-col bg-surface',
          isDrawer
            ? 'fixed inset-x-0 bottom-0 max-h-[85dvh] rounded-t-card'
            : 'fixed bottom-7 right-7 top-[72px] w-[392px] max-w-[calc(100vw-56px)] rounded-card border-l border-line',
        )}
      >
        <div className="flex items-center justify-between gap-3 px-6 pb-2 pt-5">
          <h2 className="text-label text-ink">Masses</h2>
          <div className="flex items-center gap-4">
            {onAddMass && canEdit && packageStatus === 'ready' && (
              <button type="button" onClick={onAddMass} className={textButtonSmClass}>
                <Icon name="draw" size={14} />
                Add mass
              </button>
            )}
            <button
              ref={closeRef}
              type="button"
              aria-label="Close inspector"
              title="Close inspector"
              onClick={onClose}
              className="grid size-10 place-items-center text-ink-secondary transition-colors duration-200 hover:text-ink"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>

        <div className="tf-drawer-content min-h-0 flex-1 overflow-y-auto px-6 pb-4">
          {masses.length > 0 && (
            <MassList items={masses} selectedId={selected?.volume.id ?? null} onSelect={onSelectMass} />
          )}

          <section aria-labelledby="selection-heading" className="py-5">
            <div className="flex items-center justify-between">
              <h3 id="selection-heading" className="text-label text-ink">Selection</h3>
              <span className={labelClass}>{selected ? '1 selected' : 'Nothing selected'}</span>
            </div>

            {selected ? (
              <div className="mt-3">
                <MassFields
                  key={selected.tier.id}
                  volume={selected.volume}
                  tier={selected.tier}
                  disabled={!editingEnabled}
                  onCommand={onCommand}
                  warnings={selected.warnings}
                  onSelectTier={onSelectTier}
                />
                {selectedMetrics && <SelectedFloors metrics={selectedMetrics} />}
                {!canEdit && (
                  <p className="mt-2 text-body-sm text-ink-secondary">Massing is read-only on small screens.</p>
                )}
              </div>
            ) : (
              <div className="mt-3 rounded-control bg-surface-paper px-4 py-4">
                <p className="text-body-sm font-medium text-ink">No mass selected</p>
                <p className="mt-1 text-body-sm leading-relaxed text-ink-secondary">
                  {packageStatus !== 'ready'
                    ? 'Massing tools appear when the site package is ready.'
                    : canEdit
                      ? 'Use Draw footprint to add a mass, or click a mass to select it.'
                      : 'Massing is read-only on small screens.'}
                </p>
              </div>
            )}
          </section>

          <Group id="notes" title="About these numbers" meta="Method" open={openGroups.has('notes')} onToggle={(open) => toggleGroup('notes', open)}>
            <MetricsNotes metrics={metrics} />
          </Group>

          <Group id="site" title="Site package" meta={manifest ? `${manifest.statistics.buildingCount} buildings` : undefined} open={openGroups.has('site')} onToggle={(open) => toggleGroup('site', open)}>
            <dl>
              <Row label="Site" value={site.title} />
              <Row label="Morphology" value={site.morphology} />
              <Row
                label="Data"
                value={
                  packageStatus === 'ready'
                    ? 'Curated demo'
                    : packageStatus === 'error'
                      ? 'Unavailable'
                      : 'Loading'
                }
              />
              <Row
                label="Buildings"
                value={manifest ? `${manifest.statistics.buildingCount} simplified` : '—'}
              />
              <Row
                label="Terrain"
                value={manifest ? `${manifest.statistics.terrainSamples} samples` : '—'}
              />
              <Row label="Frame" value="Local ENU · metres" />
              <Row label="Constraints" value="Illustrative only" />
            </dl>
            <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">
              Buildings © OpenStreetMap contributors (ODbL). Terrain © Kartverket (CC BY 4.0).{' '}
              <Link to="/about#data" className="underline decoration-line underline-offset-2 hover:text-ink">
                Data notes
              </Link>
            </p>
          </Group>

          <Group id="layers" title="Layers & render quality" meta={renderPreference} open={openGroups.has('layers')} onToggle={(open) => toggleGroup('layers', open)}>
            <div className="space-y-0.5">
              {LAYER_ROWS.filter((row) => !row.asset || manifest?.assetPaths[row.asset]).map((row) => (
                <label
                  key={row.id}
                  className="flex min-h-9 cursor-pointer items-center justify-between gap-3 text-body-sm text-ink"
                >
                  <span>{row.label}</span>
                  <input
                    type="checkbox"
                    checked={layers[row.id]}
                    onChange={() => onToggleLayer(row.id)}
                    className={checkboxClass}
                  />
                </label>
              ))}
            </div>
            <div className="mt-3">
              <label htmlFor="render-quality" className={labelClass}>
                Render quality
              </label>
              <select
                id="render-quality"
                value={renderPreference}
                aria-describedby="render-quality-hint"
                onChange={(event) => {
                  const value = event.currentTarget.value
                  if (isRenderPreference(value)) onRenderPreferenceChange(value)
                }}
                className={cn(inputClass, 'mt-1')}
              >
                <option value="auto">Auto</option>
                <option value="high">High</option>
                <option value="balanced">Balanced</option>
                <option value="low">Low</option>
              </select>
              <p id="render-quality-hint" className="mt-1 text-body-sm leading-relaxed text-ink-secondary">
                Auto lowers quality on software rendering.
              </p>
            </div>
          </Group>

          <Group id="assumptions" title="Assumptions" meta="3.2 m storey" open={openGroups.has('assumptions')} onToggle={(open) => toggleGroup('assumptions', open)}>
            <dl>
              <Row label="Storey height" value="3.2 m" />
              <Row label="Height mode" value="Storey-driven" />
              <Row label="Units" value="Metres · 2 dp" />
            </dl>
            <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">
              Storey height and display units used by the massing model.
            </p>
          </Group>

          <p className="flex gap-2.5 border-t border-line pt-3 text-body-sm leading-relaxed text-ink-secondary">
            <Icon name="warn" size={14} className="mt-0.5 shrink-0 text-warning" />
            <span>
              <span className="font-medium text-warning-ink">Illustrative constraint.</span>{' '}
              Envelope checks are not planning advice or a compliance determination.
            </span>
          </p>
        </div>

        <div className="border-t border-line px-6 py-2.5 text-label text-ink-secondary">
          {site.dataStatus === 'curated-demo' ? 'Curated Oslo demonstration' : 'Licensed source'}
        </div>
      </aside>
    </>
  )
}
