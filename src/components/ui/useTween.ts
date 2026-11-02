import { useEffect, useRef, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Eases a displayed number to `target` over `duration` ms (contract §7: numbers tween on data
 * change). The first value is shown as is; reduced motion jumps straight to the target.
 */
export function useTween(target: number, duration = 400): number {
  const [value, setValue] = useState(target)
  const from = useRef(target)

  useEffect(() => {
    const start = from.current
    if (start === target || prefersReducedMotion()) {
      from.current = target
      setValue(target)
      return
    }
    const began = performance.now()
    let frame = 0
    const step = (now: number) => {
      const t = Math.min((now - began) / duration, 1)
      const eased = 1 - (1 - t) ** 3
      const next = start + (target - start) * eased
      from.current = next
      setValue(next)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}
