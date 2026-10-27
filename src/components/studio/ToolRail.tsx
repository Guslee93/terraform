import type { IconName } from '../ui/Icon'
import { Icon } from '../ui/Icon'
import { cn } from '../../lib/cn'

export type ToolId = 'select' | 'add-mass' | 'draw-footprint' | 'move' | 'rotate' | 'measure' | 'layers'

type Tool = {
  id: ToolId
  label: string
  icon: IconName
  available: boolean
  note?: string
}

const TOOLS: readonly Tool[] = [
  { id: 'select', label: 'Select', icon: 'cursor', available: true },
  { id: 'add-mass', label: 'Add mass', icon: 'cube', available: false, note: 'M2' },
  { id: 'draw-footprint', label: 'Draw footprint', icon: 'polygon', available: false, note: 'M2' },
  { id: 'move', label: 'Move', icon: 'move', available: false, note: 'M2' },
  { id: 'rotate', label: 'Rotate', icon: 'rotate', available: false, note: 'M2' },
  { id: 'measure', label: 'Measure', icon: 'ruler', available: false, note: 'M3' },
  { id: 'layers', label: 'Site layers', icon: 'layers', available: false, note: 'M1' },
]

type ToolRailProps = {
  activeTool: ToolId
  onSelect: (tool: ToolId) => void
  onOpenLayers: () => void
}

export function ToolRail({ activeTool, onSelect, onOpenLayers }: ToolRailProps) {
  return (
    <nav
      aria-label="Studio tools"
      className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-2 sm:w-14"
    >
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          disabled={!tool.available}
          aria-pressed={tool.id === activeTool}
          aria-label={
            tool.available ? tool.label : `${tool.label} — available in ${tool.note ?? 'a later milestone'}`
          }
          title={
            tool.available ? tool.label : `${tool.label} — available in ${tool.note ?? 'a later milestone'}`
          }
          onClick={() => {
            if (tool.id === 'layers') {
              onOpenLayers()
              return
            }
            onSelect(tool.id)
          }}
          className={cn(
            'relative grid size-9 place-items-center rounded-[var(--radius-control)] border border-transparent text-ink-secondary transition-colors duration-150 sm:size-10',
            'hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
            tool.id === activeTool &&
              'border-line bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent',
          )}
        >
          <Icon name={tool.icon} size={17} />
        </button>
      ))}

      <div className="mt-auto flex flex-col items-center gap-2 pb-1">
        <span aria-hidden="true" className="h-px w-6 bg-line" />
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-full border border-line text-[9px] font-medium text-ink-secondary"
          title="North is up in the default isometric view"
        >
          N
        </span>
      </div>
    </nav>
  )
}
