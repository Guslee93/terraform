import { cn } from '../../lib/cn'
import { Icon } from '../ui/Icon'

export type MassListItem = {
  id: string
  name: string
  /** Geometry-derived summary, e.g. "3 storeys · 9.6 m". */
  detail: string
  hidden: boolean
  warning: boolean
  /** Concept GFA text for the right column, when metrics are available. */
  gfa?: string
}

type MassListProps = {
  items: readonly MassListItem[]
  selectedId: string | null
  onSelect: (volumeId: string) => void
}

/** Every mass in the scenario, so hidden or hard-to-reach masses can still be selected (spec §7.4 rows). */
export function MassList({ items, selectedId, onSelect }: MassListProps) {
  if (items.length === 0) return null

  return (
    <ul aria-label="Masses" className="divide-y divide-line border-y border-line">
      {items.map((item) => {
        const selected = item.id === selectedId
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-current={selected ? true : undefined}
              onClick={() => onSelect(item.id)}
              className={cn(
                'grid min-h-14 w-full grid-cols-[36px_1fr_auto] items-center gap-3 px-1 py-2 text-left transition-colors duration-200 hover:bg-surface-hover',
                selected && 'bg-surface-hover',
              )}
            >
              <span aria-hidden="true" className="grid size-9 place-items-center rounded-control border border-line text-ink-secondary">
                <Icon name="cube" size={16} />
              </span>
              <span className="min-w-0">
                <span className={cn('flex items-center gap-2 truncate text-body font-medium', item.hidden ? 'text-ink-secondary' : 'text-ink')}>
                  {selected && <span aria-hidden="true" className="size-[7px] shrink-0 bg-accent" />}
                  {item.name}
                </span>
                <span className="block text-body-sm tabular-nums text-ink-secondary">{item.detail}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                {item.gfa && <span className="font-mono text-body-sm tabular-nums text-ink">{item.gfa}</span>}
                {item.warning && <span className="text-label text-warning-ink">Needs attention</span>}
                {item.hidden && <span className="text-label text-ink-secondary">Hidden</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
