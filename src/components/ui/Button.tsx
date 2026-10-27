import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost'

const base =
  'inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] px-4 text-[13px] font-medium tracking-[0.01em] transition-[background-color,border-color,color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-45'

const variants: Record<Variant, string> = {
  primary:
    'bg-ink text-surface shadow-[0_1px_0_rgb(255_255_255/0.12)_inset] hover:bg-ink-hover',
  secondary:
    'border border-line bg-surface text-ink hover:border-[#c9cec6] hover:bg-[#fbfbf8]',
  ghost: 'text-ink-secondary hover:bg-surface-muted hover:text-ink',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
}

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(base, variants[variant], className)} {...props} />
}

type ButtonLinkProps = {
  to: string
  children: ReactNode
  variant?: Variant
  className?: string
}

export function ButtonLink({ to, children, variant = 'primary', className }: ButtonLinkProps) {
  return (
    <Link to={to} className={cn(base, variants[variant], className)}>
      {children}
    </Link>
  )
}
