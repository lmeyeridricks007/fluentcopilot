'use client'

import { useEffect, useRef, useState } from 'react'
import { prefersReducedInteraction } from '@/lib/interaction/prefersReducedInteraction'

/**
 * Eases the displayed integer from the previous value toward `target`.
 * Jumps instantly when reduced motion.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const nRef = useRef(0)
  const [n, setN] = useState(0)

  useEffect(() => {
    const to = Math.max(0, Math.round(target))
    if (prefersReducedInteraction()) {
      nRef.current = to
      setN(to)
      return
    }
    const from = nRef.current
    if (from === to) return
    let startTime: number | null = null
    let raf: number
    const tick = (t: number) => {
      if (startTime == null) startTime = t
      const p = Math.min(1, (t - startTime) / durationMs)
      const eased = 1 - (1 - p) ** 2
      const next = Math.round(from + (to - from) * eased)
      nRef.current = next
      setN(next)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return n
}
