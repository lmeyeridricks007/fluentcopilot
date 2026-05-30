'use client'

import { useEffect, useRef, useState } from 'react'

export type UseExamRunTickersParams = {
  /** When false, no interval (e.g. training reflect). */
  active: boolean
  /** Whole seconds for the current phase; 0 when untimed. */
  phaseDurationSec: number
  /** False = soft prep (no countdown, no expiry callbacks from this hook). */
  phaseTicking: boolean
  /** Monotonic key so entering a new phase resets the deadline. */
  resetKey: string
  sectionWallBudgetSec: number | null
  /** Epoch ms when the current section wall clock started (same section across tasks). */
  sectionAnchorMs: number | null
  /** When false, section wall is not enforced in UI (informational pace only). */
  sectionWallStrict: boolean
}

export type UseExamRunTickersResult = {
  /** null = untimed phase (soft training prep). */
  phaseRemainingSec: number | null
  sectionWallRemainingSec: number | null
  progress01: number
}

/**
 * Deadline-based phase countdown plus optional section wall clock, one shared tick (~4 Hz).
 */
export function useExamRunTickers(params: UseExamRunTickersParams): UseExamRunTickersResult {
  const [phaseRemainingSec, setPhaseRemainingSec] = useState<number | null>(null)
  const [sectionWallRemainingSec, setSectionWallRemainingSec] = useState<number | null>(null)
  const [progress01, setProgress01] = useState(0)
  const phaseDeadlineMsRef = useRef(0)

  useEffect(() => {
    if (!params.active) {
      setPhaseRemainingSec(null)
      setSectionWallRemainingSec(null)
      setProgress01(0)
      return
    }

    if (!params.phaseTicking || params.phaseDurationSec <= 0) {
      setPhaseRemainingSec(null)
      setProgress01(0)
    } else {
      phaseDeadlineMsRef.current = Date.now() + params.phaseDurationSec * 1000
      const left = Math.max(0, Math.ceil((phaseDeadlineMsRef.current - Date.now()) / 1000))
      setPhaseRemainingSec(left)
      setProgress01(1)
    }

    const tick = () => {
      if (params.phaseTicking && params.phaseDurationSec > 0) {
        const left = Math.max(0, Math.ceil((phaseDeadlineMsRef.current - Date.now()) / 1000))
        setPhaseRemainingSec(left)
        const denom = Math.max(1, params.phaseDurationSec)
        setProgress01(Math.max(0, Math.min(1, left / denom)))
      }

      if (
        params.sectionWallStrict &&
        params.sectionWallBudgetSec != null &&
        params.sectionWallBudgetSec > 0 &&
        params.sectionAnchorMs != null
      ) {
        const end = params.sectionAnchorMs + params.sectionWallBudgetSec * 1000
        setSectionWallRemainingSec(Math.max(0, Math.ceil((end - Date.now()) / 1000)))
      } else {
        setSectionWallRemainingSec(null)
      }
    }

    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [
    params.active,
    params.phaseTicking,
    params.phaseDurationSec,
    params.resetKey,
    params.sectionWallBudgetSec,
    params.sectionAnchorMs,
    params.sectionWallStrict,
  ])

  return { phaseRemainingSec, sectionWallRemainingSec, progress01 }
}
