'use client'

import { useCallback, useRef, type MutableRefObject, type RefObject } from 'react'

export type TurnAutoCommitConfig = {
  /** Commit after this much silence post-speechEnd (ms). Azure's own segmentation silence (~320ms) fires first, so this is *additional* wait. */
  silenceMs: number
  /** Don't commit if total speech duration was less than this (ms). */
  minUtteranceMs: number
  /** If partial text unchanged for this long, commit (ms). */
  partialStabilityMs: number
  /** Hard cap: commit this many ms after speechEnd detected. */
  maxFinalizeWaitMs: number
}

function envInt(key: string, min: number, max: number, fallback: number): number {
  const raw = typeof process !== 'undefined' ? process.env[key] : undefined
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  if (Number.isFinite(n) && n >= min && n <= max) return n
  return fallback
}

/**
 * Default auto-commit tuning.
 *
 * Azure Speech SDK fires `speechEndDetected` after its own segmentation silence (~320ms).
 * So `silenceMs` here stacks on top of that. Lower values = faster commit.
 *
 * Env overrides (dev tuning):
 * - `NEXT_PUBLIC_AUTOCOMMIT_SILENCE_MS` (100–2000)
 * - `NEXT_PUBLIC_AUTOCOMMIT_MIN_UTTERANCE_MS` (100–2000)
 * - `NEXT_PUBLIC_AUTOCOMMIT_STABILITY_MS` (80–2000)
 * - `NEXT_PUBLIC_AUTOCOMMIT_MAX_WAIT_MS` (200–3000)
 */
export const DEFAULT_AUTO_COMMIT_CONFIG: TurnAutoCommitConfig = {
  silenceMs: envInt('NEXT_PUBLIC_AUTOCOMMIT_SILENCE_MS', 100, 2000, 350),
  minUtteranceMs: envInt('NEXT_PUBLIC_AUTOCOMMIT_MIN_UTTERANCE_MS', 100, 2000, 300),
  partialStabilityMs: envInt('NEXT_PUBLIC_AUTOCOMMIT_STABILITY_MS', 80, 2000, 280),
  maxFinalizeWaitMs: envInt('NEXT_PUBLIC_AUTOCOMMIT_MAX_WAIT_MS', 200, 3000, 900),
}

/**
 * Hook for automatic turn commit based on silence detection and partial transcript stability.
 *
 * Wired between the STT recognizer (which fires onSpeechEnd, onRecognizing events) and
 * the LiveConversationScreen's commitListening callback.
 *
 * Manual tap-to-send remains as override — the auto-commit only fires if the user hasn't
 * already committed.
 *
 * @param blockAutoCommitWhilePressedRef When `.current` is true (e.g. hold-to-speak pointer
 *   still down), silence/stability timers must not finalize — short pauses between sentences
 *   otherwise match “utterance complete” heuristics.
 */
export function useTurnAutoCommit(
  config: TurnAutoCommitConfig = DEFAULT_AUTO_COMMIT_CONFIG,
  blockAutoCommitWhilePressedRef?: RefObject<boolean> | MutableRefObject<boolean>,
) {
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stabilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPartialTextRef = useRef('')
  const speechStartTimeRef = useRef<number | null>(null)
  const committedRef = useRef(false)
  const commitCallbackRef = useRef<(() => void) | null>(null)

  const clearAllTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current)
      stabilityTimerRef.current = null
    }
    if (maxWaitTimerRef.current) {
      clearTimeout(maxWaitTimerRef.current)
      maxWaitTimerRef.current = null
    }
  }, [])

  const tryCommit = useCallback(() => {
    if (committedRef.current) return
    const start = speechStartTimeRef.current
    if (start != null && performance.now() - start < config.minUtteranceMs) return
    if (blockAutoCommitWhilePressedRef?.current) return
    committedRef.current = true
    clearAllTimers()
    commitCallbackRef.current?.()
  }, [blockAutoCommitWhilePressedRef, config.minUtteranceMs, clearAllTimers])

  /** Call when user starts speaking (first recognizing event or explicit start). */
  const onSpeechStart = useCallback(() => {
    speechStartTimeRef.current = performance.now()
    committedRef.current = false
    clearAllTimers()
  }, [clearAllTimers])

  /** Call on every recognizing partial update — resets stability timer. */
  const onPartialUpdate = useCallback(
    (text: string) => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }

      if (text === lastPartialTextRef.current) return
      lastPartialTextRef.current = text

      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current)
      }
      stabilityTimerRef.current = setTimeout(() => {
        tryCommit()
      }, config.partialStabilityMs)
    },
    [config.partialStabilityMs, tryCommit],
  )

  /**
   * Call when the SDK fires `speechEndDetected`.
   * Starts the silence timer + max wait timer.
   */
  const onSpeechEnd = useCallback(() => {
    if (committedRef.current) return

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => {
      tryCommit()
    }, config.silenceMs)

    if (!maxWaitTimerRef.current) {
      maxWaitTimerRef.current = setTimeout(() => {
        tryCommit()
      }, config.maxFinalizeWaitMs)
    }
  }, [config.silenceMs, config.maxFinalizeWaitMs, tryCommit])

  /** Register the commit callback (LiveConversationScreen's commitListening). */
  const setCommitCallback = useCallback((cb: () => void) => {
    commitCallbackRef.current = cb
  }, [])

  /** Reset state for a new turn. */
  const reset = useCallback(() => {
    clearAllTimers()
    lastPartialTextRef.current = ''
    speechStartTimeRef.current = null
    committedRef.current = false
  }, [clearAllTimers])

  /** Mark as manually committed so auto-commit doesn't double-fire. */
  const markManualCommit = useCallback(() => {
    committedRef.current = true
    clearAllTimers()
  }, [clearAllTimers])

  return {
    onSpeechStart,
    onPartialUpdate,
    onSpeechEnd,
    setCommitCallback,
    reset,
    markManualCommit,
  }
}
