import { useState, type ReactNode } from 'react'
import type { SiteManifest } from '../../features/sites/manifest'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import { credits, siteLayers, type LayerId } from '../../features/sites/provenance'
import type { MassingCommand } from '../../features/editor/history'
import type { MassTier, MassVolume } from '../../features/massing/types'
import { Icon } from '../ui/Icon'
import { MassFields } from './MassFields'

export type PanelGroup = 'selected' | 'layers' | 'export' | 'site'

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


const linkClass = 'underline underline-offset-2 hover:text-ink'

/**
 * One line per data source among the layers on screen (ADR-0032): who, which dataset and year,
 * the licence, when it was retrieved, and what the publisher says it must not be used for.
 */
export function DataAttribution({ manifest, visible }: { manifest: SiteManifest; visible: ReadonlySet<LayerId> }) {
  const { layers, unlisted } = siteLayers(manifest)
  return (
    <ul aria-label="Data attribution" className="mt-3 space-y-1.5 text-caption text-ink-secondary">
      {credits(layers, visible).map((credit) => (
        <li key={`${credit.owner}/${credit.dataset}`}>
          <a className={linkClass} href={credit.url} target="_blank" rel="noreferrer">{credit.attribution}</a>
          {' · '}{credit.dataset}{credit.dataYear === undefined ? '' : ` (${credit.dataYear})`}{' · '}
          <a className={linkClass} href={credit.licenceUrl} target="_blank" rel="noreferrer">{credit.licence === 'no conditions' ? 'open data' : credit.licence}</a>
          {' · retrieved '}{credit.retrieved}
          {credit.useLimitation && <span className="block">Use limitation: {credit.useLimitation}</span>}
        </li>
      ))}
      {unlisted.map((source) => <li key={source.title}>{source.attribution ?? source.title}</li>)}
    </ul>
  )
}

export function Inspector({ analysisCards, analysisOnly, layers, parcel, visibleLayers, site, manifest, packageStatus, views, visuals, selected, canEdit, editingEnabled, onCommand, selectionMeta, selectionExtra }: {
  /** The analysis cards: one per screening analysis, above the panel groups (ADR-0026). */
  analysisCards?: ReactNode
  analysisOnly: boolean
  layers: ReactNode
  /** The selected parcel's facts, while the parcel layer is on (ADR-0035). */
  parcel?: ReactNode
  /** The layers on screen: the attribution lists their sources only. */
  visibleLayers: ReadonlySet<LayerId>
  site: SiteSummary
  manifest: SiteManifest | null
  packageStatus: 'loading' | 'ready' | 'error'
  views?: ReactNode
  visuals?: ReactNode
  selected: { volume: MassVolume; tier: MassTier } | null
  canEdit: boolean
  editingEnabled: boolean
  onCommand: (command: MassingCommand) => string | null
  /** Right-hand note on the Selected block group, such as the number of blocks. */
  selectionMeta?: string
  /** Extra control under the block fields, such as the draw button. */
  selectionExtra?: ReactNode
}) {
  const [openGroups, setOpenGroups] = useState<ReadonlySet<PanelGroup>>(() => new Set(['selected', 'layers', 'site']))
  const group = (id: PanelGroup) => ({ id, open: openGroups.has(id), onToggle: (open: boolean) => setOpenGroups((current) => {
    if (current.has(id) === open) return current
    const next = new Set(current)
    if (open) next.add(id)
    else next.delete(id)
    return next
  }) })
  return <aside aria-label="Parameters" className="tf-rise @container flex min-h-0 flex-col overflow-y-auto rounded-panel border border-card-line bg-card shadow-card [animation-delay:80ms]">
    <h2 className="px-5 pb-2 pt-5 text-title text-ink">Parameters</h2>
    {analysisCards}
    {!analysisOnly && <Group {...group('selected')} title="Selected block" meta={selectionMeta}>
      {selected ? <MassFields key={selected.tier.id} {...selected} disabled={!editingEnabled} onCommand={onCommand} />
        : <p className="text-body-sm text-ink-secondary">{packageStatus !== 'ready' ? 'Block tools appear when the site package is ready.' : canEdit ? 'Draw a footprint, or click a block to select it.' : 'Blocks are read-only on small screens.'}</p>}
      {selectionExtra}
    </Group>}
    <Group {...group('layers')} title="Layers">{layers}{views}{parcel}</Group>
    <Group {...group('export')} title="Export">{visuals}</Group>
    <Group {...group('site')} title="Site">
      <p className="text-body-sm text-ink">{site.title} · Local ENU metres</p>
      {site.notices && <ul aria-label="Import notes" className="mt-2 list-disc pl-4 text-caption text-ink-secondary">{site.notices.map((notice) => <li key={notice}>{notice}</li>)}</ul>}
      {manifest
        ? <DataAttribution manifest={manifest} visible={visibleLayers} />
        : <p className="mt-3 text-caption text-ink-secondary">Buildings © OpenStreetMap contributors (ODbL) · Terrain © Kartverket (CC BY 4.0)</p>}
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
