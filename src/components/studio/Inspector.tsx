import { useEffect, useState, type ReactNode } from 'react'
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

export type PanelGroup = 'sun' | 'climate' | 'layers' | 'site' | 'assumptions' | 'notes'

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
  /** Section 1: the design check. */
  recovery?: ReactNode
  backup?: ReactNode
  notes?: ReactNode
  check: ReactNode
  /** Section 2: scenario figures. */
  figures: ReactNode
  /** Body of the Sun group, or null before the package is ready. */
  sun: ReactNode
  sunMeta?: string
  /** Body of the Wind and noise group; omitted until the package is ready. */
  climate?: ReactNode
  climateMeta?: string
  /** Analysis-only studio: study-area facts replace the design check, figures and massing. */
  analysisOnly?: boolean
  facts?: ReactNode
  metrics: ScenarioMetrics | null
  site: SiteSummary
  manifest: SiteManifest | null
  packageStatus: 'loading' | 'ready' | 'error'
  layers: SceneLayers
  onToggleLayer: (layer: keyof SceneLayers) => void
  renderPreference: RenderPreference
  onRenderPreferenceChange: (preference: RenderPreference) => void
  /** Group to open and scroll to, re-applied whenever `focusNonce` changes (the Layers button). */
  focusGroup?: PanelGroup | null
  focusNonce?: number
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
    <div className="flex items-start justify-between gap-4 border-b border-line py-2 last:border-b-0">
      <dt className={labelClass}>{label}</dt>
      <dd className="text-right text-body-sm text-ink">{value}</dd>
    </div>
  )
}

