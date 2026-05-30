'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Per-task countdown. Resets when `active` becomes true (new task).
 * `onExpire` must be stable or use refs at call site.
 */
export function useWritingSimulationTaskTimer(input: {
  active: boolean
  durationSec: number
  onExpire: () => void
}): number {
  const onExpireRef = useRef(input.onExpire)
  const [remaining, setRemaining] = useState(input.durationSec)
  const firedRef = useRef(false)

  useEffect(() => {
    onExpireRef.current = input.onExpire
  }, [input.onExpire])

  useEffect(() => {
    if (!input.active) {
      firedRef.current = false
      setRemaining(input.durationSec)
      return
    }

    firedRef.current = false
    const deadline = Date.now() + input.durationSec * 1000
    setRemaining(input.durationSec)

    const id = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemaining(next)
      if (next <= 0 && !firedRef.current) {
        firedRef.current = true
        window.clearInterval(id)
        onExpireRef.current()
      }
    }, 250)

    return () => window.clearInterval(id)
  }, [input.active, input.durationSec])

  return remaining
}

export function formatCountdownMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
