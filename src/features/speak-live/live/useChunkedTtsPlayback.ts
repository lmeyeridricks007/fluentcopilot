'use client'

import { useCallback, useEffect, useRef } from 'react'
import { conversationClient } from '@/lib/api/conversationClient'
import { createHtmlAudio, unlockHtmlAudioPlayback } from '@/lib/audio/htmlAudioPlayback'
import { stripMarkdownForTts } from '@/lib/speech/stripMarkdownForTts'

const SENTENCE_END_RE = /[.?!;]\s*/
/**
 * Smallest text fragment worth sending to TTS. Lowered from 12 to 6 so very
 * short opening clauses like "Ja." or "Prima!" produce a playable chunk fast.
 */
const MIN_CLAUSE_CHARS = 6

function extractCompletedClauses(text: string): { completed: string; remaining: string } {
  const lastIdx = Math.max(
    text.lastIndexOf('.'),
    text.lastIndexOf('?'),
    text.lastIndexOf('!'),
    text.lastIndexOf(';'),
  )
  if (lastIdx < 0 || lastIdx < MIN_CLAUSE_CHARS) {
    return { completed: '', remaining: text }
  }
  return {
    completed: text.slice(0, lastIdx + 1).trim(),
    remaining: text.slice(lastIdx + 1).trim(),
  }
}

function splitClauses(text: string): string[] {
  return text
    .split(SENTENCE_END_RE)
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_CLAUSE_CHARS)
}

type ChunkEntry = {
  index: number
  text: string
  audioUrl?: string
  loading: boolean
  error?: string
}

/**
 * Hook for overlapping TTS generation with LLM streaming.
 *
 * As delta tokens accumulate, the hook detects completed clauses and fires
 * TTS requests for each. Audio chunks are queued and played sequentially.
 *
 * **Autoplay mode** (default): playback begins as soon as the first TTS chunk
 * resolves — no need to wait for the full LLM stream to finish. This shaves
 * seconds off perceived latency in live voice mode.
 */
