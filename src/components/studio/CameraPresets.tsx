import type { CameraPresetId } from '../../features/sites/manifest'
import { cn } from '../../lib/cn'

const PRESETS: ReadonlyArray<{ id: CameraPresetId; label: string; title: string }> = [
  { id: 'isometric', label: '3D', title: 'Isometric view' },
  { id: 'top', label: 'Plan', title: 'Top view' },
  { id: 'north', label: 'North', title: 'View from the south, looking north' },
  { id: 'south', label: 'South', title: 'View from the north, looking south' },
  { id: 'eyeLevel', label: 'Street', title: 'Eye-level view' },
]

type CameraPresetsProps = {
  active: CameraPresetId
  onSelect: (preset: CameraPresetId) => void
}

/** Views as words with an underline for the active one, top-right of the canvas beside the compass. */
export function CameraPresets({ active, onSelect }: CameraPresetsProps) {
  return (
    <div
      role="group"
      aria-label="Camera presets"
      className="absolute right-14 top-[60px] z-10 flex items-center gap-5 rounded-chip bg-surface/85 px-2 py-0.5 xl:top-3.5"
    >
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(preset.id)}
          aria-pressed={active === preset.id}
          title={preset.title}
          className={cn('min-h-9 border-b border-transparent text-body-sm text-ink-secondary transition-colors duration-200 hover:text-ink aria-pressed:border-ink aria-pressed:text-ink')}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
