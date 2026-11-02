import { cn } from '../../lib/cn'

/** A figure with its unit set small after it (§3.2 number formatting). */
export function Figure({ value, unit, className }: { value: string; unit?: string; className?: string }) {
  return (
    <span className={cn('whitespace-nowrap', className)}>
      {value}
      {unit && <sup className="ml-[3px] align-super text-unit">{unit}</sup>}
    </span>
  )
}
