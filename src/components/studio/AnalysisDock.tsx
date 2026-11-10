import { Fragment, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from '../ui/Icon'
import type { DockStat } from './dockValues'

export type DockCardId = 'draw' | 'sun' | 'wind' | 'noise'

export type DockCard = {
  readonly id: DockCardId
  readonly label: string
  readonly icon: IconName
  readonly stat: DockStat
  /** Claim that stays visible with this analysis (PRD R8). */
  readonly note: string
  /** The one or two controls used most for this analysis; the rest live in Parameters. */
  readonly quick?: ReactNode
}

const secondaryText = (stat: DockStat) => stat.value === null ? stat.hint ?? '' : stat.secondary.map(([value, unit]) => value + unit).join('')

/** Analysis summaries and the active analysis’s quick controls. */
export function AnalysisDock({ cards, active, onActivate }: {
  cards: readonly DockCard[]
  active: DockCardId
  onActivate: (id: DockCardId) => void
}) {
  const current = cards.find((card) => card.id === active) ?? cards[0]
  return (
    <section aria-label="Analysis" className="tf-rise flex min-w-0 flex-col gap-2.5 rounded-panel border border-card-line bg-card px-3 pb-3 pt-2.5 shadow-card [animation-delay:120ms]">
      <div className="flex items-center justify-between gap-4 px-1">
        <p className="truncate text-caption text-ink-secondary">Indicative screening — not planning advice</p>
      </div>

      <div className="flex min-w-0 flex-col gap-3 xl:flex-row">
        <div role="group" aria-label="Analysis cards" className="flex shrink-0 gap-2 overflow-x-auto p-0.5">
          {cards.map((card) => {
            const on = card.id === active
            return (
              <button
                key={card.id}
                type="button"
                aria-pressed={on}
                onClick={() => onActivate(card.id)}
                className={cn(
                  'flex w-[172px] shrink-0 flex-col rounded-[12px] bg-canvas px-3.5 text-left transition-[box-shadow,background-color] duration-200 hover:bg-[color-mix(in_srgb,var(--canvas)_70%,var(--card-line))]',
                  'gap-3 py-3',
                  on && 'bg-card shadow-[0_0_0_1.5px_var(--accent)] hover:bg-card',
                )}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className={cn('text-eyebrow', on ? 'text-accent' : 'text-ink-secondary')}>{card.label}</span>
                  <Icon name={card.icon} size={14} className={on ? 'text-accent' : 'text-ink-secondary'} />
                </span>
                <span className="block min-w-0">
                  <span className="block truncate text-stat text-ink">
                    {card.stat.value ?? '—'}
                    {card.stat.value !== null && <span className="text-ink-unit">{card.stat.unit}</span>}
                  </span>
                    <span className="mt-1 block truncate text-caption text-ink-secondary" title={secondaryText(card.stat)}>
                      {card.stat.value === null
                        ? card.stat.hint
                        : card.stat.secondary.map(([value, unit], index) => (
                          <Fragment key={index}><span className="text-ink">{value}</span>{unit}</Fragment>
                        ))}
                    </span>
                </span>
              </button>
            )
          })}
        </div>

        {current && (
          <div role="region" aria-label={`${current.label} quick controls`} className="@container flex min-w-0 flex-1 flex-col justify-center gap-1.5 rounded-[12px] border border-card-line px-4 py-3">
            {current.quick ?? <p className="text-body-sm text-ink-secondary">{current.note}</p>}
            {current.quick && <p className="text-caption text-ink-secondary">{current.note}</p>}
          </div>
        )}
      </div>
    </section>
  )
}
