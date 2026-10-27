import type { IconName } from '../ui/Icon'
import { Icon } from '../ui/Icon'
import { cn } from '../../lib/cn'

export type ToolId = 'select' | 'draw' | 'layers'

type Tool = {
  id: ToolId
  label: string
  icon: IconName
}

const TOOLS: readonly Tool[] = [
  { id: 'select', label: 'Select', icon: 'cursor' },
  { id: 'draw', label: 'Draw footprint', icon: 'polygon' },
  { id: 'layers', label: 'Site notes', icon: 'layers' },
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
          aria-pressed={tool.id === 'layers' ? undefined : activeTool === tool.id}
          aria-label={tool.label}
          title={tool.label}
          onClick={() => {
            if (tool.id === 'layers') {
              onOpenLayers()
              return
            }
            onSelect(tool.id)
          }}
          className={cn(
            tool.id === 'draw' && 'max-sm:hidden',
            'relative grid size-9 place-items-center rounded-[var(--radius-control)] border border-transparent text-ink-secondary transition-colors duration-150 sm:size-10',
            'hover:bg-surface-muted hover:text-ink',
            tool.id === activeTool &&
              'border-line bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent',
          )}
        >
          <Icon name={tool.icon} size={17} />
        </button>
      ))}

      <span className="mt-2 text-[9px] uppercase tracking-[0.12em] text-ink-secondary [writing-mode:vertical-rl]">
        Tools
      </span>

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
