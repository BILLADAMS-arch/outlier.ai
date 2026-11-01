import { useEffect, useState } from 'react'

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Animates a number from 0 to `value`. Shows the final value immediately when motion is reduced. */
export default function CountUp({ value, format = (n) => String(n), duration = 1000 }) {
  const [shown, setShown] = useState(0)
  const reduce = prefersReducedMotion()
  useEffect(() => {
    if (reduce) return undefined
    let raf, start
    const step = (t) => {
      start ??= t
      const p = Math.min(1, (t - start) / duration)
      setShown(value * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, reduce])
  return <>{format(reduce ? value : shown)}</>
}