export function useChunkedTtsPlayback(opts?: {
  threadId?: string
  /** Autoplay first chunk as soon as TTS resolves (default true). */
  autoplay?: boolean
  /** When set, plays each clip through the host's persistent `<audio>` (required for iOS). */
  playClip?: (url: string) => Promise<void>
  onFirstChunkReady?: () => void
  onPlaybackStart?: () => void
  onPlaybackEnd?: () => void
  onChunkPlay?: (chunkIndex: number) => void
}) {
  const autoplay = opts?.autoplay !== false
  /**
   * Latest-callbacks ref. The hook's useCallbacks must stay identity-stable so consumers
   * (e.g. effects that depend on `feedDelta`) don't tear down per parent render. We read the
   * latest callbacks via ref at invocation time to avoid stale-closure bugs without listing
   * each callback in dep arrays.
   */
  const optsRef = useRef(opts)
  useEffect(() => {
    optsRef.current = opts
  })
  const threadId = opts?.threadId
  const accumulatedRef = useRef('')
  const processedUpToRef = useRef(0)
  const chunksRef = useRef<ChunkEntry[]>([])
  const nextChunkIndexRef = useRef(0)
  const playbackIndexRef = useRef(0)
  const isPlayingRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const firstChunkReadyFired = useRef(false)
  const playbackStartFired = useRef(false)
  const abortedRef = useRef(false)
  /** True once the caller signalled it's OK to play (mute guard, user gesture, etc.). */
  const playbackEnabledRef = useRef(autoplay)
  const mutedRef = useRef(false)
  const flushedRef = useRef(false)
  /** Prevents double `onPlaybackEnd` when completion is detected from multiple paths (e.g. last clip ends before `flush()` runs). */
  const playbackEndNotifiedRef = useRef(false)
  const flushWatchdogRef = useRef<number | null>(null)

  const clearFlushWatchdog = () => {
    if (flushWatchdogRef.current != null) {
      window.clearTimeout(flushWatchdogRef.current)
      flushWatchdogRef.current = null
    }
  }

  const maybeNotifyPlaybackEnd = useCallback(() => {
    if (abortedRef.current || playbackEndNotifiedRef.current) return
    if (!flushedRef.current) return
    if (!chunksRef.current.length) return
    if (chunksRef.current.some((c) => c.loading)) return
    if (playbackIndexRef.current < chunksRef.current.length) return
    playbackEndNotifiedRef.current = true
    clearFlushWatchdog()
    optsRef.current?.onPlaybackEnd?.()
  }, [])

  const tryPlayNext = useCallback(() => {
    if (abortedRef.current) return
    if (mutedRef.current) return
    if (!playbackEnabledRef.current) return
    if (isPlayingRef.current) return
    const idx = playbackIndexRef.current
    if (idx >= chunksRef.current.length) {
      maybeNotifyPlaybackEnd()
      return
    }
    const chunk = chunksRef.current[idx]
    if (!chunk || chunk.loading) return
    if (!chunk.audioUrl) {
      playbackIndexRef.current++
      tryPlayNext()
      return
    }

    isPlayingRef.current = true
    if (!playbackStartFired.current) {
      playbackStartFired.current = true
      optsRef.current?.onPlaybackStart?.()
    }
    optsRef.current?.onChunkPlay?.(idx)

    const advanceAfterClip = () => {
      isPlayingRef.current = false
      playbackIndexRef.current++
      maybeNotifyPlaybackEnd()
      tryPlayNext()
    }

    const playClip = optsRef.current?.playClip
    if (playClip && chunk.audioUrl) {
      void playClip(chunk.audioUrl)
        .then(advanceAfterClip)
        .catch(advanceAfterClip)
      return
    }

    const audio = createHtmlAudio(chunk.audioUrl)
    audio.preload = 'auto'
    audioRef.current = audio
    audio.onended = advanceAfterClip
    audio.onerror = advanceAfterClip
    void unlockHtmlAudioPlayback().finally(() => {
      audio.play().catch(advanceAfterClip)
    })
  }, [maybeNotifyPlaybackEnd])

  const requestTtsForClause = useCallback(
    (text: string) => {
      const clean = stripMarkdownForTts(text)
      if (!clean.trim()) return
      const idx = nextChunkIndexRef.current++
      const entry: ChunkEntry = { index: idx, text: clean, loading: true }
      chunksRef.current.push(entry)

      conversationClient
        .speakLiveTtsChunk({
          text,
          threadId,
          chunkIndex: idx,
        })
        .then((result) => {
          if (abortedRef.current) return
          entry.audioUrl = result.audioUrl
          entry.loading = false
          if (!firstChunkReadyFired.current) {
            firstChunkReadyFired.current = true
            optsRef.current?.onFirstChunkReady?.()
          }
          tryPlayNext()
        })
        .catch((err) => {
          entry.loading = false
          entry.error = err instanceof Error ? err.message : 'TTS chunk failed'
          tryPlayNext()
        })
    },
    [threadId, tryPlayNext],
  )

  const processAccumulated = useCallback(() => {
    const full = accumulatedRef.current
    const unprocessed = full.slice(processedUpToRef.current)
    const { completed, remaining } = extractCompletedClauses(unprocessed)
    if (!completed) return

    const clauses = splitClauses(completed)
    for (const clause of clauses) {
      requestTtsForClause(clause)
    }
    processedUpToRef.current = full.length - remaining.length
  }, [requestTtsForClause])

  const feedDelta = useCallback(
    (deltaText: string) => {
      accumulatedRef.current += deltaText
      processAccumulated()
    },
    [processAccumulated],
  )

  const flush = useCallback(() => {
    flushedRef.current = true
    const remaining = accumulatedRef.current.slice(processedUpToRef.current).trim()
    if (remaining.length >= MIN_CLAUSE_CHARS) {
      requestTtsForClause(remaining)
    }
    processedUpToRef.current = accumulatedRef.current.length
    /** Stream is finished — if the last clip already ended before `flush()`, re-check completion. */
    maybeNotifyPlaybackEnd()
    tryPlayNext()

    clearFlushWatchdog()
    flushWatchdogRef.current = window.setTimeout(() => {
      flushWatchdogRef.current = null
      if (abortedRef.current || playbackEndNotifiedRef.current) return
      if (!flushedRef.current) return
      let changed = false
      for (const c of chunksRef.current) {
        if (c.loading) {
          c.loading = false
          c.error = c.error ?? 'timed out'
          changed = true
        }
      }
      void changed
      tryPlayNext()
      maybeNotifyPlaybackEnd()
    }, 28_000)
  }, [requestTtsForClause, maybeNotifyPlaybackEnd, tryPlayNext])

  const startPlayback = useCallback(() => {
    playbackEnabledRef.current = true
    void unlockHtmlAudioPlayback().finally(() => tryPlayNext())
  }, [tryPlayNext])

  const setMuted = useCallback(
    (m: boolean) => {
      mutedRef.current = m
      if (m) {
        const a = audioRef.current
        if (a) {
          a.pause()
          a.onended = null
          a.onerror = null
          audioRef.current = null
        }
        isPlayingRef.current = false
      } else {
        tryPlayNext()
      }
    },
    [tryPlayNext],
  )

  const reset = useCallback(() => {
    clearFlushWatchdog()
    abortedRef.current = false
    flushedRef.current = false
    accumulatedRef.current = ''
    processedUpToRef.current = 0
    chunksRef.current = []
    nextChunkIndexRef.current = 0
    playbackIndexRef.current = 0
    isPlayingRef.current = false
    firstChunkReadyFired.current = false
    playbackStartFired.current = false
    playbackEndNotifiedRef.current = false
    playbackEnabledRef.current = autoplay
    mutedRef.current = false
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current = null
    }
  }, [autoplay])

  const abort = useCallback(() => {
    abortedRef.current = true
    clearFlushWatchdog()
    playbackEndNotifiedRef.current = false
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current = null
    }
    isPlayingRef.current = false
  }, [])

  return {
    feedDelta,
    flush,
    startPlayback,
    setMuted,
    reset,
    abort,
    getChunkCount: () => chunksRef.current.length,
    isPlaying: () => isPlayingRef.current,
  }
}
