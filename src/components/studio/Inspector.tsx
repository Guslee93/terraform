import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { SiteManifest } from '../../features/sites/manifest'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import type { SceneLayers } from '../../scene/ViewportCanvas'
import { isRenderPreference, type RenderPreference } from '../../scene/renderQuality'
import { cn } from '../../lib/cn'
import { Icon } from '../ui/Icon'
import type { MassingCommand } from '../../features/editor/history'
import type { ClearanceIssue } from '../../features/massing/clearance'
import type { MassTier, MassVolume } from '../../features/massing/types'
import type { ScenarioMetrics } from '../../features/massing/metrics'
import { MetricsPanel, SelectedFloors } from './MetricsPanel'
import { ConstraintsPanel, type ConstraintsPanelProps } from './ConstraintsPanel'
import { SunPanel, type SunPanelProps } from './SunPanel'
import { MassFields } from './MassFields'
import { MassList, type MassListItem } from './MassList'

export type InspectorTab = 'model' | 'sun' | 'constraints' | 'compare'

type Tab = {
  id: InspectorTab
  label: string
  available: boolean
  note?: string
}

const TABS: readonly Tab[] = [
  { id: 'model', label: 'Model', available: true },
  { id: 'sun', label: 'Sun', available: true },
  { id: 'constraints', label: 'Constraints', available: true },
  { id: 'compare', label: 'Compare', available: false, note: 'M4' },
]

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
  constraintsPanel: ConstraintsPanelProps
  metrics: ScenarioMetrics | null
  sunPanel: SunPanelProps | null
  site: SiteSummary
  manifest: SiteManifest | null
  packageStatus: 'loading' | 'ready' | 'error'
  layers: SceneLayers
  onToggleLayer: (layer: keyof SceneLayers) => void
  renderPreference: RenderPreference
  onRenderPreferenceChange: (preference: RenderPreference) => void
  activeTab: InspectorTab
  onTabChange: (tab: InspectorTab) => void
  isOpen: boolean
  onClose: () => void
  isDrawer: boolean
  selected: { volume: MassVolume; tier: MassTier; warnings?: readonly ClearanceIssue[] } | null
  canEdit: boolean
  /** Editing allowed right now (false on small screens or during a gesture). */
  editingEnabled: boolean
  onCommand: (command: MassingCommand) => string | null
  masses: readonly MassListItem[]
  onSelectMass: (volumeId: string) => void
  onSelectTier: (tierId: string) => void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/70 py-2.5 last:border-b-0">
      <dt className="text-label text-ink-secondary">{label}</dt>
      <dd className="text-right text-body-sm font-medium text-ink">{value}</dd>
    </div>
  )
}

