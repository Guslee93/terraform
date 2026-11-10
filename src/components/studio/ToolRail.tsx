import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from '../ui/Icon'

export type ToolId = 'select' | 'draw'

type ToolRailProps = {
  /** Drawing needs the site package; Select and Draw are disabled until it is ready. */
  ready?: boolean
  activeTool: ToolId
  onSelect: (tool: ToolId) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  /** Deletes the selected mass; disabled when nothing deletable is selected. */
  canDelete: boolean
  onDelete: () => void
  /** The one primary action (project JSON export). */
  onExport?: () => void
  exportDisabled?: boolean
}

const tool = 'grid size-9 place-items-center rounded-pill text-ink-secondary transition-colors duration-200 hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:text-ink-disabled disabled:hover:bg-transparent aria-pressed:bg-accent-soft aria-pressed:text-accent'

function ToolButton({ icon, label, ...props }: { icon: IconName; label: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <button type="button" aria-label={label} title={label} className={tool} {...props}>
      <Icon name={icon} size={16} />
    </button>
  )
}

/** Floating pill toolbar (ADR-0016): tools, history, one accent primary action. */
export function ToolRail({ ready = true, activeTool, onSelect, canUndo, canRedo, onUndo, onRedo, canDelete, onDelete, onExport, exportDisabled = false }: ToolRailProps) {
  return (
    <nav aria-label="Studio tools" className="flex items-center gap-1 rounded-pill border border-card-line bg-card p-1 shadow-float">
      <ToolButton icon="cursor" label="Select" aria-pressed={activeTool === 'select'} disabled={!ready} onClick={() => onSelect('select')} />
      <button
        type="button"
        data-guide="draw"
        aria-label="Draw building"
        title="Draw building"
        aria-pressed={activeTool === 'draw'}
        disabled={!ready}
        onClick={() => onSelect('draw')}
        className={cn(tool.replace('grid size-9 place-items-center', 'inline-flex h-9 items-center'), 'gap-1.5 px-3 text-body-sm')}
      >
        <Icon name="pen" size={16} />
        Draw
      </button>
      <ToolButton icon="trash" label="Delete selected mass" disabled={!canDelete} onClick={onDelete} />
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-card-line" />
      <ToolButton icon="undo" label="Undo" disabled={!canUndo} onClick={onUndo} />
      <ToolButton icon="redo" label="Redo" disabled={!canRedo} onClick={onRedo} />
      {onExport && <>
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-card-line" />
        <button
          type="button"
          onClick={onExport}
          disabled={exportDisabled}
          title="Download every scenario for this site as JSON"
          className="min-h-9 rounded-pill bg-accent px-4 text-body-sm font-medium text-ink-on-inverse transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Export
        </button>
      </>}
    </nav>
  )
}
