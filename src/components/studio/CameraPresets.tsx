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

/** Camera views as a segmented row in the Parameters View group (ADR-0016). */
export function CameraPresets({ active, onSelect }: CameraPresetsProps) {
  return (
    <div
      role="group"
      aria-label="Camera presets"
      className="flex items-center gap-0.5 rounded-control bg-canvas p-0.5"
    >
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onSelect(preset.id)}
          aria-pressed={active === preset.id}
          title={preset.title}
          className={cn('min-h-8 flex-1 rounded-[6px] text-body-sm text-ink-secondary transition-colors duration-200 hover:text-ink aria-pressed:bg-card aria-pressed:text-ink aria-pressed:shadow-card')}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
