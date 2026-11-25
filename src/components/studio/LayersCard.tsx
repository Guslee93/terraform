import type { SiteManifest } from '../../features/sites/manifest'
import type { SceneLayers } from '../../scene/ViewportCanvas'
import { checkboxClass } from '../ui/controls'

const LAYER_ROWS: ReadonlyArray<{
  id: keyof SceneLayers
  label: string
  /** Optional package file the row depends on; the row is hidden when the package lacks it. */
  asset?: 'roads' | 'trees' | 'landcover' | 'parcels'
  /** What the layer is not: stated where the layer is switched (feasibility 09 §5). */
  note?: string
}> = [
  { id: 'terrain', label: 'Terrain' },
  { id: 'ground', label: 'Land cover', asset: 'landcover' },
  { id: 'context', label: 'Context buildings' },
  { id: 'streets', label: 'Streets', asset: 'roads' },
  { id: 'trees', label: 'Trees', asset: 'trees', note: 'Trees are shown, not analysed' },
  { id: 'parcels', label: 'Parcels', asset: 'parcels', note: 'Eiendomskart — not a surveyed boundary' },
]

/** The scene layers in the inspector. */
export function LayersCard({ manifest, layers, onToggleLayer, notes = {} }: {
  /** Per-site notes for a row, such as where the context heights come from (ADR-0033). */
  notes?: Partial<Record<keyof SceneLayers, string>>
  manifest: SiteManifest | null
  layers: SceneLayers
  onToggleLayer: (layer: keyof SceneLayers) => void
}) {
  const on = LAYER_ROWS.filter((row) => !row.asset || manifest?.assetPaths[row.asset])
  return (
    <div>
          {on.map((row) => (
            <label key={row.id} className="flex min-h-8 cursor-pointer items-center justify-between gap-3 text-body-sm text-ink">
              <span>{row.label}{(notes[row.id] ?? row.note) && <span className="block text-caption text-ink-secondary">{notes[row.id] ?? row.note}</span>}</span>
              <input type="checkbox" checked={layers[row.id]} onChange={() => onToggleLayer(row.id)} className={checkboxClass} />
            </label>
          ))}
    </div>
  )
}
