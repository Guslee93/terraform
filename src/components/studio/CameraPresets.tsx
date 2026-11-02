import type { CameraPresetId } from '../../features/sites/manifest'
import { segmentClass } from '../ui/controls'

const PRESETS: ReadonlyArray<{ id: CameraPresetId; label: string; title: string }> = [
  { id: 'isometric', label: 'Iso', title: 'Isometric view' },
  { id: 'top', label: 'Top', title: 'Top view' },
  { id: 'north', label: 'N', title: 'View from the south, looking north' },
  { id: 'south', label: 'S', title: 'View from the north, looking south' },
  { id: 'eyeLevel', label: 'Eye', title: 'Eye-level view' },
]

type CameraPresetsProps = {
  active: CameraPresetId
  onSelect: (preset: CameraPresetId) => void
}

/** §5.6 segmented text control, bottom-right of the viewport card. */
export function CameraPresets({ active, onSelect }: CameraPresetsProps) {
  return (
    <div
      role="group"
      aria-label="Camera presets"
      className="absolute bottom-3 right-5 z-10 flex flex-wrap items-center justify-end gap-x-5"
    >
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(preset.id)}
          aria-pressed={active === preset.id}
          title={preset.title}
          className={`${segmentClass} min-w-6 justify-center`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
