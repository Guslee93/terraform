import { cn } from '../../lib/cn'

export type ToolId = 'select' | 'draw' | 'layers'

type ToolRailProps = {
  /** Drawing needs the site package; Select and Draw are disabled until it is ready. */
  ready?: boolean
  activeTool: ToolId
  onSelect: (tool: ToolId) => void
  onOpenLayers: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

const word = 'min-h-9 text-body-sm text-ink-secondary transition-colors duration-200 hover:text-ink disabled:cursor-not-allowed disabled:text-ink-disabled'

/** Canvas toolbar (draft 4): words, an underline for the active tool, one solid primary action. */
export function ToolRail({ ready = true, activeTool, onSelect, onOpenLayers, canUndo, canRedo, onUndo, onRedo }: ToolRailProps) {
  return (
    <nav aria-label="Studio tools" className="absolute left-5 top-3.5 z-10 flex items-center gap-5 rounded-chip bg-surface/85 px-2 py-0.5">
      <button
        type="button"
        aria-pressed={activeTool === 'select'}
        disabled={!ready}
        onClick={() => onSelect('select')}
        className={cn(word, 'border-b border-transparent aria-pressed:border-ink aria-pressed:text-ink')}
      >
        Select
      </button>
      <button
        type="button"
        aria-pressed={activeTool === 'draw'}
        disabled={!ready}
        onClick={() => onSelect('draw')}
        className="min-h-9 rounded-control bg-ink px-3.5 text-body-sm text-surface transition-opacity duration-200 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-35 aria-pressed:bg-accent max-sm:hidden"
      >
        Draw building
      </button>
      {/* Editing is read-only below 640 px, so history controls are hidden there too. */}
      <button type="button" disabled={!canUndo} onClick={onUndo} className={cn(word, 'max-sm:hidden')}>Undo</button>
      <button type="button" disabled={!canRedo} onClick={onRedo} className={cn(word, 'max-sm:hidden')}>Redo</button>
      <span aria-hidden="true" className="h-4 w-px bg-line" />
      <button type="button" onClick={onOpenLayers} className={word}>Layers</button>
    </nav>
  )
}