export function Inspector({
  constraintsPanel,
  metrics,
  sunPanel,
  site,
  manifest,
  packageStatus,
  layers,
  onToggleLayer,
  renderPreference,
  onRenderPreferenceChange,
  activeTab,
  onTabChange,
  isOpen,
  onClose,
  isDrawer,
  selected,
  canEdit,
  editingEnabled,
  onCommand,
  masses,
  onSelectMass,
  onSelectTier,
}: InspectorProps) {
  const panelRef = useRef<HTMLElement>(null)
  const selectedMetrics = metrics?.perVolume.find((entry) => entry.volumeId === selected?.volume.id)
  const closeRef = useRef<HTMLButtonElement>(null)

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

  if (isDrawer && !isOpen) return null

  return (
    <>
      {isDrawer && isOpen && (
        <button
          type="button"
          aria-label="Dismiss inspector"
          onClick={onClose}
          className="fixed inset-x-0 bottom-0 top-14 z-30 bg-ink/20 backdrop-blur-[1px]"
        />
      )}

      <aside
        ref={panelRef}
        aria-label="Inspector"
        role={isDrawer ? 'dialog' : undefined}
        aria-modal={isDrawer ? true : undefined}
        className={cn(
          'flex flex-col border-l border-line bg-surface',
          isDrawer
            ? 'fixed bottom-0 right-0 top-14 z-40 w-[min(360px,92vw)]'
            : 'static w-[336px]',
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <div role="tablist" aria-label="Inspector sections" className="flex gap-0.5">
            {TABS.filter((tab) => tab.available).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`inspector-tab-${tab.id}`}
                aria-controls="inspector-panel"
                aria-selected={tab.id === activeTab}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'relative rounded-control px-2.5 py-1.5 text-body-sm font-medium text-ink-secondary transition-colors',
                  'hover:bg-muted-fill hover:text-ink',
                  tab.id === activeTab &&
                    'bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {isDrawer && (
            <button
              ref={closeRef}
              type="button"
              aria-label="Close inspector"
              title="Close inspector"
              onClick={onClose}
              className="inline-grid size-9 shrink-0 place-items-center rounded-control border border-transparent text-ink-secondary transition-colors hover:bg-muted-fill hover:text-ink"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        <div
          role="tabpanel"
          id="inspector-panel"
          aria-labelledby={`inspector-tab-${activeTab}`}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        >
          {activeTab === 'constraints' && <ConstraintsPanel {...constraintsPanel} />}
          {activeTab === 'sun' && (sunPanel ? <SunPanel {...sunPanel} /> : <p className="text-body-sm text-ink-secondary">Sun controls appear when the site package is ready.</p>)}
          {activeTab === 'model' && <>
          <MetricsPanel metrics={metrics} />
          {masses.length > 0 && (
            <section aria-labelledby="masses-heading" className="mb-6">
              <h2
                id="masses-heading"
                className="text-label text-ink-secondary"
              >
                Masses
              </h2>
              <div className="mt-2">
                <MassList
                  items={masses}
                  selectedId={selected?.volume.id ?? null}
                  onSelect={onSelectMass}
                />
              </div>
            </section>
          )}

          <section aria-labelledby="selection-heading">
            <div className="flex items-center justify-between">
              <h2
                id="selection-heading"
                className="text-label text-ink-secondary"
              >
                Selection
              </h2>
              <span className="rounded-full border border-line px-2 py-0.5 text-label text-ink-secondary">
                {selected ? '1 selected' : 'Nothing selected'}
              </span>
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
              <div className="mt-3 rounded-card border border-dashed border-line bg-surface-paper px-4 py-4 text-center">
                <span className="mx-auto grid size-8 place-items-center rounded-full border border-line bg-surface text-ink-secondary">
                  <Icon name="cube" size={16} />
                </span>
                <p className="mt-2.5 text-body-sm font-medium text-ink">No mass selected</p>
                <p className="mx-auto mt-1 max-w-[30ch] text-body-sm leading-relaxed text-ink-secondary">
                  {packageStatus !== 'ready'
                    ? 'Massing tools appear when the site package is ready.'
                    : canEdit
                      ? 'Use Draw footprint to add a mass, or click a mass to select it.'
                      : 'Massing is read-only on small screens.'}
                </p>
              </div>
            )}
          </section>

          <section aria-labelledby="site-heading" className="mt-6">
            <h2
              id="site-heading"
              className="text-label text-ink-secondary"
            >
              Site package
            </h2>
            <dl className="mt-2">
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
          </section>

          </>}

          <section aria-labelledby="layers-heading" className="mt-6">
            <h2
              id="layers-heading"
              className="text-label text-ink-secondary"
            >
              Layers
            </h2>
            <div className="mt-2 space-y-0.5">
              {LAYER_ROWS.filter((row) => !row.asset || manifest?.assetPaths[row.asset]).map((row) => (
                <label
                  key={row.id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-control px-1.5 py-1.5 text-body-sm text-ink transition-colors hover:bg-muted-fill"
                >
                  <span>{row.label}</span>
                  <input
                    type="checkbox"
                    checked={layers[row.id]}
                    onChange={() => onToggleLayer(row.id)}
                    className="size-3.5 accent-[var(--accent)]"
                  />
                </label>
              ))}
            </div>
            <div className="mt-3">
              <label htmlFor="render-quality" className="text-body-sm text-ink">
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
                className="mt-1 block min-h-9 w-full rounded-control border border-line bg-surface px-2 text-body-sm text-ink"
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
          </section>

          {activeTab === 'model' && <section aria-labelledby="assumptions-heading" className="mt-6">
            <h2
              id="assumptions-heading"
              className="text-label text-ink-secondary"
            >
              Assumptions
            </h2>
            <dl className="mt-2">
              <Row label="Storey height" value="3.2 m" />
              <Row label="Height mode" value="Storey-driven" />
              <Row label="Units" value="Metres · 2 dp" />
            </dl>
            <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">
              Storey height and display units used by the massing model.
            </p>
          </section>}

          <section className="mt-5 flex gap-2.5 border-t border-line pt-3">
            <Icon name="info" size={14} className="mt-px shrink-0 text-warning" />
            <p className="text-body-sm leading-relaxed text-ink-secondary">
              <span className="font-medium uppercase text-warning-ink">
                Illustrative constraint.
              </span>{' '}
              Envelope checks are not planning advice or a compliance determination.
            </p>
          </section>

        </div>

        <div className="border-t border-line px-4 py-2.5 text-label text-ink-secondary">
          {site.dataStatus === 'curated-demo' ? 'Curated Oslo demonstration' : 'Licensed source'}
        </div>
      </aside>
    </>
  )
}
