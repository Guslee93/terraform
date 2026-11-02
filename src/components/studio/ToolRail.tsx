import type { IconName } from '../ui/Icon'
import { Icon } from '../ui/Icon'
import { cn } from '../../lib/cn'

export type ToolId = 'select' | 'draw' | 'layers'

type ToolRailProps = {
  activeTool: ToolId
  onSelect: (tool: ToolId) => void
  onOpenLayers: () => void
  layersOpen: boolean
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

/** §5.4 rail icon button: 44 px hit area, line icon, active bar on the rail hairline. */
function RailButton({ label, icon, pressed, disabled, onClick, className }: {
  label: string
  icon: IconName
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative grid size-11 place-items-center text-ink-secondary transition-colors duration-200 hover:text-ink disabled:cursor-not-allowed disabled:text-ink-disabled',
        pressed && 'text-ink',
        className,
      )}
    >
      {pressed && <span aria-hidden="true" className="absolute -left-px top-1/2 h-5 w-[1.5px] -translate-y-1/2 bg-ink" />}
      <Icon name={icon} size={16} />
    </button>
  )
}

/** Vertical tool rail inside the viewport card (spec §7.3): select, draw, layers, undo, redo. */
export function ToolRail({ activeTool, onSelect, onOpenLayers, layersOpen, canUndo, canRedo, onUndo, onRedo }: ToolRailProps) {
  return (
    <nav
      aria-label="Studio tools"
      className="absolute left-[22px] top-16 z-10 flex flex-col border-l border-line"
    >
      <RailButton label="Select" icon="cursor" pressed={activeTool === 'select'} onClick={() => onSelect('select')} />
      <RailButton label="Draw footprint" icon="draw" pressed={activeTool === 'draw'} onClick={() => onSelect('draw')} className="max-sm:hidden" />
      <RailButton label="Site notes" icon="layers" pressed={layersOpen} onClick={onOpenLayers} />
      {/* Editing is read-only below 640 px, so history controls are hidden there too. */}
      <RailButton label="Undo" icon="undo" disabled={!canUndo} onClick={onUndo} className="max-sm:hidden" />
      <RailButton label="Redo" icon="redo" disabled={!canRedo} onClick={onRedo} className="max-sm:hidden" />
    </nav>
  )
}
