import type { SiteManifest } from '../../features/sites/manifest'
import type { SceneLayers } from '../../scene/ViewportCanvas'
import { checkboxClass } from '../ui/controls'

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
]

/** The four scene layers in the inspector. */
export function LayersCard({ manifest, layers, onToggleLayer }: {
  manifest: SiteManifest | null
  layers: SceneLayers
  onToggleLayer: (layer: keyof SceneLayers) => void
}) {
  const on = LAYER_ROWS.filter((row) => !row.asset || manifest?.assetPaths[row.asset])
  return (
    <div>
          {on.map((row) => (
            <label key={row.id} className="flex min-h-8 cursor-pointer items-center justify-between gap-3 text-body-sm text-ink">
              <span>{row.label}</span>
              <input type="checkbox" checked={layers[row.id]} onChange={() => onToggleLayer(row.id)} className={checkboxClass} />
            </label>
          ))}
    </div>
  )
}
