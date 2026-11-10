import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { SiteManifest } from '../../features/sites/manifest'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import { isRenderPreference, type RenderPreference } from '../../scene/renderQuality'
import { cn } from '../../lib/cn'
import { checkboxClass, inputClass } from '../ui/controls'
import { Icon } from '../ui/Icon'
import type { MassingCommand } from '../../features/editor/history'
import type { ClearanceIssue } from '../../features/massing/clearance'
import type { MassTier, MassVolume } from '../../features/massing/types'
import type { ScenarioMetrics } from '../../features/massing/metrics'
import { SelectedFloors } from './MetricsPanel'
import { MassFields } from './MassFields'

export type PanelGroup = 'analysis' | 'selected' | 'check' | 'site' | 'view' | 'notes'

type InspectorProps = {
  /** The active dock analysis: its full controls live here (ADR-0016 rev 2). */
  analysis?: { title: string; body: ReactNode } | null
  recovery?: ReactNode
  backup?: ReactNode
  notes?: ReactNode
  /** Mass picker shown at the top of Selected mass. */
  masses?: ReactNode
  /** The design check (test-a-building) or study-area facts (analysis only). */
  check: ReactNode
  /** Analysis-only studio: no selected mass, check or notes. */
  analysisOnly?: boolean
  metrics: ScenarioMetrics | null
  site: SiteSummary
  manifest: SiteManifest | null
  packageStatus: 'loading' | 'ready' | 'error'
  renderPreference: RenderPreference
  onRenderPreferenceChange: (preference: RenderPreference) => void
  /** Camera preset buttons. */
  views?: ReactNode
  /** Image pass and clip export (ADR-0019). */
  visuals?: ReactNode
  grid: boolean
  onGridChange: (on: boolean) => void
  selected: { volume: MassVolume; tier: MassTier; warnings?: readonly ClearanceIssue[] } | null
  canEdit: boolean
  /** Editing allowed right now (false on small screens or during a gesture). */
  editingEnabled: boolean
  onCommand: (command: MassingCommand) => string | null
  onSelectTier: (tierId: string) => void
}

/** Label left, value right, one hairline below (ADR-0016 parameter row). */
export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 border-b border-card-line py-2 last:border-b-0">
      <dt className="text-body-sm text-ink-secondary">{label}</dt>
      <dd className="text-right text-body-sm text-ink">{value}</dd>
    </div>
  )
}

/** A collapsible group: uppercase eyebrow and chevron, content below. */
function Group({ id, title, meta, open, onToggle, children }: {
  id: PanelGroup
  title: string
  meta?: string
  open: boolean
  onToggle: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <details id={`panel-group-${id}`} open={open} onToggle={(event) => onToggle(event.currentTarget.open)} className="group border-t border-card-line px-5">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="text-eyebrow text-ink-secondary">{title}</span>
        <span className="flex min-w-0 items-center gap-2">
          {meta && <span className="truncate text-caption text-ink-secondary">{meta}</span>}
          <Icon name="chevron-down" size={12} className="shrink-0 text-ink-secondary transition-transform duration-200 group-open:rotate-180" />
        </span>
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  )
}

