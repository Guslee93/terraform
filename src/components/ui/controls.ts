/** Shared control styling (design contract §5). Panels compose these; they do not restyle controls. */

export const labelClass = 'text-label text-ink-secondary'

/** §5.1 text button: a word with an underline. */
export const textButtonClass =
  'inline-flex min-h-9 items-center gap-2 border-b-[1.5px] border-ink py-1.5 text-body text-ink transition-colors duration-200 hover:border-accent disabled:cursor-not-allowed disabled:border-ink-disabled disabled:text-ink-disabled'

/** Compact text button for dense rows (drawer actions). Same pattern, small type. */
export const textButtonSmClass =
  'inline-flex min-h-9 items-center gap-1.5 border-b-[1.5px] border-ink py-1 text-body-sm text-ink transition-colors duration-200 hover:border-accent disabled:cursor-not-allowed disabled:border-ink-disabled disabled:text-ink-disabled'

/** §5.6 segmented text control item; pair with aria-pressed. */
export const segmentClass =
  'inline-flex min-h-9 items-center border-b-[1.5px] border-transparent text-label text-ink-secondary transition-colors duration-200 hover:text-ink aria-pressed:border-ink aria-pressed:text-ink'

/** §5.9 numeric/text input and select. */
export const inputClass =
  'h-10 w-full rounded-control border border-line bg-surface-paper px-2.5 font-mono text-body tabular-nums text-ink transition-colors focus:border-accent disabled:cursor-not-allowed disabled:text-ink-disabled aria-[invalid=true]:border-danger'

/** Checkbox tint. */
export const checkboxClass = 'size-4 accent-[var(--ink-primary)]'
