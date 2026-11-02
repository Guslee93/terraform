import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from './Icon'

/** §5.7 card: surface, 14 px radius, no border, no shadow. */
export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('relative min-w-0 overflow-hidden rounded-card bg-surface', className)} {...props} />
}

/** §3.2 section label `NN / NAME` with an optional right-aligned meta label or action. */
export function CardHeader({
  code,
  title,
  icon,
  iconClassName,
  meta,
  id,
  className,
}: {
  code: string
  title: string
  icon?: IconName
  iconClassName?: string
  meta?: ReactNode
  id?: string
  className?: string
}) {
  return (
    <div className={cn('flex min-h-7 items-center justify-between gap-3', className)}>
      <h2 id={id} className="flex shrink-0 items-center gap-2 text-label text-ink">
        {icon && <Icon name={icon} size={14} className={cn('shrink-0', iconClassName)} />}
        <span>
          {code} / {title}
        </span>
      </h2>
      {meta !== undefined && <div className={cn('min-w-0 text-right text-label text-ink-secondary', typeof meta === 'string' && 'truncate')}>{meta}</div>}
    </div>
  )
}
