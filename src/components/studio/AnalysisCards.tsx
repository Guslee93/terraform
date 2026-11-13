import { Fragment, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from '../ui/Icon'
import type { AnalysisStat } from './analysisValues'

/** The three screening analyses. One card each, in the Parameters panel (ADR-0026). */
export type AnalysisId = 'sun' | 'wind' | 'noise'

export type AnalysisCard = {
  readonly id: AnalysisId
  readonly label: string
  readonly icon: IconName
  readonly stat: AnalysisStat
  /** The claim that stays visible with this analysis (PRD R8). */
  readonly note: string
  /** The controls for this analysis; rendered while the card is open. */
  readonly body: ReactNode
}

const secondaryText = (stat: AnalysisStat) => stat.value === null ? stat.hint ?? '' : stat.secondary.map(([value, unit]) => value + unit).join('')

/**
 * One card per analysis in the Parameters panel. The open card is the analysis on the map:
 * opening a card turns its layer on, closing it turns the layer off (ADR-0026).
 */
export function AnalysisCards({ cards, active, onSelect }: {
  cards: readonly AnalysisCard[]
  active: AnalysisId | null
  onSelect: (id: AnalysisId) => void
}) {
  return (
    <div role="group" aria-label="Analysis cards" className="flex flex-col gap-2 px-4 pb-1">
      <p className="text-caption text-ink-secondary">Indicative screening — not planning advice</p>
      {cards.map((card) => {
        const open = card.id === active
        return (
          <section
            key={card.id}
            aria-label={`${card.label} card`}
            className={cn('rounded-card border bg-canvas', open ? 'border-accent' : 'border-card-line')}
          >
            <h3 className="m-0">
              <button
                type="button"
                aria-expanded={open}
                data-testid={`analysis-card-${card.id}`}
                onClick={() => onSelect(card.id)}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--canvas)_70%,var(--card-line))]"
              >
                <span className="flex items-center gap-2 text-eyebrow text-ink-secondary">
                  <Icon name={card.icon} size={14} className={open ? 'text-accent' : 'text-ink-secondary'} />
                  {card.label}
                </span>
                {/* 30 px, so the unit colour beside the figure stays large text (WCAG AA, 3:1). */}
                <span className="text-stat text-ink">
                  {card.stat.value ?? '—'}
                  {card.stat.value !== null && <span className="text-ink-unit">{card.stat.unit}</span>}
                </span>
              </button>
            </h3>
            <p className="px-3.5 text-caption text-ink-secondary" title={secondaryText(card.stat)}>
              {card.stat.value === null
                ? card.stat.hint
                : card.stat.secondary.map(([value, unit], index) => (
                  <Fragment key={index}><span className="text-ink">{value}</span>{unit}</Fragment>
                ))}
            </p>
            {/* The claim sits with the number while the card is closed; the open card states it in its controls. */}
            {!open && <p className="px-3.5 pb-3 pt-1 text-caption text-ink-secondary">{card.note}</p>}
            {open && <div className="border-t border-card-line px-3.5 py-3">{card.body}</div>}
          </section>
        )
      })}
    </div>
  )
}
