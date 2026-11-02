import { cn } from '../../lib/cn'

export type MassListItem = {
  id: string
  name: string
  /** Geometry-derived summary, e.g. "3 storeys · 9.6 m". */
  detail: string
  hidden: boolean
  warning: boolean
}

type MassListProps = {
  items: readonly MassListItem[]
  selectedId: string | null
  onSelect: (volumeId: string) => void
}

/** Every mass in the scenario, so hidden or hard-to-reach masses can still be selected. */
export function MassList({ items, selectedId, onSelect }: MassListProps) {
  if (items.length === 0) return null

  return (
    <ul aria-label="Masses" className="space-y-0.5">
      {items.map((item) => {
        const selected = item.id === selectedId
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-current={selected ? true : undefined}
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-control border border-transparent px-2 py-1.5 text-left transition-colors hover:bg-muted-fill',
                selected && 'border-line bg-accent-soft hover:bg-accent-soft',
              )}
            >
              <span className="min-w-0">
                <span className={cn('block truncate text-body-sm font-medium', item.hidden ? 'text-ink-secondary' : 'text-ink')}>
                  {item.name}
                </span>
                <span className="block text-body-sm tabular-nums text-ink-secondary">{item.detail}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-label">
                {item.warning && <span className="text-warning-ink">Needs attention</span>}
                {item.hidden && <span className="text-ink-secondary">Hidden</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
