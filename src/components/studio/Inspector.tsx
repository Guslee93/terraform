import { useState, type ReactNode } from 'react'
import type { SiteManifest } from '../../features/sites/manifest'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import type { MassingCommand } from '../../features/editor/history'
import type { MassTier, MassVolume } from '../../features/massing/types'
import { Icon } from '../ui/Icon'
import { MassFields } from './MassFields'

export type PanelGroup = 'analysis' | 'selected' | 'layers' | 'export' | 'site'

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


export function Inspector({ analysis, analysisOnly, layers, site, manifest, packageStatus, views, visuals, selected, canEdit, editingEnabled, onCommand }: {
  analysis?: { title: string; body: ReactNode } | null
  analysisOnly: boolean
  layers: ReactNode
  site: SiteSummary
  manifest: SiteManifest | null
  packageStatus: 'loading' | 'ready' | 'error'
  views?: ReactNode
  visuals?: ReactNode
  selected: { volume: MassVolume; tier: MassTier } | null
  canEdit: boolean
  editingEnabled: boolean
  onCommand: (command: MassingCommand) => string | null
}) {
  const [openGroups, setOpenGroups] = useState<ReadonlySet<PanelGroup>>(() => new Set(['analysis', 'selected', 'layers', 'site']))
  const group = (id: PanelGroup) => ({ id, open: openGroups.has(id), onToggle: (open: boolean) => setOpenGroups((current) => {
    if (current.has(id) === open) return current
    const next = new Set(current)
    if (open) next.add(id)
    else next.delete(id)
    return next
  }) })
  return <aside aria-label="Parameters" className="tf-rise @container flex min-h-0 flex-col overflow-y-auto rounded-panel border border-card-line bg-card shadow-card [animation-delay:80ms]">
    <h2 className="px-5 pb-2 pt-5 text-title text-ink">Parameters</h2>
    {analysis && <Group {...group('analysis')} title={analysis.title}>{analysis.body}</Group>}
    {!analysisOnly && <Group {...group('selected')} title="Selected block">
      {selected ? <MassFields key={selected.tier.id} {...selected} disabled={!editingEnabled} onCommand={onCommand} />
        : <p className="text-body-sm text-ink-secondary">{packageStatus !== 'ready' ? 'Block tools appear when the site package is ready.' : canEdit ? 'Draw a footprint, or click a block to select it.' : 'Blocks are read-only on small screens.'}</p>}
    </Group>}
    <Group {...group('layers')} title="Layers">{layers}{views}</Group>
    <Group {...group('export')} title="Export">{visuals}</Group>
    <Group {...group('site')} title="Site">
      <p className="text-body-sm text-ink">{site.title} · Local ENU metres</p>
      {site.notices && <ul aria-label="Import notes" className="mt-2 list-disc pl-4 text-caption text-ink-secondary">{site.notices.map((notice) => <li key={notice}>{notice}</li>)}</ul>}
      <p className="mt-3 text-caption text-ink-secondary">{manifest
        ? manifest.sources.map((source) => source.attribution).join(' · ')
        : 'Buildings © OpenStreetMap contributors (ODbL) · Terrain © Kartverket (CC BY 4.0)'}</p>
      {manifest?.assetPaths.attribution && (
        <a
          className="mt-1 inline-flex min-h-8 items-center text-caption text-ink-secondary underline underline-offset-2 hover:text-ink"
          href={`/sites/${encodeURIComponent(manifest.id)}/${encodeURIComponent(manifest.assetPaths.attribution)}`}
          target="_blank"
          rel="noreferrer"
        >
          Data attribution and simplifications
        </a>
      )}
    </Group>
  </aside>
}
