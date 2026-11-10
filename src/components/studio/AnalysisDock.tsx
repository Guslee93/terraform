import { Fragment, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from '../ui/Icon'
import type { DockStat } from './dockValues'

export type DockCardId = 'draw' | 'sun' | 'wind' | 'noise' | 'area'
export type DockSize = 'S' | 'M' | 'L'

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

const SIZES: readonly DockSize[] = ['S', 'M', 'L']
const SIZE_NAME: Record<DockSize, string> = { S: 'Small', M: 'Medium', L: 'Large' }

const secondaryText = (stat: DockStat) => stat.value === null ? stat.hint ?? '' : stat.secondary.map(([value, unit]) => value + unit).join('')

/**
 * Bottom dock (ADR-0016 rev 2): compact summary cards and the active analysis's quick controls.
 * S = figures only; M = figures, one secondary line and quick controls; L = M plus each card's note.
 */
export function AnalysisDock({ cards, active, onActivate, size, onSizeChange }: {
  cards: readonly DockCard[]
  active: DockCardId
  onActivate: (id: DockCardId) => void
  size: DockSize
  onSizeChange: (size: DockSize) => void
}) {
  const current = cards.find((card) => card.id === active) ?? cards[0]
  const compact = size === 'S'
  return (
    <section aria-label="Analysis" className="tf-rise flex min-w-0 flex-col gap-2.5 rounded-panel border border-card-line bg-card px-3 pb-3 pt-2.5 shadow-card [animation-delay:120ms]">
      <div className="flex items-center justify-between gap-4 px-1">
        <div role="group" aria-label="Dock size" className="flex items-center gap-1 text-caption text-ink-secondary">
          <span className="mr-1">View</span>
          {SIZES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={size === option}
              aria-label={SIZE_NAME[option]}
              title={SIZE_NAME[option]}
              onClick={() => onSizeChange(option)}
              className="grid size-6 place-items-center rounded-[6px] transition-colors duration-200 hover:text-ink aria-pressed:bg-canvas aria-pressed:font-medium aria-pressed:text-ink"
            >
              {option}
            </button>
          ))}
        </div>
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
                  compact ? 'gap-1.5 py-2.5' : 'gap-3 py-3',
                  on && 'bg-card shadow-[0_0_0_1.5px_var(--accent)] hover:bg-card',
                )}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className={cn('text-eyebrow', on ? 'text-accent' : 'text-ink-secondary')}>{card.label}</span>
                  <Icon name={card.icon} size={14} className={on ? 'text-accent' : 'text-ink-secondary'} />
                </span>
                <span className="block min-w-0">
                  <span className={cn('block truncate text-ink', compact ? 'text-stat-s' : 'text-stat')}>
                    {card.stat.value ?? '—'}
                    {card.stat.value !== null && <span className="text-ink-unit">{card.stat.unit}</span>}
                  </span>
                  {!compact && (
                    <span className="mt-1 block truncate text-caption text-ink-secondary" title={secondaryText(card.stat)}>
                      {card.stat.value === null
                        ? card.stat.hint
                        : card.stat.secondary.map(([value, unit], index) => (
                          <Fragment key={index}><span className="text-ink">{value}</span>{unit}</Fragment>
                        ))}
                    </span>
                  )}
                  {size === 'L' && <span className="mt-2 block text-caption leading-snug text-ink-secondary">{card.note}</span>}
                </span>
              </button>
            )
          })}
        </div>

        {!compact && current && (
          <div role="region" aria-label={`${current.label} quick controls`} className="@container flex min-w-0 flex-1 flex-col justify-center gap-1.5 rounded-[12px] border border-card-line px-4 py-3">
            {current.quick ?? <p className="text-body-sm text-ink-secondary">{current.note}</p>}
            {current.quick && <p className="text-caption text-ink-secondary">{current.note}</p>}
          </div>
        )}
      </div>
    </section>
  )
}
