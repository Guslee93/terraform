import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from './Icon'

/** A figure with its unit set small after it (§3.2 number formatting). */
export function Figure({ value, unit, className }: { value: string; unit?: string; className?: string }) {
  return (
    <span className={cn('whitespace-nowrap', className)}>
      {value}
      {unit && <sup className="ml-[3px] align-super text-unit">{unit}</sup>}
    </span>
  )
}

/** §5.8 metric cell. Use inside `MetricRow` (a `dl`). */
export function Metric({ label, icon, value, unit, tone = 'ink' }: {
  label: string
  icon?: IconName
  value: string
  unit?: string
  tone?: 'ink' | 'warning'
}) {
  return (
    <div className="min-w-0 border-l border-line pl-4 first:border-l-0 first:pl-0">
      <dt className="flex items-center gap-1.5 text-label text-ink-secondary">
        {icon && <Icon name={icon} size={13} className="shrink-0" />}
        <span className="truncate">{label}</span>
      </dt>
      <dd className={cn('mt-2.5 text-figure', tone === 'warning' ? 'text-warning-ink' : 'text-ink')}>
        <Figure value={value} unit={unit} />
      </dd>
    </div>
  )
}

export function MetricRow({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('grid grid-cols-2 gap-y-4 border-t border-line-strong pt-4 sm:grid-cols-4', className)}>{children}</dl>
}

/** §5.10 status row. `onClick` makes it a button (warning buttons in the Constraints panel). */
export function CheckRow({ status, label, value, onClick, title }: {
  status: 'pass' | 'attention'
  label: ReactNode
  value?: ReactNode
  onClick?: () => void
  title?: string
}) {
  const attention = status === 'attention'
  const body = (
    <>
      <Icon name={attention ? 'warn' : 'ok'} size={16} className={attention ? 'text-warning' : 'text-ink'} />
      <span className={cn('min-w-0 text-body-sm', attention ? 'text-warning-ink' : 'text-ink')}>
        {label}
        <span className="sr-only">{attention ? ' — needs attention' : ' — passes'}</span>
      </span>
      {value !== undefined && (
        <span className={cn('text-mono-sm', attention ? 'text-warning-ink' : 'text-ink')}>{value}</span>
      )}
    </>
  )
  const rowClass = 'grid w-full grid-cols-[18px_1fr_auto] items-start gap-2.5 border-t border-line py-2 text-left'
  return onClick ? (
    <button type="button" title={title} onClick={onClick} className={cn(rowClass, 'min-h-10 rounded-control outline-offset-0 hover:outline hover:outline-1 hover:outline-warning focus-visible:outline-1 focus-visible:outline-warning')}>
      {body}
    </button>
  ) : (
    <div className={rowClass}>{body}</div>
  )
}