/** A collapsible row: label left, quiet meta and chevron right, one hairline above. */
function Group({ id, title, meta, open, onToggle, children }: {
  id: PanelGroup
  title: string
  meta?: string
  open: boolean
  onToggle: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <details id={`panel-group-${id}`} open={open} onToggle={(event) => onToggle(event.currentTarget.open)} className="group border-t border-line">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-body-sm text-ink [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="flex items-center gap-2">
          {meta && <span className={labelClass}>{meta}</span>}
          <Icon name="chevron-down" size={12} className="text-ink-secondary transition-transform duration-200 group-open:rotate-180" />
        </span>
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  )
}

/** The studio's right panel (draft 4): check → figures → buildings → groups. Always visible. */
export function Inspector({
  recovery,
  backup,
  notes,
  check,
  figures,
  sun,
  sunMeta,
  climate,
  climateMeta,
  analysisOnly = false,
  facts,
  metrics,
  site,
  manifest,
  packageStatus,
  layers,
  onToggleLayer,
  renderPreference,
  onRenderPreferenceChange,
  focusGroup = null,
  focusNonce = 0,
  selected,
  canEdit,
  editingEnabled,
  onCommand,
  masses,
  onSelectMass,
  onSelectTier,
  onAddMass,
}: InspectorProps) {
  const selectedMetrics = metrics?.perVolume.find((entry) => entry.volumeId === selected?.volume.id)
  const [openGroups, setOpenGroups] = useState<ReadonlySet<PanelGroup>>(() => new Set<PanelGroup>(analysisOnly ? ['climate'] : []))
  const toggleGroup = (group: PanelGroup, open: boolean) => setOpenGroups((current) => {
    if (current.has(group) === open) return current
    const next = new Set(current)
    if (open) next.add(group)
    else next.delete(group)
    return next
  })

  useEffect(() => {
    if (!focusGroup || focusNonce === 0) return
    setOpenGroups((current) => new Set(current).add(focusGroup))
    const frame = window.requestAnimationFrame(() => {
      const group = document.getElementById(`panel-group-${focusGroup}`)
      // jsdom has no scrollIntoView.
      group?.scrollIntoView?.({ block: 'nearest' })
      group?.querySelector('summary')?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [focusGroup, focusNonce])

  return (
    <aside aria-label="Inspector" className="tf-rise flex min-h-0 flex-col overflow-y-auto rounded-card bg-surface [animation-delay:80ms]">
      {analysisOnly ? facts : <>{recovery}{check}{figures}</>}

      {!analysisOnly && <section aria-labelledby="buildings-heading" className="px-6 pb-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 id="buildings-heading" className="text-caption text-ink-secondary">Buildings</h2>
          <span className="flex items-center gap-4">
            <span className={labelClass}>{selected ? '1 selected' : 'Nothing selected'}</span>
            {onAddMass && canEdit && packageStatus === 'ready' && (
              <button type="button" onClick={onAddMass} className={cn(textButtonSmClass, 'min-h-0 py-0')}>
                Draw another
              </button>
            )}
          </span>
        </div>
        <div className="mt-2">
          <MassList items={masses} selectedId={selected?.volume.id ?? null} onSelect={onSelectMass} />
        </div>

        {selected ? (
          <div className="mt-4">
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
          <div className="mt-2">
            <p className="text-body-sm text-ink">No mass selected</p>
            <p className="mt-1 text-body-sm text-ink-secondary">
              {packageStatus !== 'ready'
                ? 'Massing tools appear when the site package is ready.'
                : canEdit
                  ? 'Use Draw building to add a mass, or click a mass to select it.'
                  : 'Massing is read-only on small screens.'}
            </p>
          </div>
        )}
      </section>}

      {!analysisOnly && notes}
      <div className="mt-auto px-6">
        {sun && (
          <Group id="sun" title="Sun" meta={sunMeta} open={openGroups.has('sun')} onToggle={(open) => toggleGroup('sun', open)}>
            {sun}
          </Group>
        )}

        {climate && (
          <Group id="climate" title="Wind and noise" meta={climateMeta} open={openGroups.has('climate')} onToggle={(open) => toggleGroup('climate', open)}>
            {climate}
          </Group>
        )}

        <Group id="layers" title="Layers and render quality" meta={renderPreference} open={openGroups.has('layers')} onToggle={(open) => toggleGroup('layers', open)}>
          <div>
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
              className={cn(inputClass, 'mt-1 font-sans')}
            >
              <option value="auto">Auto</option>
              <option value="high">High</option>
              <option value="balanced">Balanced</option>
              <option value="low">Low</option>
            </select>
            <p id="render-quality-hint" className="mt-1 text-caption text-ink-secondary">
              Auto lowers quality on software rendering.
            </p>
          </div>
        </Group>

        <Group id="site" title="Site and sources" meta={manifest ? `${manifest.statistics.buildingCount} buildings` : undefined} open={openGroups.has('site')} onToggle={(open) => toggleGroup('site', open)}>
          <dl>
            <Row label="Site" value={site.title} />
            <Row label="Morphology" value={site.morphology} />
            <Row
              label="Data"
              value={
                packageStatus === 'ready'
                  ? site.dataStatus === 'user-import' ? 'Imported · open map data' : 'Curated demo'
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
          {site.notices && site.notices.length > 0 && (
            <ul aria-label="Import notes" className="mt-2 list-disc space-y-1 pl-4 text-caption text-ink-secondary">
              {site.notices.map((notice) => <li key={notice}>{notice}</li>)}
            </ul>
          )}
          {backup}
          <p className="mt-2 text-caption text-ink-secondary">
            <Link to="/about#data" className="underline decoration-line underline-offset-2 hover:text-ink">
              Data notes
            </Link>
          </p>
        </Group>

        {!analysisOnly && <>
          <Group id="assumptions" title="Assumptions" meta="Default storey 3.2 m" open={openGroups.has('assumptions')} onToggle={(open) => toggleGroup('assumptions', open)}>
            <dl>
              <Row label="Default storey height" value="3.2 m" />
              <Row label="Height mode" value="Storey-driven" />
              <Row label="Units" value="Metres · 2 dp" />
            </dl>
          </Group>

          <Group id="notes" title="About these numbers" meta="Method" open={openGroups.has('notes')} onToggle={(open) => toggleGroup('notes', open)}>
            <MetricsNotes metrics={metrics} />
          </Group>
        </>}
      </div>

      <p className="border-t border-line px-6 py-3 text-caption text-ink-secondary">
        {site.dataStatus === 'user-import' && manifest
          ? manifest.sources.map((source) => source.attribution).join(' · ')
          : 'Buildings © OpenStreetMap contributors (ODbL) · Terrain © Kartverket (CC BY 4.0)'}
      </p>
    </aside>
  )
}
