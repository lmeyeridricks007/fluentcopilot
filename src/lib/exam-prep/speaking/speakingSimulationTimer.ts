'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Per-question response window (product assumption — not official DUO timing).
 * Calm, exam-like: enough for 2–4 short Dutch sentences under pressure.
 */
export const SPEAKING_SIMULATION_RESPONSE_SECONDS = 90

/**
 * Countdown for the active question. Calls `onExpire` once when time reaches zero.
 * Resets when `active` becomes true (new question).
 */
export function useSpeakingSimulationQuestionTimer(input: {
  active: boolean
  durationSec?: number
  onExpire: () => void
}): number {
  const durationSec = input.durationSec ?? SPEAKING_SIMULATION_RESPONSE_SECONDS
  const onExpireRef = useRef(input.onExpire)
  const [remaining, setRemaining] = useState(durationSec)
  const firedRef = useRef(false)

  useEffect(() => {
    onExpireRef.current = input.onExpire
  }, [input.onExpire])

  useEffect(() => {
    if (!input.active) {
      firedRef.current = false
      setRemaining(durationSec)
      return
    }

    firedRef.current = false
    const deadline = Date.now() + durationSec * 1000
    setRemaining(durationSec)

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
  }, [input.active, durationSec])

  return remaining
}

/**
 * Countdown to an absolute wall-clock deadline (ms). Use min(questionEnd, sessionEnd) for exam realism.
 */
export function useSpeakingAnswerDeadlineTimer(input: {
  active: boolean
  deadlineMs: number
  onExpire: () => void
}): number {
  const onExpireRef = useRef(input.onExpire)
  const [remaining, setRemaining] = useState(0)
  const firedRef = useRef(false)

  useEffect(() => {
    onExpireRef.current = input.onExpire
  }, [input.onExpire])

  useEffect(() => {
    if (!input.active || input.deadlineMs <= 0) {
      firedRef.current = false
      setRemaining(0)
      return
    }

    firedRef.current = false
    const tick = () => {
      const next = Math.max(0, Math.ceil((input.deadlineMs - Date.now()) / 1000))
      setRemaining(next)
      if (next <= 0 && !firedRef.current) {
        firedRef.current = true
        onExpireRef.current()
      }
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [input.active, input.deadlineMs])

  return remaining
}
