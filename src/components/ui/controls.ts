/** Shared control styling (design contract §5). Panels compose these; they do not restyle controls. */

export const labelClass = 'text-caption text-ink-secondary'

/** §5.1 text button: a word with an underline. */
export const textButtonClass =
  'inline-flex min-h-9 items-center gap-2 border-b border-ink/30 py-1.5 text-body text-ink transition-colors duration-200 hover:border-ink disabled:cursor-not-allowed disabled:border-ink-disabled disabled:text-ink-disabled'

/** Compact text button for dense rows (drawer actions). Same pattern, small type. */
export const textButtonSmClass =
  'inline-flex min-h-9 items-center gap-1.5 border-b border-ink/30 py-1 text-body-sm text-ink transition-colors duration-200 hover:border-ink disabled:cursor-not-allowed disabled:border-ink-disabled disabled:text-ink-disabled'

/** §5.9 numeric/text input and select. */
export const inputClass =
  'h-10 w-full rounded-control border border-line bg-surface-paper px-2.5 font-mono text-body tabular-nums text-ink transition-colors focus:border-accent disabled:cursor-not-allowed disabled:text-ink-disabled aria-[invalid=true]:border-danger'

/** Checkbox tint. */
export const checkboxClass = 'size-4 accent-[var(--ink-primary)]'

/** Segmented control (ADR-0016): a grey track, the pressed option a raised white chip. */
export const segmentGroupClass = 'flex gap-0.5 rounded-control bg-canvas p-0.5'
export const segmentClass =
  'min-h-8 flex-1 rounded-[6px] px-2 text-body-sm text-ink-secondary transition-colors duration-200 hover:text-ink aria-pressed:bg-card aria-pressed:text-ink aria-pressed:shadow-card disabled:cursor-not-allowed disabled:text-ink-disabled'

/** Quiet secondary action: a hairline pill; pressed reads as accent, never a black fill. */
export const pillButtonClass =
  'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-pill border border-card-line bg-card px-3 text-body-sm text-ink transition-colors duration-200 hover:border-ink-disabled disabled:cursor-not-allowed disabled:text-ink-disabled aria-pressed:border-accent aria-pressed:text-accent'

/** Range input tint. */
export const rangeClass = 'w-full accent-[var(--accent)] disabled:opacity-50'

/** Eyebrow heading inside panels. */
export const eyebrowClass = 'text-eyebrow text-ink-secondary'