/** The studio's right panel (ADR-0016): stacked parameter groups. */
export function Inspector({
  analysis,
  recovery,
  backup,
  notes,
  masses,
  check,
  analysisOnly = false,
  metrics,
  site,
  manifest,
  packageStatus,
  renderPreference,
  onRenderPreferenceChange,
  views,
  visuals,
  grid,
  onGridChange,
  selected,
  canEdit,
  editingEnabled,
  onCommand,
  onSelectTier,
}: InspectorProps) {
  const selectedMetrics = metrics?.perVolume.find((entry) => entry.volumeId === selected?.volume.id)
  const [openGroups, setOpenGroups] = useState<ReadonlySet<PanelGroup>>(() => new Set<PanelGroup>(['analysis', 'selected', 'check', 'view']))
  const toggleGroup = (group: PanelGroup, open: boolean) => setOpenGroups((current) => {
    if (current.has(group) === open) return current
    const next = new Set(current)
    if (open) next.add(group)
    else next.delete(group)
    return next
  })
  const group = (id: PanelGroup) => ({ id, open: openGroups.has(id), onToggle: (open: boolean) => toggleGroup(id, open) })

  return (
    <aside aria-label="Parameters" className="tf-rise @container flex min-h-0 flex-col overflow-y-auto rounded-panel border border-card-line bg-card shadow-card [animation-delay:80ms]">
      <h2 className="px-5 pb-2 pt-5 text-title text-ink">Parameters</h2>
      {recovery}

      {analysis && (
        <Group {...group('analysis')} title={analysis.title}>
          {analysis.body}
        </Group>
      )}

      {!analysisOnly && (
        <Group {...group('selected')} title="Selected mass" meta={selected ? selected.volume.name : 'None'}>
          {masses && <div className="mb-3">{masses}</div>}
          {selected ? (
            <>
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
              {!canEdit && <p className="mt-2 text-body-sm text-ink-secondary">Massing is read-only on small screens.</p>}
            </>
          ) : (
            <p className="text-body-sm text-ink-secondary">
              {packageStatus !== 'ready'
                ? 'Massing tools appear when the site package is ready.'
                : canEdit
                  ? 'Draw a footprint, or click a mass to select it.'
                  : 'Massing is read-only on small screens.'}
            </p>
          )}
        </Group>
      )}

      <Group {...group('check')} title={analysisOnly ? 'Study area' : 'Design check'}>
        {check}
      </Group>

      <Group {...group('site')} title="Site" meta={manifest ? `${manifest.statistics.buildingCount} buildings` : undefined}>
        <dl>
          <Row label="Site" value={site.title} />
          <Row label="Morphology" value={site.morphology} />
          <Row
            label="Data"
            value={
              packageStatus === 'ready'
                ? site.dataStatus === 'user-import' ? 'Imported · open map data' : 'Curated demo'
                : packageStatus === 'error' ? 'Unavailable' : 'Loading'
            }
          />
          <Row label="Buildings" value={manifest ? `${manifest.statistics.buildingCount} simplified` : '—'} />
          <Row label="Terrain" value={manifest ? `${manifest.statistics.terrainSamples} samples` : '—'} />
          <Row label="Frame" value="Local ENU · metres" />
          <Row label="Constraints" value="Illustrative only" />
          {!analysisOnly && <Row label="Default storey" value="3.2 m" />}
        </dl>
        {site.notices && site.notices.length > 0 && (
          <ul aria-label="Import notes" className="mt-2 list-disc space-y-1 pl-4 text-caption text-ink-secondary">
            {site.notices.map((notice) => <li key={notice}>{notice}</li>)}
          </ul>
        )}
        {backup}
        <p className="mt-2 text-caption text-ink-secondary">
          <Link to="/about#data" className="underline decoration-line underline-offset-2 hover:text-ink">Data notes</Link>
        </p>
      </Group>

      <Group {...group('view')} title="View" meta={renderPreference}>
        {views}
        <label className="mt-2 flex min-h-10 cursor-pointer items-center justify-between gap-3 border-b border-card-line text-body-sm text-ink-secondary">
          <span>Ground grid · 1 m / 10 m</span>
          <input type="checkbox" checked={grid} onChange={(event) => onGridChange(event.currentTarget.checked)} className={checkboxClass} />
        </label>
        <div className="flex min-h-10 items-center justify-between gap-3 py-2">
          <label htmlFor="render-quality" className="text-body-sm text-ink-secondary">Render quality</label>
          <select
            id="render-quality"
            value={renderPreference}
            aria-describedby="render-quality-hint"
            onChange={(event) => {
              const value = event.currentTarget.value
              if (isRenderPreference(value)) onRenderPreferenceChange(value)
            }}
            className={cn(inputClass.replace('h-10 w-full', 'h-8 w-28'), 'font-sans text-body-sm')}
          >
            <option value="auto">Auto</option>
            <option value="high">High</option>
            <option value="balanced">Balanced</option>
            <option value="low">Low</option>
          </select>
        </div>
        <p id="render-quality-hint" className="text-caption text-ink-secondary">Sets shadows and ambient occlusion. Auto lowers quality on software rendering or when frames run slow.</p>
        {visuals}
      </Group>

      {!analysisOnly && notes && (
        <Group {...group('notes')} title="Notes">
          {notes}
        </Group>
      )}

      <p className="mt-auto border-t border-card-line px-5 py-3 text-caption text-ink-secondary">
        {site.dataStatus === 'user-import' && manifest
          ? manifest.sources.map((source) => source.attribution).join(' · ')
          : 'Buildings © OpenStreetMap contributors (ODbL) · Terrain © Kartverket (CC BY 4.0)'}
      </p>
    </aside>
  )
}
