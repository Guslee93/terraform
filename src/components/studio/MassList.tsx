import { cn } from '../../lib/cn'

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

/**
 * Every mass in the scenario, so hidden or hard-to-reach masses can still be selected. The
 * selected mass is the one solid accent block in the panel (draft 4).
 */
export function MassList({ items, selectedId, onSelect }: MassListProps) {
  if (items.length === 0) return null

  return (
    <ul aria-label="Masses" className="space-y-1">
      {items.map((item) => {
        const selected = item.id === selectedId
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-current={selected ? true : undefined}
              onClick={() => onSelect(item.id)}
              className={cn(
                'grid w-full grid-cols-[8px_1fr_auto] items-center gap-3 text-left transition-colors duration-200',
                selected
                  ? 'rounded-control bg-accent px-4 py-3 text-ink-on-inverse'
                  : 'border-b border-line py-2.5 hover:bg-surface-hover',
              )}
            >
              <span
                aria-hidden="true"
                className={cn('size-1.5 rounded-pill', item.warning ? (selected ? 'bg-sun-low' : 'bg-warning') : 'bg-positive')}
              />
              <span className="min-w-0">
                <span className={cn('block truncate', selected ? 'text-body' : 'text-body-sm', item.hidden && !selected && 'text-ink-secondary')}>
                  {item.name}
                </span>
                <span className={cn('block text-caption tabular-nums', selected ? 'text-ink-on-inverse/75' : 'text-ink-secondary')}>
                  <span>{item.detail}</span>
                  {item.warning && <> · <span className={selected ? '' : 'text-warning-ink'}>Needs attention</span></>}
                  {item.hidden && <> · <span>Hidden</span></>}
                </span>
              </span>
              {item.gfa && <span className="font-mono text-caption tabular-nums">{item.gfa}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
