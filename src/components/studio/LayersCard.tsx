import { useId, useState } from 'react'
import type { SiteManifest } from '../../features/sites/manifest'
import type { SceneLayers } from '../../scene/ViewportCanvas'
import { checkboxClass } from '../ui/controls'
import { Icon } from '../ui/Icon'

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

/** Top-left viewport card (ADR-0016): the scene layer switches behind one show/hide toggle. */
export function LayersCard({ manifest, layers, onToggleLayer }: {
  manifest: SiteManifest | null
  layers: SceneLayers
  onToggleLayer: (layer: keyof SceneLayers) => void
}) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const on = LAYER_ROWS.filter((row) => !row.asset || manifest?.assetPaths[row.asset])
  return (
    <div className="absolute left-3 top-3 z-10 lg:top-[60px] w-[188px] rounded-control border border-card-line bg-frost shadow-float backdrop-blur-md">
      <button
        type="button"
        aria-label="Layers"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-9 w-full items-center gap-2 rounded-control px-3 text-body-sm text-ink"
      >
        <Icon name={open ? 'eye' : 'eye-off'} size={14} className="text-ink-secondary" />
        Layers
        <span aria-hidden="true" className="ml-auto text-caption text-ink-secondary">{on.filter((row) => layers[row.id]).length}/{on.length}</span>
      </button>
      {open && (
        <div id={listId} className="border-t border-card-line px-3 pb-2 pt-1">
          {on.map((row) => (
            <label key={row.id} className="flex min-h-8 cursor-pointer items-center justify-between gap-3 text-body-sm text-ink">
              <span>{row.label}</span>
              <input type="checkbox" checked={layers[row.id]} onChange={() => onToggleLayer(row.id)} className={checkboxClass} />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
