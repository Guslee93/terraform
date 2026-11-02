import type { CameraPresetId } from '../../features/sites/manifest'
import { cn } from '../../lib/cn'

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

export function CameraPresets({ active, onSelect }: CameraPresetsProps) {
  return (
    <div
      role="group"
      aria-label="Camera presets"
      className="absolute bottom-3 right-3 z-10 flex items-center gap-0.5 rounded-control border border-line bg-surface/90 p-0.5 backdrop-blur-sm"
    >
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(preset.id)}
          aria-pressed={active === preset.id}
          title={preset.title}
          className={cn(
            'min-h-7 rounded-control px-2 text-label text-ink-secondary transition-colors hover:bg-muted-fill hover:text-ink',
            active === preset.id && 'bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent',
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
