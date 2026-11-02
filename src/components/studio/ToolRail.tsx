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
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

const historyButtonClass =
  'grid size-9 place-items-center rounded-control text-ink-secondary transition-colors duration-150 hover:bg-muted-fill hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent sm:size-10'

export function ToolRail({
  activeTool,
  onSelect,
  onOpenLayers,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: ToolRailProps) {
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
            'relative grid size-9 place-items-center rounded-control border border-transparent text-ink-secondary transition-colors duration-150 sm:size-10',
            'hover:bg-muted-fill hover:text-ink',
            tool.id === activeTool &&
              'border-line bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent',
          )}
        >
          <Icon name={tool.icon} size={17} />
        </button>
      ))}

      <span className="mt-2 text-label text-ink-secondary [writing-mode:vertical-rl]">
        Tools
      </span>

      {/* Editing is read-only below 640 px, so history controls are hidden there too. */}
      <div className="mt-3 flex flex-col items-center gap-1 border-t border-line pt-3 max-sm:hidden">
        <button type="button" aria-label="Undo" title="Undo" disabled={!canUndo} onClick={onUndo} className={historyButtonClass}>
          <Icon name="undo" size={17} />
        </button>
        <button type="button" aria-label="Redo" title="Redo" disabled={!canRedo} onClick={onRedo} className={historyButtonClass}>
          <Icon name="redo" size={17} />
        </button>
      </div>

      <div className="mt-auto flex flex-col items-center gap-2 pb-1">
        <span aria-hidden="true" className="h-px w-6 bg-line" />
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-full border border-line text-body-sm font-medium text-ink-secondary"
          title="North is up in the default isometric view"
        >
          N
        </span>
      </div>
    </nav>
  )
}
